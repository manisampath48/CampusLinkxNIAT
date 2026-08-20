import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, ApprovedStudent } from '../types';
import { storage } from '../services/storage';
import { 
  verifyNiatRegistrationNumber, 
  registerWithNiatAndFirebase, 
  signInStudent, 
  signInWithGoogleWithNiatCheck, 
  sendPasswordResetLink,
  logoutStudent,
  AuthResult,
  NiatVerificationResult
} from '../services/authService';
import { isAuthorizedAdmin } from '../utils/adminAuth';

export type AuthState = 'INITIALIZING' | 'AUTHENTICATED' | 'UNAUTHENTICATED' | 'SUSPENDED';

interface AuthContextType {
  authState: AuthState;
  firebaseUser: FirebaseUser | null;
  studentProfile: UserProfile | null;
  isAdmin: boolean;
  authError: string | null;
  
  // Auth operations
  verifyNiat: (niatId: string) => Promise<NiatVerificationResult>;
  register: (studentRecord: ApprovedStudent, email: string, pass: string) => Promise<AuthResult>;
  signIn: (identifier: string, pass: string) => Promise<AuthResult>;
  signInWithGoogle: (studentToLink?: ApprovedStudent) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>('INITIALIZING');
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(auth.currentUser);
  const [studentProfile, setStudentProfile] = useState<UserProfile | null>(storage.getCurrentUser());
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Helper to load profile from Firestore cleanly
  const loadProfileFromFirestore = async (uid: string, email?: string | null): Promise<UserProfile | null> => {
    try {
      // 1 & 2. Direct doc lookup in parallel: `students/{uid}` and `users/{uid}`
      const [studentSnap, userSnap] = await Promise.all([
        getDoc(doc(db, 'students', uid)).catch(() => null),
        getDoc(doc(db, 'users', uid)).catch(() => null)
      ]);

      if (studentSnap && studentSnap.exists()) {
        const p = studentSnap.data() as UserProfile;
        if (p && p.isVerified) return p;
      }

      if (userSnap && userSnap.exists()) {
        const p = userSnap.data() as UserProfile;
        if (p && p.isVerified) return p;
      }

      // 3. Lookup in niatIdRegistry doc or query by authUid
      try {
        const regSnap = await getDoc(doc(db, 'niatIdRegistry', uid));
        if (regSnap.exists()) {
          const regData = regSnap.data();
          const targetNiatId = (regData.niatId || regData.studentId)?.toUpperCase();
          if (targetNiatId) {
            const niatSnap = await getDoc(doc(db, 'students', targetNiatId));
            if (niatSnap.exists()) {
              const p = niatSnap.data() as UserProfile;
              if (p && p.isVerified) return p;
            }
          }
        }
      } catch (e) {}

      // 4. Queries in students collection
      const studentsCol = collection(db, 'students');

      // Query by firebaseUid or authUid
      const qFb = query(studentsCol, where('firebaseUid', '==', uid));
      const snapFb = await getDocs(qFb);
      if (!snapFb.empty) {
        const p = snapFb.docs[0].data() as UserProfile;
        if (p && p.isVerified) return p;
      }

      const qAuth = query(studentsCol, where('authUid', '==', uid));
      const snapAuth = await getDocs(qAuth);
      if (!snapAuth.empty) {
        const p = snapAuth.docs[0].data() as UserProfile;
        if (p && p.isVerified) return p;
      }

      const qG = query(studentsCol, where('googleUid', '==', uid));
      const snapG = await getDocs(qG);
      if (!snapG.empty) {
        const p = snapG.docs[0].data() as UserProfile;
        if (p && p.isVerified) return p;
      }

      if (email) {
        const cleanEmail = email.toLowerCase().trim();
        const qE = query(studentsCol, where('email', '==', cleanEmail));
        const snapE = await getDocs(qE);
        if (!snapE.empty) {
          const p = snapE.docs[0].data() as UserProfile;
          if (p && p.isVerified) return p;
        }

        const usersCol = collection(db, 'users');
        const qUE = query(usersCol, where('email', '==', cleanEmail));
        const snapUE = await getDocs(qUE);
        if (!snapUE.empty) {
          const p = snapUE.docs[0].data() as UserProfile;
          if (p && p.isVerified) return p;
        }
      }

      // Check cached local profile ONLY if verified and has valid student ID
      const cached = storage.getCurrentUser();
      if (cached && cached.isVerified && cached.studentId !== 'STUDENT' && (cached.uid === uid || cached.firebaseUid === uid || (email && cached.email?.toLowerCase() === email.toLowerCase()))) {
        return cached;
      }

      return null;
    } catch (err) {
      console.error('[AuthContext] Error fetching student profile:', err);
      const cached = storage.getCurrentUser();
      if (cached && cached.isVerified && cached.studentId !== 'STUDENT' && (cached.uid === uid || cached.firebaseUid === uid)) {
        return cached;
      }
      return null;
    }
  };

