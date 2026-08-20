import { APPROVED_STUDENTS_DB, CAMPUSES, DEMO_OPPORTUNITIES, DEMO_POSTS, DEMO_PROFILES, DEMO_PROJECTS } from '../data/mockData';
import { ApprovedStudent, BrandingConfig, CampusDetails, CampusName, Connection, Message, NotificationItem, Opportunity, Post, ProjectRequirement, ReportItem, StudentShowcase, UserProfile } from '../types';
import { auth, db, cleanForFirestore } from '../lib/firebase';
import { isAuthorizedAdmin } from '../utils/adminAuth';
import { canEditContent, canDeleteContent, canManagePost } from '../utils/postPermissions';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  where,
  or 
} from 'firebase/firestore';

const STORAGE_KEYS = {
  CURRENT_USER: 'campuslink_current_user',
  APPROVED_STUDENTS: 'campuslink_approved_students',
  PROFILES: 'campuslink_profiles',
  POSTS: 'campuslink_posts',
  CONNECTIONS: 'campuslink_connections',
  PROJECTS: 'campuslink_projects',
  OPPORTUNITIES: 'campuslink_opportunities',
  MESSAGES: 'campuslink_messages',
  NOTIFICATIONS: 'campuslink_notifications',
  REPORTS: 'campuslink_reports',
  CAMPUSES: 'campuslink_campuses',
  BRANDING: 'campuslink_branding',
  STUDENT_SHOWCASES: 'campuslink_student_showcases'
};

function getLocal<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return fallback;
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('LocalStorage write failed:', err);
  }
}

class StorageService {
  private currentUser: UserProfile | null = null;
  private approvedStudents: ApprovedStudent[] = [];
  private profiles: UserProfile[] = [];
  private posts: Post[] = [];
  private connections: Connection[] = [];
  private projects: ProjectRequirement[] = [];
  private opportunities: Opportunity[] = [];
  private messages: Message[] = [];
  private notifications: NotificationItem[] = [];
  private reports: ReportItem[] = [];
  private campuses: CampusDetails[] = [];
  private branding: BrandingConfig = { logoUrl: '', appName: 'CampusLink' };
  private showcases: StudentShowcase[] = [];

  private listeners: Set<() => void> = new Set();
  private publicUnsubscribers: Array<() => void> = [];
  private activeUnsubscribers: Array<() => void> = [];

  constructor() {
    this.init();
    this.setupPublicRealtimeSync();
  }

  private setupPublicRealtimeSync() {
    try {
      const applyBrandingData = (remoteData: BrandingConfig) => {
        if (!remoteData) return;
        let cleanLogo = remoteData.logoUrl?.trim() || '';
        if (cleanLogo.startsWith('blob:') || cleanLogo.startsWith('file:') || (cleanLogo.startsWith('data:') && cleanLogo.length > 50000)) {
          cleanLogo = '';
        }
        this.branding = { ...this.branding, ...remoteData, logoUrl: cleanLogo };
        setLocal(STORAGE_KEYS.BRANDING, this.branding);
        this.notify();
      };

      // 1. Branding Config - doc(db, 'config', 'branding')
      const unsubBranding = onSnapshot(
        doc(db, 'config', 'branding'), 
        (docSnap) => {
          if (docSnap.exists()) {
            applyBrandingData(docSnap.data() as BrandingConfig);
          }
        }, 
        (err) => console.warn("[Public Sync] config/branding listener:", err)
      );
      this.publicUnsubscribers.push(unsubBranding);

      // 2. Branding Config - doc(db, 'appSettings', 'global')
      const unsubAppSettings = onSnapshot(
        doc(db, 'appSettings', 'global'), 
        (docSnap) => {
          if (docSnap.exists()) {
            applyBrandingData(docSnap.data() as BrandingConfig);
          }
        }, 
        (err) => console.warn("[Public Sync] appSettings/global listener:", err)
      );
      this.publicUnsubscribers.push(unsubAppSettings);

      // 3. Campuses Config
      const unsubCampuses = onSnapshot(
        doc(db, 'config', 'campuses'), 
        (docSnap) => {
          if (docSnap.exists() && docSnap.data().campuses) {
            const list = docSnap.data().campuses as CampusDetails[];
            this.campuses = list.map(c => {
              let img = c.image?.trim() || '';
              if (img.startsWith('blob:') || img.startsWith('file:') || (img.startsWith('data:') && img.length > 50000)) {
                img = 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&q=80&w=1200';
              }
              return { ...c, image: img };
            });
            setLocal(STORAGE_KEYS.CAMPUSES, this.campuses);
            this.notify();
          }
        }, 
        (err) => console.warn("[Public Sync] Campuses listener:", err)
      );
      this.publicUnsubscribers.push(unsubCampuses);
    } catch (err) {
      console.error("[Public Sync] Error setting up public realtime sync:", err);
    }
  }

  private stopFirestoreRealtimeSync() {
    this.activeUnsubscribers.forEach(unsub => {
      try { unsub(); } catch (e) { console.warn("Unsub error:", e); }
    });
    this.activeUnsubscribers = [];
  }

  private setupFirestoreRealtimeSync(uid?: string) {
    this.stopFirestoreRealtimeSync();

    try {
      // 1. User Profiles collection (limited)
      const unsubProfiles = onSnapshot(query(collection(db, 'users'), limit(50)), (snap) => {
        const list: UserProfile[] = [];
        snap.forEach(d => {
          if (d.exists()) list.push(d.data() as UserProfile);
        });
        if (list.length > 0) {
          this.profiles = list;
          setLocal(STORAGE_KEYS.PROFILES, this.profiles);
          if (uid) {
            const currentInList = list.find(p => p.uid === uid);
            if (currentInList) {
              this.currentUser = currentInList;
              const isAdmin = isAuthorizedAdmin(this.currentUser, auth.currentUser);
              this.currentUser.isAdmin = isAdmin;
              this.currentUser.role = isAdmin ? 'ADMIN' : 'STUDENT';
              setLocal(STORAGE_KEYS.CURRENT_USER, this.currentUser);
            }
          }
          this.notify();
        }
      }, (err) => console.warn("Profiles listener:", err));
      this.activeUnsubscribers.push(unsubProfiles);

      // 5. Feed Posts
      const unsubPosts = onSnapshot(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50)), (snap) => {
        const list: Post[] = [];
        snap.forEach(d => {
          if (d.exists()) list.push(d.data() as Post);
        });
        if (list.length > 0 || snap.metadata.hasPendingWrites) {
          this.posts = list;
          setLocal(STORAGE_KEYS.POSTS, this.posts);
          this.notify();
        }
      }, (err) => console.warn("Posts listener:", err));
      this.activeUnsubscribers.push(unsubPosts);

      // 6. Connections (targeted to user)
      const connQuery = uid 
        ? query(collection(db, 'connections'), or(where('senderId', '==', uid), where('receiverId', '==', uid)))
        : query(collection(db, 'connections'), limit(50));

      const unsubConnections = onSnapshot(connQuery, (snap) => {
        const list: Connection[] = [];
        snap.forEach(d => {
          if (d.exists()) list.push(d.data() as Connection);
        });
        this.connections = list;
        setLocal(STORAGE_KEYS.CONNECTIONS, this.connections);
        this.notify();
      }, (err) => console.warn("Connections listener:", err));
      this.activeUnsubscribers.push(unsubConnections);

      // 7. Projects
      const unsubProjects = onSnapshot(query(collection(db, 'projects'), orderBy('createdAt', 'desc'), limit(50)), (snap) => {
        const list: ProjectRequirement[] = [];
        snap.forEach(d => {
          if (d.exists()) list.push(d.data() as ProjectRequirement);
        });
        this.projects = list;
        setLocal(STORAGE_KEYS.PROJECTS, this.projects);
        this.notify();
      }, (err) => console.warn("Projects listener:", err));
      this.activeUnsubscribers.push(unsubProjects);

      // 8. Opportunities
      const unsubOpps = onSnapshot(query(collection(db, 'opportunities'), orderBy('createdAt', 'desc'), limit(50)), (snap) => {
        const list: Opportunity[] = [];
        snap.forEach(d => {
          if (d.exists()) list.push(d.data() as Opportunity);
        });
        this.opportunities = list;
        setLocal(STORAGE_KEYS.OPPORTUNITIES, this.opportunities);
        this.notify();
      }, (err) => console.warn("Opportunities listener:", err));
      this.activeUnsubscribers.push(unsubOpps);

