import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where,
  writeBatch 
} from 'firebase/firestore';
import { db, auth, cleanForFirestore } from '../lib/firebase';
import { ApprovedStudent } from '../types';
import { FORMATTED_ANNAMACHARYA_STUDENTS } from '../data/annamacharyaStudents';
import { isAuthorizedAdmin } from '../utils/adminAuth';

// Approved student database records (Annamacharya student roster)
export const SEED_APPROVED_STUDENTS: ApprovedStudent[] = [
  ...FORMATTED_ANNAMACHARYA_STUDENTS
];

let seedingInProgress: Promise<{ seededCount: number; success: boolean }> | null = null;

/**
 * Seeds the `approved_students` collection in Firestore with records for Annamacharya campus roster.
 * Restricted to authenticated Administrators to comply with Firestore security rules.
 */
export async function seedApprovedStudentsInFirestore(force: boolean = false): Promise<{ seededCount: number; success: boolean }> {
  const SEED_CACHE_KEY = 'campuslink_approved_students_seeded_v1';
  try {
    if (!force && typeof localStorage !== 'undefined' && localStorage.getItem(SEED_CACHE_KEY) === 'true') {
      return { seededCount: 0, success: true };
    }
  } catch (_) {}

  // Prevent unauthorized Firestore write attempts
  const firebaseUser = auth.currentUser;
  if (!firebaseUser || !isAuthorizedAdmin(null, firebaseUser)) {
    return { seededCount: 0, success: true };
  }

  if (seedingInProgress && !force) {
    return seedingInProgress;
  }

  seedingInProgress = (async () => {
    try {
      const colRef = collection(db, 'approved_students');
      const snapshot = await getDocs(colRef);
      const existingDocIds = new Set(snapshot.docs.map(d => d.id));

      const batchSize = 400;
      let totalSeeded = 0;

      for (let i = 0; i < SEED_APPROVED_STUDENTS.length; i += batchSize) {
        const chunk = SEED_APPROVED_STUDENTS.slice(i, i + batchSize);
        const batch = writeBatch(db);
        let countInBatch = 0;

        for (const student of chunk) {
          const studentIdUpper = student.studentId.toUpperCase();
          const safeDocId = studentIdUpper.replace(/[\/\s\\#\?]/g, '_').slice(0, 50);
          const inviteCode = student.invitationCode || `CL-${studentIdUpper.slice(-6)}`;

          if (!existingDocIds.has(safeDocId)) {
            const docRef = doc(db, 'approved_students', safeDocId);
            batch.set(docRef, cleanForFirestore({
              studentId: studentIdUpper,
              name: student.name,
              email: student.email || `${student.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@annamacharya.niat.edu`,
              campus: student.campus,
              year: student.year,
              section: student.section,
              branch: student.branch,
              status: student.status || 'active',
              invitationCode: inviteCode,
              invitationUsed: false,
              updatedAt: new Date().toISOString()
            }));
            existingDocIds.add(safeDocId);
            countInBatch++;
          } else if (force) {
            const docRef = doc(db, 'approved_students', safeDocId);
            batch.set(docRef, cleanForFirestore({
              studentId: studentIdUpper,
              name: student.name,
              campus: student.campus,
              year: student.year,
              section: student.section,
              branch: student.branch,
              updatedAt: new Date().toISOString()
            }), { merge: true });
            countInBatch++;
          }
        }

        if (countInBatch > 0) {
          await batch.commit();
          totalSeeded += countInBatch;
        }
      }

      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(SEED_CACHE_KEY, 'true');
        }
      } catch (_) {}

      return { seededCount: totalSeeded || snapshot.size, success: true };
    } catch (err) {
      console.warn('[Firestore] Notice while syncing approved_students collection:', err);
      return { seededCount: 0, success: false };
    }
  })();

  return seedingInProgress;
}

/**
 * Validates a user-provided student ID or Name against the `approved_students` Firestore collection.
 */
export async function validateStudentIdInFirestore(queryInput: string): Promise<{
  success: boolean;
  studentRecord?: ApprovedStudent;
  message: string;
  source: 'firestore' | 'fallback';
}> {
  const clean = queryInput.trim();
  if (!clean) {
    return {
      success: false,
      message: 'Please provide a valid Student ID or Name.',
      source: 'firestore'
    };
  }

  const cleanUpper = clean.toUpperCase();
  const cleanLower = clean.toLowerCase();

  // If user is authenticated, query Firestore first
  if (auth.currentUser) {
    try {
      // 1. Direct document lookup by ID
      const safeDocId = cleanUpper.replace(/[\/\s\\#\?]/g, '_').slice(0, 50);
      const docRef = doc(db, 'approved_students', safeDocId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as ApprovedStudent;
        return {
          success: true,
          studentRecord: data,
          message: `Validated via Firestore: ${data.name} (${data.studentId}) - ${data.campus}`,
          source: 'firestore'
        };
      }

      // 2. Query search by studentId or name or email in Firestore
      const colRef = collection(db, 'approved_students');
      const qById = query(colRef, where('studentId', '==', cleanUpper));
      const snapById = await getDocs(qById);

      if (!snapById.empty) {
        const data = snapById.docs[0].data() as ApprovedStudent;
        return {
          success: true,
          studentRecord: data,
          message: `Validated via Firestore: ${data.name} (${data.studentId}) - ${data.campus}`,
          source: 'firestore'
        };
      }

      // Search by exact name
      const qByName = query(colRef, where('name', '==', clean));
      const snapByName = await getDocs(qByName);

      if (!snapByName.empty) {
        const data = snapByName.docs[0].data() as ApprovedStudent;
        return {
          success: true,
          studentRecord: data,
          message: `Validated via Firestore: ${data.name} (${data.studentId}) - ${data.campus}`,
          source: 'firestore'
        };
      }
    } catch (err) {
      console.debug('[Firestore] Direct query fallback to local database:', err);
    }
  }

  // Fallback to local verified roster
  const localMatch = SEED_APPROVED_STUDENTS.find(
    s => s.studentId.toLowerCase() === cleanLower ||
         s.name.toLowerCase() === cleanLower ||
         s.name.toLowerCase().includes(cleanLower) ||
         (s.email && s.email.toLowerCase() === cleanLower)
  );

  if (localMatch) {
    return {
      success: true,
      studentRecord: localMatch,
      message: `Validated: ${localMatch.name} (${localMatch.studentId}) - ${localMatch.campus}`,
      source: 'fallback'
    };
  }

  return {
    success: false,
    message: `Student ID or Name "${clean}" not found in approved students database.`,
    source: 'fallback'
  };
}