  // Centralized Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (!user) {
        setStudentProfile(null);
        setIsAdmin(false);
        setAuthState('UNAUTHENTICATED');
        storage.logout();
        return;
      }

      // User exists in Firebase Auth -> Load Profile
      const profile = await loadProfileFromFirestore(user.uid, user.email);

      // CRITICAL SECURITY RULE: Unregistered / Unverified Google or Firebase users MUST NOT be granted access!
      if (!profile || !profile.isVerified) {
        console.warn(`[AuthContext] Firebase Auth user (${user.uid}) has no verified NIAT student record in CampusLink. Denying access.`);
        await auth.signOut().catch(() => {});
        setStudentProfile(null);
        setIsAdmin(false);
        setAuthState('UNAUTHENTICATED');
        setAuthError('CampusLink is available only to verified NIAT students. Please verify your NIAT registration number first.');
        storage.logout();
        return;
      }

      // Check Disabled Account Status
      if (profile.status === 'disabled') {
        console.warn(`[AuthContext] Firebase Auth user (${user.uid}) is disabled by admin. Denying access.`);
        await auth.signOut().catch(() => {});
        setStudentProfile(null);
        setIsAdmin(false);
        setAuthState('UNAUTHENTICATED');
        setAuthError('Your CampusLink account has been disabled. Please contact the administrator.');
        storage.logout();
        return;
      }

      // Check Account Status
      if (profile.status === 'suspended') {
        setStudentProfile(profile);
        setIsAdmin(false);
        setAuthState('SUSPENDED');
        setAuthError('Your CampusLink account is currently suspended.');
        return;
      }

      // Authoritative official name & UID binding
      profile.uid = user.uid;
      profile.firebaseUid = user.uid;

      // Check Admin Privileges
      const adminAuthorized = isAuthorizedAdmin(profile, user);
      setIsAdmin(adminAuthorized);

      setStudentProfile(profile);
      setAuthState('AUTHENTICATED');
      setAuthError(null);
      storage.setCurrentUser(profile);
    });

    return () => unsubscribe();
  }, []);

  const refreshProfile = async (): Promise<UserProfile | null> => {
    if (!auth.currentUser) return null;
    const p = await loadProfileFromFirestore(auth.currentUser.uid, auth.currentUser.email);
    if (p) {
      setStudentProfile(p);
      storage.setCurrentUser(p);
      setIsAdmin(isAuthorizedAdmin(p, auth.currentUser));
    }
    return p;
  };

  const verifyNiat = async (niatId: string): Promise<NiatVerificationResult> => {
    return await verifyNiatRegistrationNumber(niatId);
  };

  const register = async (studentRecord: ApprovedStudent, email: string, pass: string): Promise<AuthResult> => {
    const result = await registerWithNiatAndFirebase({ studentRecord, email, password: pass });
    if (result.success && result.profile) {
      setFirebaseUser(auth.currentUser);
      setStudentProfile(result.profile);
      setAuthState('AUTHENTICATED');
      storage.setCurrentUser(result.profile);
    }
    return result;
  };

  const signIn = async (identifier: string, pass: string): Promise<AuthResult> => {
    const result = await signInStudent(identifier, pass);
    if (result.success && result.profile) {
      setFirebaseUser(auth.currentUser);
      setStudentProfile(result.profile);
      setAuthState('AUTHENTICATED');
      storage.setCurrentUser(result.profile);
      setIsAdmin(isAuthorizedAdmin(result.profile, auth.currentUser));
    }
    return result;
  };

  const signInWithGoogle = async (studentToLink?: ApprovedStudent): Promise<AuthResult> => {
    const result = await signInWithGoogleWithNiatCheck(studentToLink);
    if (result.success && result.profile) {
      setFirebaseUser(auth.currentUser);
      setStudentProfile(result.profile);
      setAuthState('AUTHENTICATED');
      storage.setCurrentUser(result.profile);
      setIsAdmin(isAuthorizedAdmin(result.profile, auth.currentUser));
    }
    return result;
  };

  const resetPassword = async (email: string) => {
    return await sendPasswordResetLink(email);
  };

  const logout = async () => {
    await logoutStudent();
    setFirebaseUser(null);
    setStudentProfile(null);
    setIsAdmin(false);
    setAuthState('UNAUTHENTICATED');
  };

  return (
    <AuthContext.Provider
      value={{
        authState,
        firebaseUser,
        studentProfile,
        isAdmin,
        authError,
        verifyNiat,
        register,
        signIn,
        signInWithGoogle,
        resetPassword,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