      // 9. Messages (targeted to user)
      const msgQuery = uid 
        ? query(collection(db, 'messages'), or(where('senderId', '==', uid), where('receiverId', '==', uid)), limit(100))
        : query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(50));

      const unsubMessages = onSnapshot(msgQuery, (snap) => {
        const list: Message[] = [];
        snap.forEach(d => {
          if (d.exists()) list.push(d.data() as Message);
        });
        this.messages = list;
        setLocal(STORAGE_KEYS.MESSAGES, this.messages);
        this.notify();
      }, (err) => console.warn("Messages listener:", err));
      this.activeUnsubscribers.push(unsubMessages);

      // 10. Notifications (targeted to user)
      if (uid) {
        const unsubNotifs = onSnapshot(query(collection(db, 'notifications'), where('userId', '==', uid), limit(50)), (snap) => {
          const list: NotificationItem[] = [];
          snap.forEach(d => {
            if (d.exists()) list.push(d.data() as NotificationItem);
          });
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          this.notifications = list;
          setLocal(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
          this.notify();
        }, (err) => console.warn("Notifications listener:", err));
        this.activeUnsubscribers.push(unsubNotifs);
      }

      // 11. Student Showcases
      const unsubShowcases = onSnapshot(query(collection(db, 'studentShowcases'), orderBy('createdAt', 'desc'), limit(50)), (snap) => {
        const list: StudentShowcase[] = [];
        snap.forEach(d => {
          if (d.exists()) {
            const data = d.data() as StudentShowcase;
            const isExpired = new Date(data.expiresAt).getTime() <= Date.now();
            if (isExpired && data.status === 'active') {
              data.status = 'expired';
            }
            list.push(data);
          }
        });
        this.showcases = list;
        setLocal(STORAGE_KEYS.STUDENT_SHOWCASES, this.showcases);
        this.notify();
      }, (err) => console.warn("StudentShowcases listener:", err));
      this.activeUnsubscribers.push(unsubShowcases);
    } catch (err) {
      console.error("Error setting up Firestore listeners:", err);
    }
  }

  private setupFirebaseAuthListener() {
    onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        this.stopFirestoreRealtimeSync();
        this.currentUser = null;
        this.messages = [];
        this.notifications = [];
        if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
          localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        }
        this.notify();
      } else {
        if (!this.currentUser) {
          this.setupFirestoreRealtimeSync(firebaseUser.uid);
        }
      }
    });
  }

  private init() {
    const rawStudents = getLocal(STORAGE_KEYS.APPROVED_STUDENTS, APPROVED_STUDENTS_DB);
    this.approvedStudents = (rawStudents || []).filter(
      s => s && s.studentId && typeof s.studentId === 'string' && !s.studentId.startsWith('NIAT202500') && !s.studentId.startsWith('NRI202500') && !s.studentId.startsWith('CHAL202500') && s.studentId !== 'NIATADMIN001'
    );

    const rawProfiles = getLocal(STORAGE_KEYS.PROFILES, DEMO_PROFILES);
    this.profiles = (rawProfiles || []).filter(p => p && p.uid && typeof p.uid === 'string' && !p.uid.startsWith('usr_'));

    const rawPosts = getLocal(STORAGE_KEYS.POSTS, DEMO_POSTS);
    this.posts = (rawPosts || []).filter(p => p && p.id && typeof p.id === 'string' && !p.id.startsWith('post_'));

    const rawConnections = getLocal<Connection[]>(STORAGE_KEYS.CONNECTIONS, []);
    this.connections = (rawConnections || []).filter(c => c && c.id && typeof c.id === 'string' && !c.id.startsWith('conn_'));

    const rawProjects = getLocal(STORAGE_KEYS.PROJECTS, DEMO_PROJECTS);
    this.projects = (rawProjects || []).filter(p => p && p.id && typeof p.id === 'string' && !p.id.startsWith('proj_'));

    const rawOpportunities = getLocal(STORAGE_KEYS.OPPORTUNITIES, DEMO_OPPORTUNITIES);
    this.opportunities = (rawOpportunities || []).filter(o => o && o.id && typeof o.id === 'string' && !o.id.startsWith('opp_'));

    const rawMessages = getLocal<Message[]>(STORAGE_KEYS.MESSAGES, []);
    this.messages = (rawMessages || []).filter(m => m && m.id && typeof m.id === 'string' && !m.id.startsWith('m_'));

    const rawNotifications = getLocal<NotificationItem[]>(STORAGE_KEYS.NOTIFICATIONS, []);
    this.notifications = (rawNotifications || []).filter(n => n && n.id && typeof n.id === 'string' && !n.id.startsWith('n_'));

    this.reports = getLocal(STORAGE_KEYS.REPORTS, []);
    this.campuses = getLocal<CampusDetails[]>(STORAGE_KEYS.CAMPUSES, CAMPUSES);
    this.branding = getLocal<BrandingConfig>(STORAGE_KEYS.BRANDING, { logoUrl: '', appName: 'CampusLink' });
    const rawShowcases = getLocal<StudentShowcase[]>(STORAGE_KEYS.STUDENT_SHOWCASES, []);
    this.showcases = (rawShowcases || []).filter(s => s && s.id && typeof s.id === 'string' && !s.id.startsWith('sc_demo_'));

    const savedUser = getLocal<UserProfile | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (savedUser && savedUser.uid && typeof savedUser.uid === 'string' && !savedUser.uid.startsWith('usr_') && savedUser.isVerified && savedUser.studentId !== 'STUDENT') {
      this.currentUser = savedUser;
      const isAdmin = isAuthorizedAdmin(this.currentUser, auth.currentUser);
      this.currentUser.isAdmin = isAdmin;
      this.currentUser.role = isAdmin ? 'ADMIN' : 'STUDENT';
    } else {
      this.currentUser = null;
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
    }

    this.persistAll();
    this.setupFirestoreRealtimeSync(this.currentUser?.uid);
  }

  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  private persistAll() {
    setLocal(STORAGE_KEYS.APPROVED_STUDENTS, this.approvedStudents);
    setLocal(STORAGE_KEYS.PROFILES, this.profiles);
    setLocal(STORAGE_KEYS.POSTS, this.posts);
    setLocal(STORAGE_KEYS.CONNECTIONS, this.connections);
    setLocal(STORAGE_KEYS.PROJECTS, this.projects);
    setLocal(STORAGE_KEYS.OPPORTUNITIES, this.opportunities);
    setLocal(STORAGE_KEYS.MESSAGES, this.messages);
    setLocal(STORAGE_KEYS.NOTIFICATIONS, this.notifications);
    setLocal(STORAGE_KEYS.REPORTS, this.reports);
    setLocal(STORAGE_KEYS.CAMPUSES, this.campuses);
    setLocal(STORAGE_KEYS.BRANDING, this.branding);
    setLocal(STORAGE_KEYS.CURRENT_USER, this.currentUser);
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this.persistAll();
    }, 50);
  }

  // --- Auth & Verification ---

  public getCurrentUser(): UserProfile | null {
    if (this.currentUser) {
      if (!this.currentUser.isVerified || this.currentUser.status === 'suspended' || this.currentUser.status === 'disabled' || this.currentUser.studentId === 'STUDENT') {
        return null;
      }
      const isAdmin = isAuthorizedAdmin(this.currentUser, auth.currentUser);
      this.currentUser.isAdmin = isAdmin;
      this.currentUser.role = isAdmin ? 'ADMIN' : 'STUDENT';
    }
    return this.currentUser;
  }

  public setCurrentUser(user: UserProfile): void {
    if (user) {
      const isAdmin = isAuthorizedAdmin(user, auth.currentUser);
      user.isAdmin = isAdmin;
      user.role = isAdmin ? 'ADMIN' : 'STUDENT';
    }
    this.currentUser = user;
    if (user && !this.profiles.some(p => p.uid === user.uid)) {
      this.profiles.push(user);
    }
    setLocal(STORAGE_KEYS.CURRENT_USER, this.currentUser);
    if (user && user.uid) {
      const cleanData = cleanForFirestore(user);
      setDoc(doc(db, 'students', user.uid), cleanData, { merge: true }).catch(console.error);
      setDoc(doc(db, 'users', user.uid), cleanData, { merge: true }).catch(console.error);
      this.setupFirestoreRealtimeSync(user.uid);
    }
    this.notify();
  }

  public grantAdminAccess(): void {
    if (this.currentUser) {
      if (this.currentUser.email?.toLowerCase() === 'manisampatharveti@gmail.com') {
        this.currentUser.isAdmin = true;
        this.currentUser.role = 'ADMIN';
        setLocal(STORAGE_KEYS.CURRENT_USER, this.currentUser);
        if (this.currentUser.uid) {
          setDoc(doc(db, 'users', this.currentUser.uid), cleanForFirestore(this.currentUser), { merge: true }).catch(console.error);
        }
        this.notify();
      }
    }
  }

  public getCampuses(): CampusDetails[] {
    return this.campuses && this.campuses.length > 0 ? this.campuses : CAMPUSES;
  }

  public updateCampusDetails(updatedCampuses: CampusDetails[]): void {
    const sanitizedCampuses = updatedCampuses.map(c => {
      let img = c.image?.trim() || '';
      if (img.startsWith('blob:') || img.startsWith('file:') || (img.startsWith('data:') && img.length > 50000)) {
        img = 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&q=80&w=1200';
      }
      return { ...c, image: img };
    });

    this.campuses = sanitizedCampuses;
    setLocal(STORAGE_KEYS.CAMPUSES, sanitizedCampuses);
    setDoc(doc(db, 'config', 'campuses'), cleanForFirestore({ campuses: sanitizedCampuses }), { merge: true }).catch(console.error);
    this.notify();
  }

  public getBrandingConfig(): BrandingConfig {
    return this.branding || { logoUrl: '', appName: 'CampusLink' };
  }

  public updateBrandingConfig(config: BrandingConfig): void {
    let cleanLogoUrl = config.logoUrl?.trim();
    if (cleanLogoUrl !== undefined) {
      if (cleanLogoUrl.startsWith('blob:') || cleanLogoUrl.startsWith('file:') || (cleanLogoUrl.startsWith('data:') && cleanLogoUrl.length > 50000)) {
        console.warn("[Branding] Rejected non-persistent image URL for branding:", cleanLogoUrl.substring(0, 30));
        cleanLogoUrl = this.branding?.logoUrl || '';
      }
    } else {
      cleanLogoUrl = this.branding?.logoUrl || '';
    }

    const version = Date.now();
    this.branding = { 
      ...this.branding, 
      ...config, 
      logoUrl: cleanLogoUrl, 
      updatedAt: new Date().toISOString(),
      logoVersion: version 
    };

    setLocal(STORAGE_KEYS.BRANDING, this.branding);
    const firestoreData = cleanForFirestore(this.branding);
    setDoc(doc(db, 'config', 'branding'), firestoreData, { merge: true }).catch(console.error);
    setDoc(doc(db, 'appSettings', 'global'), firestoreData, { merge: true }).catch(console.error);
    this.notify();
  }

  public verifyStudentId(studentIdOrName: string, email?: string): { success: boolean; studentRecord?: ApprovedStudent; message: string } {
    const cleanQuery = studentIdOrName.trim().toLowerCase();

    const record = this.approvedStudents.find(
      s => s.studentId.toLowerCase() === cleanQuery ||
           s.name.toLowerCase() === cleanQuery ||
           s.name.toLowerCase().includes(cleanQuery) ||
           (s.email && s.email.toLowerCase() === cleanQuery) ||
           (email && s.email && s.email.toLowerCase() === email.trim().toLowerCase())
    );

    if (!record) {
      return {
        success: false,
        message: `Student record "${studentIdOrName}" not found in approved NIAT student database. Please check your NIAT ID or Name.`
      };
    }

    if (record.status === 'suspended') {
      return {
        success: false,
        message: `Student "${record.name}" (${record.studentId}) is currently suspended. Please contact NIAT Campus Administration.`
      };
    }

    const existing = this.profiles.find(p => p.studentId.toUpperCase() === record.studentId.toUpperCase());
    if (existing || record.invitationUsed) {
      return {
        success: false,
        message: `Student "${record.name}" (${record.studentId}) is already registered. Please proceed to Sign In.`
      };
    }

    return {
      success: true,
      studentRecord: record,
      message: `Verified! Welcome ${record.name} from ${record.campus} (${record.year}, ${record.branch}).`
    };
  }

  public registerStudent(studentRecord: ApprovedStudent, bio: string, skills: string[], avatar?: string): UserProfile {
    const newUid = `usr_${Date.now()}`;
    const newProfile: UserProfile = {
      uid: newUid,
      studentId: studentRecord.studentId,
      name: studentRecord.name,
      email: studentRecord.email,
      campus: studentRecord.campus,
      year: studentRecord.year,
      section: studentRecord.section,
      branch: studentRecord.branch,
      bio: bio || `NIAT Student at ${studentRecord.campus}`,
      skills: skills.length > 0 ? skills : ["Problem Solving", "Teamwork"],
      interests: ["Tech Innovation", "Campus Collaboration"],
      avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentRecord.name)}&background=800000&color=fff&bold=true`,
      isVerified: true,
      createdAt: new Date().toISOString()
    };

    this.profiles.push(newProfile);
    this.currentUser = newProfile;
    setDoc(doc(db, 'users', newProfile.uid), cleanForFirestore(newProfile), { merge: true }).catch(console.error);

    const safeDocId = studentRecord.studentId.toUpperCase().replace(/[\/\s\\#\?]/g, '_').slice(0, 50);
    setDoc(doc(db, 'approved_students', safeDocId), cleanForFirestore({
      ...studentRecord,
      invitationUsed: true,
      registeredUid: newProfile.uid,
      updatedAt: new Date().toISOString()
    }), { merge: true }).catch(console.error);

    this.notify();
    return newProfile;
  }

  public loginStudent(identifier: string): { success: boolean; user?: UserProfile; message: string } {
    const clean = identifier.trim().toLowerCase();

    let user = this.profiles.find(
      p => p.email.toLowerCase() === clean ||
           p.studentId.toLowerCase() === clean ||
           p.name.toLowerCase() === clean ||
           p.name.toLowerCase().includes(clean)
    );

    if (!user) {
      const approvedRecord = this.approvedStudents.find(
        s => s.studentId.toLowerCase() === clean ||
             s.email.toLowerCase() === clean ||
             s.name.toLowerCase() === clean ||
             s.name.toLowerCase().includes(clean)
      );

      if (approvedRecord && !approvedRecord.invitationUsed) {
        user = this.registerStudent(
          approvedRecord,
          `Student at ${approvedRecord.campus}. Learning Full Stack Development and AI at NIAT.`,
          ["TypeScript", "React", "Python", "Data Structures"]
        );
      }
    }

    if (!user) {
      return {
        success: false,
        message: `No registered NIAT student record found for "${identifier}". Try typing your registered email or NIAT Student ID.`
      };
    }

    this.currentUser = user;
    this.notify();
    return {
      success: true,
      user,
      message: `Welcome, ${user.name} (${user.studentId})!`
    };
  }

  public switchDemoUser(uid: string): { success: boolean; message: string } {
    const firebaseUser = auth.currentUser;
    const isAdmin = isAuthorizedAdmin(this.currentUser, firebaseUser);

    if (!isAdmin) {
      console.warn('[Security Violation] Unauthorized call to switchDemoUser by non-admin user:', firebaseUser?.email || 'unauthenticated');
      return {
        success: false,
        message: 'Access denied. Switch User is strictly restricted to authorized administrators.'
      };
    }

    const target = this.profiles.find(p => p.uid === uid);
    if (target) {
      this.currentUser = target;
      setLocal(STORAGE_KEYS.CURRENT_USER, this.currentUser);
      this.notify();
      return {
        success: true,
        message: `Switched demo view to ${target.name}`
      };
    }

    return {
      success: false,
      message: 'Target user profile not found.'
    };
  }

  public logout() {
    this.stopFirestoreRealtimeSync();
    this.currentUser = null;
    this.messages = [];
    this.notifications = [];
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    signOut(auth).catch(console.error);
    this.notify();
  }

  public updateProfile(updates: Partial<UserProfile>) {
    if (!this.currentUser) return;
    const { studentId, name, campus, year, section, branch, ...allowedUpdates } = updates;
    this.currentUser = { ...this.currentUser, ...allowedUpdates };
    
    // Atomically sync in-memory profiles list for directory, feed, and connections
    const currentUid = this.currentUser.uid;
    const currentStudentId = this.currentUser.studentId;
    let foundInProfiles = false;
    this.profiles = this.profiles.map(p => {
      if ((currentUid && p.uid === currentUid) || (currentStudentId && p.studentId === currentStudentId)) {
        foundInProfiles = true;
        return { ...p, ...allowedUpdates };
      }
      return p;
    });

    if (!foundInProfiles && this.currentUser) {
      this.profiles.push(this.currentUser);
    }

    // Persist immediately to localStorage for instant reload consistency
    setLocal(STORAGE_KEYS.CURRENT_USER, this.currentUser);
    setLocal(STORAGE_KEYS.PROFILES, this.profiles);

    // Notify React state listeners immediately across all components
    this.notify();

    // Persist to Firestore documents (`users/{uid}` and `students/{uid}`)
    if (this.currentUser.uid) {
      const cleanData = cleanForFirestore(this.currentUser);
      setDoc(doc(db, 'users', this.currentUser.uid), cleanData, { merge: true }).catch(err => {
        console.error('[StorageService] Error syncing user doc to Firestore:', err);
      });
      setDoc(doc(db, 'students', this.currentUser.uid), cleanData, { merge: true }).catch(err => {
        console.error('[StorageService] Error syncing student doc to Firestore:', err);
      });
      if (this.currentUser.studentId) {
        setDoc(doc(db, 'students', this.currentUser.studentId.toUpperCase()), cleanData, { merge: true }).catch(err => {
          console.error('[StorageService] Error syncing studentId doc to Firestore:', err);
        });
      }
    }
  }

  // --- Directory & Discovery ---

  public getProfiles(): UserProfile[] {
    return this.profiles;
  }

  public filterStudents(
    campusFilter: CampusName | null,
    yearFilter?: string,
    sectionFilter?: string,
    branchFilter?: string,
    searchQuery?: string
  ): UserProfile[] {
    if (!campusFilter) {
      return [];
    }

    return this.profiles.filter(student => {
      if (student.campus !== campusFilter) return false;

      if (yearFilter && yearFilter !== "All" && student.year !== yearFilter) {
        return false;
      }

      if (sectionFilter && sectionFilter !== "All" && student.section !== sectionFilter) {
        return false;
      }

      if (branchFilter && branchFilter !== "All" && student.branch !== branchFilter) {
        return false;
      }

      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (student.name || '').toLowerCase().includes(q);
        const matchesSkills = (student.skills || []).some(s => typeof s === 'string' && s.toLowerCase().includes(q));
        const matchesBio = (student.bio || '').toLowerCase().includes(q);
        if (!matchesName && !matchesSkills && !matchesBio) return false;
      }

      return true;
    });
  }

  // --- Connections ---

  public getConnections(): Connection[] {
    return this.connections;
  }

  public getConnectionState(otherUserId: string): "none" | "pending_sent" | "pending_received" | "accepted" {
    if (!this.currentUser) return "none";
    const conn = this.connections.find(
      c =>
        (c.senderId === this.currentUser!.uid && c.receiverId === otherUserId) ||
        (c.senderId === otherUserId && c.receiverId === this.currentUser!.uid)
    );

    if (!conn) return "none";
    if (conn.status === "accepted") return "accepted";
    if (conn.status === "pending") {
      return conn.senderId === this.currentUser.uid ? "pending_sent" : "pending_received";
    }
    return "none";
  }

  public sendConnectionRequest(targetUserId: string) {
    if (!this.currentUser) return;
    const existingState = this.getConnectionState(targetUserId);
    if (existingState !== "none") return;

    const newConn: Connection = {
      id: `conn_${Date.now()}`,
      senderId: this.currentUser.uid,
      receiverId: targetUserId,
      status: "pending",
      createdAt: new Date().toISOString()
    };

    this.connections.push(newConn);
    setDoc(doc(db, 'connections', newConn.id), cleanForFirestore(newConn)).catch(console.error);

    const notif: NotificationItem = {
      id: `n_${Date.now()}`,
      userId: targetUserId,
      actorId: this.currentUser.uid,
      actorName: this.currentUser.name,
      actorAvatar: this.currentUser.avatar,
      type: "connection_request",
      message: `sent you a connection request from ${this.currentUser.campus}`,
      read: false,
      createdAt: new Date().toISOString()
    };
    this.notifications.unshift(notif);
    setDoc(doc(db, 'notifications', notif.id), cleanForFirestore(notif)).catch(console.error);

    this.notify();
  }

  public acceptConnectionRequest(senderUserId: string) {
    if (!this.currentUser) return;
    const conn = this.connections.find(
      c => c.senderId === senderUserId && c.receiverId === this.currentUser!.uid && c.status === "pending"
    );

    if (conn) {
      conn.status = "accepted";
      updateDoc(doc(db, 'connections', conn.id), cleanForFirestore({ status: "accepted" })).catch(console.error);

      const notif: NotificationItem = {
        id: `n_${Date.now()}`,
        userId: senderUserId,
        actorId: this.currentUser.uid,
        actorName: this.currentUser.name,
        actorAvatar: this.currentUser.avatar,
        type: "connection_accepted",
        message: `accepted your connection request`,
        read: false,
        createdAt: new Date().toISOString()
      };
      this.notifications.unshift(notif);
      setDoc(doc(db, 'notifications', notif.id), cleanForFirestore(notif)).catch(console.error);

      this.notify();
    }
  }

  public rejectConnectionRequest(senderUserId: string) {
    if (!this.currentUser) return;
    const conn = this.connections.find(
      c => c.senderId === senderUserId && c.receiverId === this.currentUser!.uid
    );
    if (conn) {
      this.connections = this.connections.filter(c => c.id !== conn.id);
      deleteDoc(doc(db, 'connections', conn.id)).catch(console.error);
      this.notify();
    }
  }

  public removeConnection(otherUserId: string) {
    if (!this.currentUser) return;
    const conn = this.connections.find(
      c => (c.senderId === this.currentUser!.uid && c.receiverId === otherUserId) ||
           (c.senderId === otherUserId && c.receiverId === this.currentUser!.uid)
    );
    if (conn) {
      this.connections = this.connections.filter(c => c.id !== conn.id);
      deleteDoc(doc(db, 'connections', conn.id)).catch(console.error);
      this.notify();
    }
  }

  // --- Posts & Feed ---

  public getPosts(): Post[] {
    return this.posts;
  }

  public createPost(category: Post['category'], content: string, imageUrl?: string) {
    if (!this.currentUser) return;
    const authorFirebaseUid = auth.currentUser?.uid || this.currentUser.firebaseUid || this.currentUser.uid;
    const newPost: Post = {
      id: `post_${Date.now()}`,
      authorId: authorFirebaseUid,
      ownerUid: authorFirebaseUid,
      authorName: this.currentUser.name,
      authorAvatar: this.currentUser.avatar,
      authorCampus: this.currentUser.campus,
      authorYear: this.currentUser.year,
      authorBranch: this.currentUser.branch,
      category,
      content,
      imageUrl,
      likes: [],
      commentsCount: 0,
      comments: [],
      saves: [],
      createdAt: new Date().toISOString()
    };

    this.posts.unshift(newPost);
    setDoc(doc(db, 'posts', newPost.id), cleanForFirestore(newPost)).catch(console.error);
    this.notify();
  }

  public likePost(postId: string) {
    if (!this.currentUser) return;
    const post = this.posts.find(p => p.id === postId);
    if (!post) return;

    const likedIndex = post.likes.indexOf(this.currentUser.uid);
    if (likedIndex > -1) {
      post.likes.splice(likedIndex, 1);
    } else {
      post.likes.push(this.currentUser.uid);

      if (post.authorId !== this.currentUser.uid) {
        const notif: NotificationItem = {
          id: `n_${Date.now()}`,
          userId: post.authorId,
          actorId: this.currentUser.uid,
          actorName: this.currentUser.name,
          actorAvatar: this.currentUser.avatar,
          type: "post_like",
          targetId: post.id,
          message: `liked your post in ${post.category}`,
          read: false,
          createdAt: new Date().toISOString()
        };
        this.notifications.unshift(notif);
        setDoc(doc(db, 'notifications', notif.id), cleanForFirestore(notif)).catch(console.error);
      }
    }

    updateDoc(doc(db, 'posts', post.id), cleanForFirestore({ likes: post.likes })).catch(console.error);
    this.notify();
  }

  public addComment(postId: string, content: string) {
    if (!this.currentUser || !content.trim()) return;
    const post = this.posts.find(p => p.id === postId);
    if (!post) return;

    const comment = {
      id: `c_${Date.now()}`,
      authorId: this.currentUser.uid,
      authorName: this.currentUser.name,
      authorAvatar: this.currentUser.avatar,
      authorCampus: this.currentUser.campus,
      content: content.trim(),
      createdAt: new Date().toISOString()
    };

    post.comments.push(comment);
    post.commentsCount = post.comments.length;

    if (post.authorId !== this.currentUser.uid) {
      const notif: NotificationItem = {
        id: `n_${Date.now()}`,
        userId: post.authorId,
        actorId: this.currentUser.uid,
        actorName: this.currentUser.name,
        actorAvatar: this.currentUser.avatar,
        type: "post_comment",
        targetId: post.id,
        message: `commented on your post: "${content.slice(0, 30)}..."`,
        read: false,
        createdAt: new Date().toISOString()
      };
      this.notifications.unshift(notif);
      setDoc(doc(db, 'notifications', notif.id), cleanForFirestore(notif)).catch(console.error);
    }

    updateDoc(doc(db, 'posts', post.id), cleanForFirestore({ comments: post.comments, commentsCount: post.commentsCount })).catch(console.error);
    this.notify();
  }

  public toggleSavePost(postId: string) {
    if (!this.currentUser) return;
    const post = this.posts.find(p => p.id === postId);
    if (!post) return;

    const saveIndex = post.saves.indexOf(this.currentUser.uid);
    if (saveIndex > -1) {
      post.saves.splice(saveIndex, 1);
    } else {
      post.saves.push(this.currentUser.uid);
    }

    updateDoc(doc(db, 'posts', post.id), cleanForFirestore({ saves: post.saves })).catch(console.error);
    this.notify();
  }

  public async updatePost(
    postId: string,
    updates: { content?: string; category?: Post['category']; imageUrl?: string }
  ): Promise<boolean> {
    const firebaseAuthUid = auth.currentUser?.uid || this.currentUser?.firebaseUid || this.currentUser?.uid;
    if (!firebaseAuthUid) {
      throw new Error("You must be signed in to edit a post.");
    }

    const targetPost = this.posts.find(p => p.id === postId);
    if (!targetPost) {
      throw new Error("Post not found.");
    }

    if (!canEditContent(targetPost, this.currentUser, firebaseAuthUid)) {
      throw new Error("You do not have permission to edit this post.");
    }

    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };

    Object.assign(targetPost, updatedData);
    this.notify();

    try {
      await updateDoc(doc(db, 'posts', postId), cleanForFirestore(updatedData));
      return true;
    } catch (error: any) {
      console.error("Error updating post in Firestore:", error);
      if (error?.code === 'permission-denied' || error?.message?.includes('permissions')) {
        throw new Error("Permission denied: You are not authorized to edit this post.");
      }
      throw new Error(error?.message || "Unable to update post. Please try again.");
    }
  }

  public async updateProject(
    projectId: string,
    updates: {
      title?: string;
      description?: string;
      rolesNeeded?: string[];
      preferredCampus?: "Any" | CampusName;
      isHackathon?: boolean;
      hackathonName?: string;
    }
  ): Promise<boolean> {
    const firebaseAuthUid = auth.currentUser?.uid || this.currentUser?.firebaseUid || this.currentUser?.uid;
    if (!firebaseAuthUid) {
      throw new Error("You must be signed in to edit a project.");
    }

    const targetProj = this.projects.find(p => p.id === projectId);
    if (!targetProj) {
      throw new Error("Project not found.");
    }

    if (!canEditContent(targetProj, this.currentUser, firebaseAuthUid)) {
      throw new Error("You do not have permission to edit this project.");
    }

    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };

    Object.assign(targetProj, updatedData);
    this.notify();

    try {
      await updateDoc(doc(db, 'projects', projectId), cleanForFirestore(updatedData));
      return true;
    } catch (error: any) {
      console.error("Error updating project in Firestore:", error);
      if (error?.code === 'permission-denied' || error?.message?.includes('permissions')) {
        throw new Error("Permission denied: You are not authorized to edit this project.");
      }
      throw new Error(error?.message || "Unable to update project. Please try again.");
    }
  }

  public async updateOpportunity(
    oppId: string,
    updates: {
      title?: string;
      organization?: string;
      category?: Opportunity['category'];
      description?: string;
      location?: string;
      deadline?: string;
      externalLink?: string;
      tags?: string[];
    }
  ): Promise<boolean> {
    const firebaseAuthUid = auth.currentUser?.uid || this.currentUser?.firebaseUid || this.currentUser?.uid;
    if (!firebaseAuthUid) {
      throw new Error("You must be signed in to edit an opportunity.");
    }

    const targetOpp = this.opportunities.find(o => o.id === oppId);
    if (!targetOpp) {
      throw new Error("Opportunity not found.");
    }

    if (!canEditContent(targetOpp, this.currentUser, firebaseAuthUid)) {
      throw new Error("You do not have permission to edit this opportunity.");
    }

    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString()
    };

    Object.assign(targetOpp, updatedData);
    this.notify();

    try {
      await updateDoc(doc(db, 'opportunities', oppId), cleanForFirestore(updatedData));
      return true;
    } catch (error: any) {
      console.error("Error updating opportunity in Firestore:", error);
      if (error?.code === 'permission-denied' || error?.message?.includes('permissions')) {
        throw new Error("Permission denied: You are not authorized to edit this opportunity.");
      }
      throw new Error(error?.message || "Unable to update opportunity. Please try again.");
    }
  }

  public async deletePost(postId: string): Promise<boolean> {
    const firebaseAuthUid = auth.currentUser?.uid || this.currentUser?.firebaseUid || this.currentUser?.uid;
    if (!firebaseAuthUid) {
      throw new Error("You must be signed in to delete a post.");
    }

    const targetPost = this.posts.find(p => p.id === postId);
    if (!targetPost) {
      return true;
    }

    if (!canManagePost(targetPost, this.currentUser, firebaseAuthUid)) {
      throw new Error("You do not have permission to delete this post.");
    }

    const previousPosts = [...this.posts];
    this.posts = this.posts.filter(p => p.id !== postId);
    this.notify();

    try {
      await deleteDoc(doc(db, 'posts', postId));
      return true;
    } catch (error: any) {
      console.error("Error deleting post from Firestore:", error);
      this.posts = previousPosts;
      this.notify();
      if (error?.code === 'permission-denied' || error?.message?.includes('permissions')) {
        throw new Error("Permission denied: You are not authorized to delete this post.");
      }
      throw new Error(error?.message || "Unable to delete post. Please try again.");
    }
  }

  public async deleteProject(projectId: string): Promise<boolean> {
    const firebaseAuthUid = auth.currentUser?.uid || this.currentUser?.firebaseUid || this.currentUser?.uid;
    if (!firebaseAuthUid) {
      throw new Error("You must be signed in to delete a post.");
    }

    const targetProj = this.projects.find(p => p.id === projectId);
    if (!targetProj) {
      return true;
    }

    if (!canManagePost(targetProj, this.currentUser, firebaseAuthUid)) {
      throw new Error("You do not have permission to delete this post.");
    }

    const previousProjects = [...this.projects];
    this.projects = this.projects.filter(p => p.id !== projectId);
    this.notify();

    try {
      await deleteDoc(doc(db, 'projects', projectId));
      return true;
    } catch (error: any) {
      console.error("Error deleting project requirement from Firestore:", error);
      this.projects = previousProjects;
      this.notify();
      if (error?.code === 'permission-denied' || error?.message?.includes('permissions')) {
        throw new Error("Permission denied: You are not authorized to delete this post.");
      }
      throw new Error(error?.message || "Unable to delete post. Please try again.");
    }
  }

  public async deleteOpportunity(oppId: string): Promise<boolean> {
    const firebaseAuthUid = auth.currentUser?.uid || this.currentUser?.firebaseUid || this.currentUser?.uid;
    if (!firebaseAuthUid) {
      throw new Error("You must be signed in to delete a post.");
    }

    const targetOpp = this.opportunities.find(o => o.id === oppId);
    if (!targetOpp) {
      return true;
    }

    if (!canManagePost(targetOpp, this.currentUser, firebaseAuthUid)) {
      throw new Error("You do not have permission to delete this post.");
    }

    const previousOpps = [...this.opportunities];
    this.opportunities = this.opportunities.filter(o => o.id !== oppId);
    this.notify();

    try {
      await deleteDoc(doc(db, 'opportunities', oppId));
      return true;
    } catch (error: any) {
      console.error("Error deleting opportunity from Firestore:", error);
      this.opportunities = previousOpps;
      this.notify();
      if (error?.code === 'permission-denied' || error?.message?.includes('permissions')) {
        throw new Error("Permission denied: You are not authorized to delete this post.");
      }
      throw new Error(error?.message || "Unable to delete post. Please try again.");
    }
  }

  public async deleteActivityItem(id: string, collectionName: 'posts' | 'projects' | 'opportunities'): Promise<boolean> {
    if (collectionName === 'posts') return this.deletePost(id);
    if (collectionName === 'projects') return this.deleteProject(id);
    if (collectionName === 'opportunities') return this.deleteOpportunity(id);
    throw new Error("Invalid collection type.");
  }

  // --- Projects ---

  public getProjects(): ProjectRequirement[] {
    return this.projects;
  }

  public createProject(
    title: string,
    description: string,
    rolesNeeded: string[],
    preferredCampus: "Any" | CampusName,
    isHackathon: boolean,
    hackathonName?: string
  ) {
    if (!this.currentUser) return;
    const activeUid = auth.currentUser?.uid || this.currentUser.firebaseUid || this.currentUser.uid;
    const newProj: ProjectRequirement = {
      id: `proj_${Date.now()}`,
      creatorId: activeUid,
      ownerUid: activeUid,
      creatorName: this.currentUser.name,
      creatorAvatar: this.currentUser.avatar,
      creatorCampus: this.currentUser.campus,
      title,
      description,
      rolesNeeded,
      preferredCampus,
      isHackathon,
      hackathonName,
      status: "open",
      applicantsCount: 0,
      applicants: [],
      createdAt: new Date().toISOString()
    };

    this.projects.unshift(newProj);
    setDoc(doc(db, 'projects', newProj.id), cleanForFirestore(newProj)).catch(console.error);
    this.notify();
  }

  public applyToProject(projectId: string, roleApplied: string, message: string) {
    if (!this.currentUser) return;
    const proj = this.projects.find(p => p.id === projectId);
    if (!proj) return;

    const existing = proj.applicants.find(a => a.userId === this.currentUser!.uid);
    if (existing) return;

    const applicant = {
      userId: this.currentUser.uid,
      userName: this.currentUser.name,
      userCampus: this.currentUser.campus,
      userYear: this.currentUser.year,
      userBranch: this.currentUser.branch,
      roleApplied,
      message,
      status: "pending" as const,
      createdAt: new Date().toISOString()
    };

    proj.applicants.push(applicant);
    proj.applicantsCount = proj.applicants.length;

    if (proj.creatorId !== this.currentUser.uid) {
      const notif: NotificationItem = {
        id: `n_${Date.now()}`,
        userId: proj.creatorId,
        actorId: this.currentUser.uid,
        actorName: this.currentUser.name,
        actorAvatar: this.currentUser.avatar,
        type: "project_application",
        targetId: proj.id,
        message: `applied for "${roleApplied}" in your project "${proj.title}"`,
        read: false,
        createdAt: new Date().toISOString()
      };
      this.notifications.unshift(notif);
      setDoc(doc(db, 'notifications', notif.id), cleanForFirestore(notif)).catch(console.error);
    }

    updateDoc(doc(db, 'projects', proj.id), cleanForFirestore({ applicants: proj.applicants, applicantsCount: proj.applicantsCount })).catch(console.error);
    this.notify();
  }

  // --- Opportunities ---

  public getOpportunities(): Opportunity[] {
    return this.opportunities;
  }

  public createOpportunity(
    title: string,
    organization: string,
    category: Opportunity['category'],
    description: string,
    location: string,
    deadline: string,
    externalLink: string,
    tags: string[]
  ) {
    if (!this.currentUser) return;
    const activeUid = auth.currentUser?.uid || this.currentUser.firebaseUid || this.currentUser.uid;
    const newOpp: Opportunity = {
      id: `opp_${Date.now()}`,
      title,
      organization,
      category,
      description,
      location,
      deadline,
      externalLink,
      postedBy: this.currentUser.name,
      postedByCampus: this.currentUser.campus,
      ownerUid: activeUid,
      authorUid: activeUid,
      tags,
      createdAt: new Date().toISOString()
    };

    this.opportunities.unshift(newOpp);
    setDoc(doc(db, 'opportunities', newOpp.id), cleanForFirestore(newOpp)).catch(console.error);
    this.notify();
  }

  // --- Messages ---

  public getMessagesWith(otherUserId: string): Message[] {
    if (!this.currentUser) return [];
    return this.messages
      .filter(
        m =>
          (m.senderId === this.currentUser!.uid && m.receiverId === otherUserId) ||
          (m.senderId === otherUserId && m.receiverId === this.currentUser!.uid)
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  public getChatMessages(otherUserId: string): Message[] {
    return this.getMessagesWith(otherUserId);
  }

  public getAllMessages(): Message[] {
    return this.messages;
  }

  public markChatAsRead(otherUserId: string) {
    if (!this.currentUser) return;
    let changed = false;
    this.messages.forEach(m => {
      if (m.senderId === otherUserId && m.receiverId === this.currentUser!.uid && !m.read) {
        m.read = true;
        changed = true;
        updateDoc(doc(db, 'messages', m.id), cleanForFirestore({ read: true })).catch(console.error);
      }
    });
    if (changed) {
      this.notify();
    }
  }

  public sendMessage(receiverId: string, content: string) {
    if (!this.currentUser || !content.trim()) return;

    const newMsg: Message = {
      id: `m_${Date.now()}`,
      senderId: this.currentUser.uid,
      receiverId,
      content: content.trim(),
      read: false,
      createdAt: new Date().toISOString()
    };

    this.messages.push(newMsg);
    setDoc(doc(db, 'messages', newMsg.id), cleanForFirestore(newMsg)).catch(console.error);

    const notif: NotificationItem = {
      id: `n_${Date.now()}`,
      userId: receiverId,
      actorId: this.currentUser.uid,
      actorName: this.currentUser.name,
      actorAvatar: this.currentUser.avatar,
      type: "new_message",
      message: `sent you a new message: "${content.slice(0, 30)}..."`,
      read: false,
      createdAt: new Date().toISOString()
    };
    this.notifications.unshift(notif);
    setDoc(doc(db, 'notifications', notif.id), cleanForFirestore(notif)).catch(console.error);

    this.notify();
  }

  // --- Notifications ---

  public getNotifications(): NotificationItem[] {
    if (!this.currentUser) return [];
    return this.notifications.filter(n => n.userId === this.currentUser!.uid);
  }

  public markNotificationAsRead(id: string) {
    const item = this.notifications.find(n => n.id === id);
    if (item) {
      item.read = true;
      updateDoc(doc(db, 'notifications', id), cleanForFirestore({ read: true })).catch(console.error);
      this.notify();
    }
  }

  public markAllNotificationsRead() {
    if (!this.currentUser) return;
    this.notifications.forEach(n => {
      if (n.userId === this.currentUser!.uid) {
        n.read = true;
        updateDoc(doc(db, 'notifications', n.id), cleanForFirestore({ read: true })).catch(console.error);
      }
    });
    this.notify();
  }

  // --- Admin & Safety ---

  public getApprovedStudents(): ApprovedStudent[] {
    return this.approvedStudents;
  }

  public addApprovedStudent(student: ApprovedStudent) {
    this.approvedStudents.push(student);
    const safeDocId = student.studentId.toUpperCase().replace(/[\/\s\\#\?]/g, '_').slice(0, 50);
    setDoc(doc(db, 'approved_students', safeDocId), cleanForFirestore(student), { merge: true }).catch(console.error);
    this.notify();
  }

  public updateStudentStatus(studentId: string, status: ApprovedStudent['status']) {
    const student = this.approvedStudents.find(s => s.studentId === studentId);
    if (student) {
      student.status = status;
      const safeDocId = studentId.toUpperCase().replace(/[\/\s\\#\?]/g, '_').slice(0, 50);
      updateDoc(doc(db, 'approved_students', safeDocId), cleanForFirestore({ status })).catch(console.error);

      if (student.registeredUid) {
        updateDoc(doc(db, 'users', student.registeredUid), cleanForFirestore({ status })).catch(console.error);
      }
      this.notify();
    }
  }

  public getCampusStats(campusName: CampusName) {
    const approved = this.approvedStudents.filter(s => s.campus === campusName);
    const registered = this.profiles.filter(p => p.campus === campusName);
    const posts = this.posts.filter(p => p.authorCampus === campusName);
    const projects = this.projects.filter(p => p.creatorCampus === campusName);

    return {
      campusName,
      approvedCount: approved.length,
      registeredCount: registered.length,
      postsCount: posts.length,
      projectsCount: projects.length,
      activeRate: approved.length > 0 ? Math.round((registered.length / approved.length) * 100) : 0
    };
  }

  public createReport(targetType: ReportItem['targetType'], targetId: string, reason: string) {
    if (!this.currentUser) return;
    const rep: ReportItem = {
      id: `rep_${Date.now()}`,
      reporterId: this.currentUser.uid,
      targetType,
      targetId,
      reason,
      status: "pending",
      createdAt: new Date().toISOString()
    };
    this.reports.push(rep);
    setDoc(doc(db, 'reports', rep.id), cleanForFirestore(rep)).catch(console.error);
    this.notify();
  }

  // --- Student Hub / Showcases ---

  public getStudentShowcases(includeExpired: boolean = false, includeHidden: boolean = false): StudentShowcase[] {
    const now = Date.now();
    return (this.showcases || []).filter(sc => {
      if (!sc) return false;
      if (!includeHidden && sc.status === 'hidden') return false;
      const isExpired = new Date(sc.expiresAt).getTime() <= now || sc.status === 'expired';
      if (includeExpired) return true;
      return !isExpired && sc.status === 'active';
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getUserActiveShowcase(userId: string): StudentShowcase | undefined {
    const now = Date.now();
    return (this.showcases || []).find(sc => 
      sc && (sc.userId === userId || sc.ownerUid === userId) && 
      sc.status === 'active' && 
      new Date(sc.expiresAt).getTime() > now
    );
  }

  public isLikedShowcase(showcaseId: string): boolean {
    const activeUid = auth.currentUser?.uid || this.currentUser?.firebaseUid || this.currentUser?.uid;
    if (!activeUid) return false;
    const sc = (this.showcases || []).find(s => s && s.id === showcaseId);
    return Boolean(sc?.likes && sc.likes.includes(activeUid));
  }

  public isSavedShowcase(showcaseId: string): boolean {
    const activeUid = auth.currentUser?.uid || this.currentUser?.firebaseUid || this.currentUser?.uid;
    if (!activeUid) return false;
    const sc = (this.showcases || []).find(s => s && s.id === showcaseId);
    return Boolean(sc?.saves && sc.saves.includes(activeUid));
  }

  public async toggleLikeShowcase(showcaseId: string): Promise<{ liked: boolean; count: number }> {
    const activeUid = auth.currentUser?.uid || this.currentUser?.firebaseUid || this.currentUser?.uid;
    if (!activeUid) {
      throw new Error("Please sign in to like this project showcase.");
    }

    const sc = (this.showcases || []).find(s => s && s.id === showcaseId);
    if (!sc) {
      throw new Error("Showcase not found.");
    }

    const likesList = Array.isArray(sc.likes) ? [...sc.likes] : [];
    const isLiked = likesList.includes(activeUid);

    let updatedLikes: string[];
    if (isLiked) {
      updatedLikes = likesList.filter(id => id !== activeUid);
    } else {
      updatedLikes = [...likesList, activeUid];
    }

    const likesCount = updatedLikes.length;
    sc.likes = updatedLikes;
    sc.likesCount = likesCount;

    setLocal(STORAGE_KEYS.STUDENT_SHOWCASES, this.showcases);
    this.notify();

    try {
      await updateDoc(doc(db, 'studentShowcases', showcaseId), cleanForFirestore({
        likes: updatedLikes,
        likesCount
      }));
    } catch (err) {
      console.warn("Error updating showcase like in Firestore (non-fatal):", err);
    }

    return { liked: !isLiked, count: likesCount };
  }

  public async toggleSaveShowcase(showcaseId: string): Promise<{ saved: boolean }> {
    const activeUid = auth.currentUser?.uid || this.currentUser?.firebaseUid || this.currentUser?.uid;
    if (!activeUid) {
      throw new Error("Please sign in to save this project showcase.");
    }

    const sc = (this.showcases || []).find(s => s && s.id === showcaseId);
    if (!sc) {
      throw new Error("Showcase not found.");
    }

    const savesList = Array.isArray(sc.saves) ? [...sc.saves] : [];
    const isSaved = savesList.includes(activeUid);

    let updatedSaves: string[];
    if (isSaved) {
      updatedSaves = savesList.filter(id => id !== activeUid);
    } else {
      updatedSaves = [...savesList, activeUid];
    }

    const savesCount = updatedSaves.length;
    sc.saves = updatedSaves;
    sc.savesCount = savesCount;

    setLocal(STORAGE_KEYS.STUDENT_SHOWCASES, this.showcases);
    this.notify();

    try {
      await updateDoc(doc(db, 'studentShowcases', showcaseId), cleanForFirestore({
        saves: updatedSaves,
        savesCount
      }));
    } catch (err) {
      console.warn("Error updating showcase save in Firestore (non-fatal):", err);
    }

    return { saved: !isSaved };
  }

  public async recordShowcaseView(showcaseId: string): Promise<void> {
    const sc = (this.showcases || []).find(s => s && s.id === showcaseId);
    if (!sc) return;

    // Session cache check to avoid duplicating views in same browser session
    const sessionKey = `viewed_sc_${showcaseId}`;
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(sessionKey)) {
      return;
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(sessionKey, '1');
    }

    const activeUid = auth.currentUser?.uid || this.currentUser?.firebaseUid || this.currentUser?.uid;
    const viewedByList = Array.isArray(sc.viewedBy) ? [...sc.viewedBy] : [];
    if (activeUid && !viewedByList.includes(activeUid)) {
      viewedByList.push(activeUid);
    }

    const currentViews = Number(sc.viewsCount) || 0;
    const newViewsCount = currentViews + 1;

    sc.viewsCount = newViewsCount;
    sc.viewedBy = viewedByList;

    setLocal(STORAGE_KEYS.STUDENT_SHOWCASES, this.showcases);
    this.notify();

    try {
      await updateDoc(doc(db, 'studentShowcases', showcaseId), cleanForFirestore({
        viewsCount: newViewsCount,
        viewedBy: viewedByList
      }));
    } catch (err) {
      console.warn("Error recording showcase view in Firestore (non-fatal):", err);
    }
  }

  public async reportShowcase(showcaseId: string, reason: string, details?: string): Promise<void> {
    const activeUid = auth.currentUser?.uid || this.currentUser?.firebaseUid || this.currentUser?.uid;
    if (!activeUid) {
      throw new Error("Please sign in to report content.");
    }

    const sc = (this.showcases || []).find(s => s && s.id === showcaseId);
    const reportId = `rep_${Date.now()}`;
    const reportItem = {
      id: reportId,
      reporterId: activeUid,
      reporterName: this.currentUser?.name || 'Anonymous Student',
      targetType: 'showcase' as const,
      targetId: showcaseId,
      targetTitle: sc?.projectTitle || 'Student Project Showcase',
      reason,
      details: details || '',
      status: 'pending' as const,
      createdAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(db, 'reports', reportId), cleanForFirestore(reportItem));
      if (sc) {
        sc.reportsCount = (Number(sc.reportsCount) || 0) + 1;
        setLocal(STORAGE_KEYS.STUDENT_SHOWCASES, this.showcases);
        this.notify();
        await updateDoc(doc(db, 'studentShowcases', showcaseId), {
          reportsCount: sc.reportsCount
        });
      }
    } catch (err: any) {
      console.error("Error submitting report:", err);
      throw new Error(err?.message || "Failed to submit report. Please try again.");
    }
  }

  public async hideShowcaseAdmin(showcaseId: string, hidden: boolean): Promise<void> {
    const isAdmin = isAuthorizedAdmin(this.currentUser, auth.currentUser);
    if (!isAdmin) {
      throw new Error("Admin authorization required.");
    }

    const sc = (this.showcases || []).find(s => s && s.id === showcaseId);
    if (!sc) return;

    sc.status = hidden ? 'hidden' : 'active';
    setLocal(STORAGE_KEYS.STUDENT_SHOWCASES, this.showcases);
    this.notify();

    try {
      await updateDoc(doc(db, 'studentShowcases', showcaseId), {
        status: sc.status
      });
    } catch (err: any) {
      console.error("Error toggling showcase visibility:", err);
      throw new Error(err?.message || "Failed to update showcase visibility.");
    }
  }

  public async createStudentShowcase(data: Omit<StudentShowcase, 'id' | 'createdAt' | 'expiresAt' | 'status' | 'userId' | 'ownerUid'>): Promise<StudentShowcase> {
    if (!this.currentUser) {
      throw new Error("You must be logged in to publish a showcase.");
    }

    const activeUid = auth.currentUser?.uid || this.currentUser.firebaseUid || this.currentUser.uid;
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const newShowcase: StudentShowcase = {
      id: `sc_${Date.now()}`,
      userId: activeUid,
      ownerUid: activeUid,
      studentName: data.studentName || this.currentUser.name,
      profileImage: data.profileImage || this.currentUser.avatar,
      campus: data.campus || this.currentUser.campus,
      batch: data.batch || `${this.currentUser.year} (${this.currentUser.branch})`,
      skills: data.skills || [],
      technologies: data.technologies || [],
      projectTitle: data.projectTitle,
      projectDescription: data.projectDescription,
      projectImage: data.projectImage || '',
      videoUrl: data.videoUrl || '',
      videoDuration: data.videoDuration || 0,
      thumbnailUrl: data.thumbnailUrl || '',
      category: data.category || 'Web Application',
      githubUrl: data.githubUrl || '',
      liveUrl: data.liveUrl || '',
      teamMembers: data.teamMembers || [],
      likes: [],
      likesCount: 0,
      saves: [],
      savesCount: 0,
      viewsCount: 0,
      viewedBy: [],
      achievements: data.achievements || '',
      lookingFor: data.lookingFor || [],
      teammateSkills: data.teammateSkills || [],
      about: data.about || '',
      createdAt,
      expiresAt,
      status: 'active',
      reportsCount: 0
    };

    this.showcases = (this.showcases || []).filter(s => !(s && (s.userId === activeUid || s.ownerUid === activeUid) && s.status === 'active'));
    this.showcases.unshift(newShowcase);
    setLocal(STORAGE_KEYS.STUDENT_SHOWCASES, this.showcases);
    this.notify();

    try {
      await setDoc(doc(db, 'studentShowcases', newShowcase.id), cleanForFirestore(newShowcase));
      return newShowcase;
    } catch (err: any) {
      console.error("Error creating student showcase in Firestore:", err);
      throw new Error(err?.message || "Failed to publish showcase to database.");
    }
  }

  public async updateStudentShowcase(id: string, updates: Partial<StudentShowcase>): Promise<void> {
    const activeUid = auth.currentUser?.uid || this.currentUser?.firebaseUid || this.currentUser?.uid;
    if (!activeUid) {
      throw new Error("Authentication required.");
    }

    const sc = this.showcases.find(s => s && s.id === id);
    if (!sc) {
      throw new Error("Showcase not found.");
    }

    const isAdmin = isAuthorizedAdmin(this.currentUser, auth.currentUser);
    if (!isAdmin && sc.userId !== activeUid && sc.ownerUid !== activeUid) {
      throw new Error("Unauthorized to edit this showcase.");
    }

    Object.assign(sc, updates);
    setLocal(STORAGE_KEYS.STUDENT_SHOWCASES, this.showcases);
    this.notify();

    try {
      await updateDoc(doc(db, 'studentShowcases', id), cleanForFirestore(updates));
    } catch (err: any) {
      console.error("Error updating student showcase in Firestore:", err);
      throw new Error(err?.message || "Failed to update showcase in database.");
    }
  }

  public purgeStudentLocalData(uid: string, studentId?: string): void {
    if (!uid) return;
    const cleanId = (studentId || '').toUpperCase().trim();

    // 1. Remove from profiles
    this.profiles = this.profiles.filter(p => p && p.uid !== uid && (cleanId ? (p.studentId || '').toUpperCase() !== cleanId : true));
    setLocal(STORAGE_KEYS.PROFILES, this.profiles);

    // 2. Remove user-owned posts
    this.posts = this.posts.filter(p => p && p.authorId !== uid && p.ownerUid !== uid);
    setLocal(STORAGE_KEYS.POSTS, this.posts);

    // 3. Remove user-owned projects
    this.projects = this.projects.filter(p => p && p.creatorId !== uid && p.ownerUid !== uid);
    setLocal(STORAGE_KEYS.PROJECTS, this.projects);

    // 4. Remove user-owned opportunities
    this.opportunities = this.opportunities.filter(o => o && o.authorUid !== uid && o.ownerUid !== uid);
    setLocal(STORAGE_KEYS.OPPORTUNITIES, this.opportunities);

    // 5. Remove connections involving user
    this.connections = this.connections.filter(c => c && c.senderId !== uid && c.receiverId !== uid);
    setLocal(STORAGE_KEYS.CONNECTIONS, this.connections);

    // 6. Remove messages involving user
    this.messages = this.messages.filter(m => m && m.senderId !== uid && m.receiverId !== uid);
    setLocal(STORAGE_KEYS.MESSAGES, this.messages);

    // 7. Remove showcases
    this.showcases = this.showcases.filter(s => s && s.userId !== uid && s.ownerUid !== uid);
    setLocal(STORAGE_KEYS.STUDENT_SHOWCASES, this.showcases);

    // 8. Remove notifications
    this.notifications = this.notifications.filter(n => n && n.userId !== uid && n.actorId !== uid);
    setLocal(STORAGE_KEYS.NOTIFICATIONS, this.notifications);

    // 9. If deleted user was current user, log out
    if (this.currentUser && (this.currentUser.uid === uid || (cleanId && (this.currentUser.studentId || '').toUpperCase() === cleanId))) {
      this.currentUser = null;
      setLocal(STORAGE_KEYS.CURRENT_USER, null);
    }

    this.notify();
  }

  public async deleteStudentShowcase(id: string): Promise<void> {
    const activeUid = auth.currentUser?.uid || this.currentUser?.firebaseUid || this.currentUser?.uid;
    if (!activeUid) {
      throw new Error("Authentication required.");
    }

    const sc = this.showcases.find(s => s && s.id === id);
    if (!sc) return;

    const isAdmin = isAuthorizedAdmin(this.currentUser, auth.currentUser);
    if (!isAdmin && sc.userId !== activeUid && sc.ownerUid !== activeUid) {
      throw new Error("Unauthorized to delete this showcase.");
    }

    this.showcases = this.showcases.filter(s => s && s.id !== id);
    setLocal(STORAGE_KEYS.STUDENT_SHOWCASES, this.showcases);
    this.notify();

    try {
      await deleteDoc(doc(db, 'studentShowcases', id));
    } catch (err: any) {
      console.error("Error deleting student showcase from Firestore:", err);
    }
  }
}

export const storage = new StorageService();
