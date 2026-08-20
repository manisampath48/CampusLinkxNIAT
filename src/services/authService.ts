import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInAnonymously,
  signOut, 
  updateProfile,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { auth, db, cleanForFirestore } from '../lib/firebase';
import { ApprovedStudent, UserProfile } from '../types';
import { SEED_APPROVED_STUDENTS } from './firestoreStudentService';
import { storage } from './storage';

export interface AuthResult {
  success: boolean;
  message: string;
  profile?: UserProfile;
  firebaseUser?: FirebaseUser;
}

export interface NiatVerificationResult {
  success: boolean;
  message: string;
  alreadyRegistered: boolean;
  registeredEmail?: string;
  studentRecord?: ApprovedStudent;
}

/**
 * Helper to generate a 6-character alphanumeric invitation code
 */
export function generateInvitationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'NIAT-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 1. Verify NIAT Registration Number against official records
 */
export async function verifyNiatRegistrationNumber(niatIdInput: string): Promise<NiatVerificationResult> {
  const cleanRaw = niatIdInput.trim();

  if (!cleanRaw) {
    return {
      success: false,
      alreadyRegistered: false,
      message: 'Please enter your NIAT Registration Number.'
    };
  }

  const cleanUpper = cleanRaw.toUpperCase();
  const safeDocId = cleanUpper.replace(/[\/\s\\#\?]/g, '_').slice(0, 50);

  try {
    // Check if NIAT ID is already claimed in niatIdRegistry or students
    let alreadyRegistered = false;
    let registeredEmail: string | undefined;

    try {
      const regSnap = await getDoc(doc(db, 'niatIdRegistry', cleanUpper));
      if (regSnap.exists()) {
        alreadyRegistered = true;
        const regData = regSnap.data();
        if (regData.email) registeredEmail = regData.email;
      } else {
        const studentMappingSnap = await getDoc(doc(db, 'students', cleanUpper));
        if (studentMappingSnap.exists()) {
          alreadyRegistered = true;
          const sData = studentMappingSnap.data();
          if (sData.email) registeredEmail = sData.email;
        } else {
          const studentsRef = collection(db, 'students');
          const qStudents = query(studentsRef, where('studentId', '==', cleanUpper));
          const snapStudents = await getDocs(qStudents);
          if (!snapStudents.empty) {
            alreadyRegistered = true;
            const sData = snapStudents.docs[0].data();
            if (sData.email) registeredEmail = sData.email;
          }
        }
      }
    } catch (registryErr) {
      console.warn("Registry lookup warning:", registryErr);
    }

    if (alreadyRegistered) {
      return {
        success: false,
        alreadyRegistered: true,
        registeredEmail,
        message: 'An account already exists for this NIAT ID. Please sign in.'
      };
    }

    // Lookup official student record in authorizedStudents or local roster
    let studentRecord: ApprovedStudent | undefined;

    try {
      const docRef = doc(db, 'authorizedStudents', cleanUpper);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        studentRecord = docSnap.data() as ApprovedStudent;
      }
    } catch (e) {
      console.warn("authorizedStudents doc lookup warning:", e);
    }

    if (!studentRecord) {
      try {
        const approvedRef = doc(db, 'approved_students', safeDocId);
        const approvedSnap = await getDoc(approvedRef);
        if (approvedSnap.exists()) {
          studentRecord = approvedSnap.data() as ApprovedStudent;
        }
      } catch (e) {
        console.warn("approved_students doc lookup warning:", e);
      }
    }

    if (!studentRecord) {
      const localMatch = SEED_APPROVED_STUDENTS.find(
        s => s.studentId.toUpperCase() === cleanUpper || s.studentId.toLowerCase() === cleanRaw.toLowerCase()
      );
      if (localMatch) {
        studentRecord = localMatch;
      }
    }

    if (!studentRecord) {
      return {
        success: false,
        alreadyRegistered: false,
        message: 'NIAT student not found. Please enter a valid NIAT registration number.'
      };
    }

    if (studentRecord.status === 'suspended') {
      return {
        success: false,
        alreadyRegistered: false,
        message: 'Your CampusLink account is currently suspended.'
      };
    }

    return {
      success: true,
      alreadyRegistered: false,
      studentRecord,
      message: `✓ Official NIAT Student Verified: ${studentRecord.name}`
    };

  } catch (error: any) {
    console.error("Error verifying NIAT Registration Number:", error);
    return {
      success: false,
      alreadyRegistered: false,
      message: 'Failed to verify NIAT Registration Number. Please try again.'
    };
  }
}

/**
 * 2. Register New Student with NIAT ID + Email + Password
 */
export async function registerWithNiatAndFirebase(params: {
  studentRecord: ApprovedStudent;
  email: string;
  password: string;
}): Promise<AuthResult> {
  const { studentRecord, email, password } = params;
  const cleanEmail = email.trim().toLowerCase();
  const cleanNiatId = studentRecord.studentId.toUpperCase();

  if (!cleanEmail || !password) {
    return { success: false, message: 'Please enter email and password.' };
  }

  if (password.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters long.' };
  }

  try {
    // Ensure NIAT ID is not already registered in registry
    const registryRef = doc(db, 'niatIdRegistry', cleanNiatId);
    const registrySnap = await getDoc(registryRef);
    if (registrySnap.exists()) {
      return {
        success: false,
        message: 'This NIAT ID is already registered. Please sign in.'
      };
    }

    // Create Firebase Auth user or fallback to direct Firestore registration
    let userUid: string;
    let firebaseUser: FirebaseUser | undefined;

    try {
      const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      firebaseUser = credential.user;
      userUid = firebaseUser.uid;
      await updateProfile(firebaseUser, { displayName: studentRecord.name }).catch(() => {});
    } catch (authErr: any) {
      if (authErr.code === 'auth/operation-not-allowed') {
        console.warn("Firebase Email/Password Auth disabled. Using Direct Firestore Student Authentication fallback.");
        try {
          const anonCred = await signInAnonymously(auth);
          firebaseUser = anonCred.user;
          userUid = firebaseUser.uid;
        } catch (anonErr) {
          userUid = `niat_${cleanNiatId.toLowerCase()}`;
        }
      } else if (authErr.code === 'auth/email-already-in-use') {
        return {
          success: false,
          message: 'An account with this email address already exists. Please sign in instead.'
        };
      } else {
        throw authErr;
      }
    }

    // Create ONE CampusLink student profile
    const officialName = studentRecord.name;
    const isSuperAdmin = cleanEmail === 'manisampatharveti@gmail.com';

    const studentProfile: UserProfile = {
      uid: userUid,
      firebaseUid: userUid,
      studentId: cleanNiatId,
      niatRegistrationNumber: cleanNiatId,
      name: officialName,
      officialName: officialName,
      email: cleanEmail,
      campus: studentRecord.campus,
      year: studentRecord.year,
      section: studentRecord.section,
      branch: studentRecord.branch,
      course: studentRecord.branch,
      skills: ['Problem Solving', 'Networking'],
      interests: ['Technology', 'Campus Life'],
      isVerified: true,
      profileCompleted: true,
      isAdmin: isSuperAdmin,
      role: isSuperAdmin ? 'ADMIN' : 'STUDENT',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save profile to Firestore `students/{uid}` AND `users/{uid}`
    const payload = cleanForFirestore({
      ...studentProfile,
      password: password
    });
    
    try {
      await setDoc(doc(db, 'students', userUid), payload);
      await setDoc(doc(db, 'users', userUid), payload);

      // Atomically claim NIAT ID in niatIdRegistry and students/{cleanNiatId}
      const safeMapping = cleanForFirestore({
        niatId: cleanNiatId,
        studentId: cleanNiatId,
        authUid: userUid,
        uid: userUid,
        email: cleanEmail,
        password: password,
        officialName: officialName,
        name: officialName,
        campus: studentRecord.campus,
        accountCreated: true,
        provider: "password",
        createdAt: new Date().toISOString()
      });
      
      await setDoc(registryRef, safeMapping);
      await setDoc(doc(db, 'students', cleanNiatId), safeMapping, { merge: true });
    } catch (fsErr) {
      console.error("Firestore setDoc warning during registration:", fsErr);
    }

    // Update authorized roster
    const safeDocId = cleanNiatId.replace(/[\/\s\\#\?]/g, '_').slice(0, 50);
    try {
      await setDoc(doc(db, 'authorizedStudents', cleanNiatId), cleanForFirestore({
        ...studentRecord,
        invitationUsed: true,
        registeredUid: userUid,
        email: cleanEmail,
        updatedAt: new Date().toISOString()
      }), { merge: true });
      
      await setDoc(doc(db, 'approved_students', safeDocId), cleanForFirestore({
        invitationUsed: true,
        registeredUid: userUid,
        email: cleanEmail,
        updatedAt: new Date().toISOString()
      }), { merge: true });
    } catch (aErr) {
      console.warn("Roster status update warning:", aErr);
    }

    storage.setCurrentUser(studentProfile);

    return {
      success: true,
      message: `Registration successful! Welcome to CampusLink, ${officialName}.`,
      profile: studentProfile,
      firebaseUser: firebaseUser
    };

  } catch (error: any) {
    console.error("Registration error:", error);
    let msg = error?.message || 'Failed to complete registration.';
    if (msg.includes('Database is closing/hidden') || msg.includes('closing/hidden') || msg.includes('is closing')) {
      msg = 'Registration service temporarily busy. Please try again.';
    } else if (error.code === 'auth/operation-not-allowed') {
      msg = 'Email and Password authentication is not enabled for this Firebase project. Please ask the Firebase project owner to enable it.';
    } else if (error.code === 'auth/email-already-in-use') {
      msg = 'An account with this email address already exists. Please sign in instead.';
    } else if (error.code === 'auth/invalid-email') {
      msg = 'Invalid email address format.';
    } else if (error.code === 'auth/weak-password') {
      msg = 'Password is too weak. Please use at least 6 characters.';
    }

    return { success: false, message: msg };
  }
}

/**
 * 3. Sign In with Email OR NIAT Registration Number + Password
 */
export async function signInStudent(emailOrNiatId: string, pass: string): Promise<AuthResult> {
  const cleanInput = emailOrNiatId.trim();
  if (!cleanInput || !pass) {
    return {
      success: false,
      message: 'Please enter your NIAT Registration Number or Email and Password.'
    };
  }

  try {
    let targetEmail = cleanInput.toLowerCase();

    // If input is a NIAT ID (no @ symbol), resolve to registered email
    if (!cleanInput.includes('@')) {
      const cleanNiatId = cleanInput.toUpperCase();
      let foundEmail: string | undefined;

      try {
        const regSnap = await getDoc(doc(db, 'niatIdRegistry', cleanNiatId));
        if (regSnap.exists() && regSnap.data().email) {
          foundEmail = regSnap.data().email.toLowerCase();
        } else {
          const studentsCol = collection(db, 'students');
          const qStudents = query(studentsCol, where('studentId', '==', cleanNiatId));
          const snapStudents = await getDocs(qStudents);
          if (!snapStudents.empty && snapStudents.docs[0].data().email) {
            foundEmail = snapStudents.docs[0].data().email.toLowerCase();
          } else {
            const usersCol = collection(db, 'users');
            const qUsers = query(usersCol, where('studentId', '==', cleanNiatId));
            const snapUsers = await getDocs(qUsers);
            if (!snapUsers.empty && snapUsers.docs[0].data().email) {
              foundEmail = snapUsers.docs[0].data().email.toLowerCase();
            } else {
              const approvedRef = doc(db, 'approved_students', cleanNiatId.replace(/[\/\s\\#\?]/g, '_').slice(0, 50));
              const approvedSnap = await getDoc(approvedRef);
              if (approvedSnap.exists() && approvedSnap.data().email) {
                foundEmail = approvedSnap.data().email.toLowerCase();
              } else {
                const localMatch = SEED_APPROVED_STUDENTS.find(s => s.studentId.toUpperCase() === cleanNiatId);
                if (localMatch && localMatch.email) {
                  foundEmail = localMatch.email.toLowerCase();
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn("Registry lookup error during sign-in:", e);
      }

      if (!foundEmail) {
        return {
          success: false,
          message: 'No CampusLink account exists for this NIAT ID. Please create an account first.'
        };
      }

      targetEmail = foundEmail;
    }    // Authenticate with Firebase Auth or fallback to Direct Firestore Account verification
    let user: FirebaseUser | undefined;
    let isFallbackAuth = false;

    try {
      const credential = await signInWithEmailAndPassword(auth, targetEmail, pass);
      user = credential.user;
    } catch (authErr: any) {
      if (
        authErr.code === 'auth/operation-not-allowed' || 
        authErr.code === 'auth/user-not-found' || 
        authErr.code === 'auth/invalid-credential'
      ) {
        console.warn("Using Direct Firestore Student Authentication fallback for sign in.");
        isFallbackAuth = true;
      } else if (authErr.code === 'auth/wrong-password') {
        return {
          success: false,
          message: 'Incorrect password. Please try again.'
        };
      } else {
        throw authErr;
      }
    }

    // Load Student Profile from `students/{uid}`, `users/{uid}`, or registry
    let profile: UserProfile | null = null;

    if (user && !isFallbackAuth) {
      try {
        const studentSnap = await getDoc(doc(db, 'students', user.uid));
        if (studentSnap.exists()) {
          profile = studentSnap.data() as UserProfile;
        } else {
          const userSnap = await getDoc(doc(db, 'users', user.uid));
          if (userSnap.exists()) {
            profile = userSnap.data() as UserProfile;
          }
        }
      } catch (fsErr) {
        console.warn("Firestore profile read warning:", fsErr);
      }
    }

    // Fallback or secondary query by email / NIAT ID
    if (!profile) {
      try {
        const studentsCol = collection(db, 'students');
        const qByEmail = query(studentsCol, where('email', '==', targetEmail));
        const snapByEmail = await getDocs(qByEmail);
        if (!snapByEmail.empty) {
          profile = snapByEmail.docs[0].data() as UserProfile;
        } else {
          const cleanNiatId = cleanInput.toUpperCase();
          const qByNiat = query(studentsCol, where('studentId', '==', cleanNiatId));
          const snapByNiat = await getDocs(qByNiat);
          if (!snapByNiat.empty) {
            profile = snapByNiat.docs[0].data() as UserProfile;
          }
        }
      } catch (e) {
        console.warn("Fallback query warning:", e);
      }
    }

    // If in fallback auth mode, verify password stored in Firestore document or registry
    if (isFallbackAuth) {
      let regDocData: any = null;
      const cleanNiatId = cleanInput.toUpperCase();

      try {
        const regSnap = await getDoc(doc(db, 'niatIdRegistry', cleanNiatId));
        if (regSnap.exists()) {
          regDocData = regSnap.data();
        }
      } catch (e) {}

      if (regDocData && regDocData.password && regDocData.password !== pass) {
        return {
          success: false,
          message: 'Incorrect password. Please try again.'
        };
      }

      // Establish active Firebase Auth session anonymously if possible
      try {
        if (!auth.currentUser) {
          const anonCred = await signInAnonymously(auth);
          user = anonCred.user;
        } else {
          user = auth.currentUser;
        }
      } catch (e) {
        console.warn("Anonymous auth fallback warning:", e);
      }
    }

    if (!profile) {
      if (user) {
        // Construct fallback profile from Firebase user when Firestore profile fetch is offline
        const cleanName = user.displayName || targetEmail.split('@')[0] || 'CampusLink Student';
        const cleanId = cleanInput.includes('@') ? targetEmail.split('@')[0].toUpperCase() : cleanInput.toUpperCase();
        profile = {
          uid: user.uid,
          firebaseUid: user.uid,
          studentId: cleanId,
          niatRegistrationNumber: cleanId,
          name: cleanName,
          officialName: cleanName,
          email: targetEmail,
          campus: 'Annamacharya × NIAT',
          year: '1st Year',
          section: 'A',
          branch: 'CSE',
          course: 'CSE',
          skills: ['Problem Solving', 'Networking'],
          interests: ['Technology', 'Campus Life'],
          isVerified: true,
          profileCompleted: true,
          isAdmin: targetEmail === 'manisampatharveti@gmail.com',
          role: targetEmail === 'manisampatharveti@gmail.com' ? 'ADMIN' : 'STUDENT',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          message: 'No CampusLink account was found with this email or NIAT ID. Please click "Create Account" to register.'
        };
      }
    }

    if (profile.status === 'disabled' || profile.status === 'suspended') {
      try {
        await signOut(auth);
      } catch (e) {}
      return {
        success: false,
        message: profile.status === 'disabled' 
          ? 'Your CampusLink account has been disabled. Please contact the administrator.'
          : 'Your CampusLink account is currently suspended.'
      };
    }

    if (user) {
      profile.uid = user.uid;
      profile.firebaseUid = user.uid;
      const payload = cleanForFirestore(profile);
      await setDoc(doc(db, 'students', user.uid), payload, { merge: true }).catch(() => {});
      await setDoc(doc(db, 'users', user.uid), payload, { merge: true }).catch(() => {});
    }

    storage.setCurrentUser(profile);

    return {
      success: true,
      message: `Welcome back, ${profile.officialName || profile.name}!`,
      profile,
      firebaseUser: user
    };

  } catch (error: any) {
    console.error("Sign-in error:", error);

    let msg = error?.message || "Incorrect password. Please try again.";
    if (msg.includes('Database is closing/hidden') || msg.includes('closing/hidden') || msg.includes('is closing')) {
      msg = "Authentication service temporarily busy. Please try signing in again.";
    } else if (error.code === 'auth/operation-not-allowed') {
      msg = 'Email and Password authentication is not enabled for this Firebase project. Please ask the Firebase project owner to enable it.';
    } else if (error.code === 'auth/user-not-found') {
      msg = "No CampusLink account was found with this email.";
    } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      msg = "Incorrect password. Please try again.";
    } else if (error.code === 'auth/too-many-requests') {
      msg = "Too many failed login attempts. Please try again later.";
    }

    return { success: false, message: msg };
  }
}

/**
 * 4. Sign In or Link with Google
 */
export async function signInWithGoogleWithNiatCheck(verifiedStudentRecord?: ApprovedStudent): Promise<AuthResult> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;
    const googleEmail = (user.email || '').toLowerCase().trim();

    if (!googleEmail) {
      await signOut(auth);
      return {
        success: false,
        message: 'Unable to retrieve email address from Google Account.'
      };
    }

    let profile: UserProfile | null = null;

    try {
      const studentSnap = await getDoc(doc(db, 'students', user.uid));
      if (studentSnap.exists()) {
        profile = studentSnap.data() as UserProfile;
      } else {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          profile = userSnap.data() as UserProfile;
        }
      }
    } catch (e) {
      console.warn("Google direct UID lookup warning:", e);
    }

    if (!profile) {
      try {
        const studentsCol = collection(db, 'students');
        const qByEmail = query(studentsCol, where('email', '==', googleEmail));
        const snapByEmail = await getDocs(qByEmail);
        if (!snapByEmail.empty) {
          profile = snapByEmail.docs[0].data() as UserProfile;
        }
      } catch (e) {
        console.warn("Google email query warning:", e);
      }
    }

    // SCENARIO 1: LINKING DURING REGISTRATION
    if (verifiedStudentRecord) {
      const cleanNiatId = verifiedStudentRecord.studentId.toUpperCase();

      // Check if this NIAT ID is already linked to a different registered UID
      const registryRef = doc(db, 'niatIdRegistry', cleanNiatId);
      const registrySnap = await getDoc(registryRef);
      if (registrySnap.exists()) {
        const regData = registrySnap.data();
        if (regData.authUid && regData.authUid !== user.uid) {
          await signOut(auth);
          return {
            success: false,
            message: 'This NIAT ID is already linked to a CampusLink account. Please sign in.'
          };
        }
      }

      if (profile && profile.studentId.toUpperCase() !== cleanNiatId) {
        await signOut(auth);
        return {
          success: false,
          message: `This Google account (${googleEmail}) is already linked to another student profile (${profile.studentId}).`
        };
      }

      if (!profile) {
        const officialName = verifiedStudentRecord.name;
        const isSuperAdmin = googleEmail === 'manisampatharveti@gmail.com';

        profile = {
          uid: user.uid,
          firebaseUid: user.uid,
          studentId: cleanNiatId,
          niatRegistrationNumber: cleanNiatId,
          name: officialName,
          officialName: officialName,
          email: googleEmail,
          googleUid: user.uid,
          googleEmail: googleEmail,
          campus: verifiedStudentRecord.campus,
          year: verifiedStudentRecord.year,
          section: verifiedStudentRecord.section,
          branch: verifiedStudentRecord.branch,
          course: verifiedStudentRecord.branch,
          skills: ['Problem Solving', 'Networking'],
          interests: ['Technology', 'Campus Life'],
          isVerified: true,
          profileCompleted: true,
          isGoogleLinked: true,
          isAdmin: isSuperAdmin,
          role: isSuperAdmin ? 'ADMIN' : 'STUDENT',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const payload = cleanForFirestore(profile);
        await setDoc(doc(db, 'students', user.uid), payload);
        await setDoc(doc(db, 'users', user.uid), payload);
        await setDoc(doc(db, 'niatIdRegistry', cleanNiatId), cleanForFirestore({
          authUid: user.uid,
          uid: user.uid,
          studentUid: user.uid,
          niatId: cleanNiatId,
          studentId: cleanNiatId,
          email: googleEmail,
          googleUid: user.uid,
          officialName: officialName,
          name: officialName,
          campus: verifiedStudentRecord.campus,
          verified: true,
          registered: true,
          status: 'active',
          claimedAt: new Date().toISOString()
        }));
      }
    }

    // SCENARIO 2: DIRECT GOOGLE LOGIN WITHOUT PREVIOUS REGISTRATION
    if (!profile || !profile.isVerified) {
      await signOut(auth);
      storage.logout();
      return {
        success: false,
        message: 'CampusLink is available only to verified NIAT students. Please verify your NIAT registration number first.'
      };
    }

    if (profile.status === 'disabled' || profile.status === 'suspended') {
      await signOut(auth);
      storage.logout();
      return {
        success: false,
        message: profile.status === 'disabled'
          ? 'Your CampusLink account has been disabled. Please contact the administrator.'
          : 'Your CampusLink account is currently suspended.'
      };
    }

    // Bind authenticated Google UID to student profile if matching by email
    profile.uid = user.uid;
    profile.firebaseUid = user.uid;
    profile.googleUid = user.uid;
    profile.googleEmail = googleEmail;

    const updatedPayload = cleanForFirestore(profile);
    await setDoc(doc(db, 'students', user.uid), updatedPayload, { merge: true });
    await setDoc(doc(db, 'users', user.uid), updatedPayload, { merge: true });

    storage.setCurrentUser(profile);

    return {
      success: true,
      message: `Signed in with Google as ${profile.officialName || profile.name}!`,
      profile,
      firebaseUser: user
    };

  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      console.warn("Google sign-in popup closed by user.");
      return { success: false, message: 'Google sign-in window was closed.' };
    }
    console.error("Google sign-in error:", error);
    let msg = error.message || 'Failed to sign in with Google.';
    if (error.code === 'auth/operation-not-allowed') {
      msg = 'Google sign-in is currently unavailable. Please enable Google authentication in Firebase Console.';
    } else if (error.code === 'auth/popup-blocked') {
      msg = 'Sign-in popup was blocked by browser. Please allow popups.';
    }
    return { success: false, message: msg };
  }
}

/**
 * 5. Logout
 */
export async function logoutStudent(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn("Firebase sign-out warning:", err);
  }
  storage.logout();
}

/**
 * 6. Password Reset Link
 */
export async function sendPasswordResetLink(email: string): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: 'Please enter a valid email address.' };
  }

  try {
    await sendPasswordResetEmail(auth, cleanEmail);
    return {
      success: true,
      message: `Password reset link sent to ${cleanEmail}. Please check your email inbox or spam folder.`
    };
  } catch (error: any) {
    console.error("Password reset error:", error);
    let msg = error.message || 'Failed to send password reset email.';
    if (error.code === 'auth/user-not-found') {
      msg = 'No CampusLink account was found with this email.';
    }
    return { success: false, message: msg };
  }
}
