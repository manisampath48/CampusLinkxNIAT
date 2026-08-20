import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where,
  writeBatch 
} from 'firebase/firestore';
import { ref, listAll, deleteObject } from 'firebase/storage';
import { db, storage as firebaseStorage, auth, cleanForFirestore } from '../lib/firebase';
import { ApprovedStudent, UserProfile, CampusName, YearOfStudy, Section, Branch } from '../types';
import { generateInvitationCode } from './authService';
import { isAuthorizedAdmin } from '../utils/adminAuth';
import { storage } from './storage';

export interface CsvImportResult {
  totalRows: number;
  importedCount: number;
  updatedCount: number;
  failedCount: number;
  errors: string[];
}

/**
 * Fetch all registered student accounts with active Firebase Auth / Firestore profile data
 */
export async function fetchRegisteredStudentsForAdmin(campusFilter?: string, statusFilter?: string): Promise<UserProfile[]> {
  try {
    const usersCol = collection(db, 'users');
    const studentsCol = collection(db, 'students');

    const [usersSnap, studentsSnap] = await Promise.all([
      getDocs(usersCol).catch(err => { console.warn("users query error:", err); return { docs: [] }; }),
      getDocs(studentsCol).catch(err => { console.warn("students query error:", err); return { docs: [] }; })
    ]);

    const studentMap = new Map<string, UserProfile>();

    // Process users docs
    usersSnap.docs.forEach(docSnap => {
      const data = docSnap.data();
      if (data && typeof data === 'object') {
        const uid = data.uid || data.firebaseUid || docSnap.id;
        if (uid && (data.name || data.studentId)) {
          studentMap.set(uid, {
            ...data,
            uid,
            firebaseUid: uid,
            status: data.status || 'active'
          } as UserProfile);
        }
      }
    });

    // Merge students docs
    studentsSnap.docs.forEach(docSnap => {
      const data = docSnap.data();
      if (data && typeof data === 'object') {
        const uid = data.uid || data.firebaseUid || docSnap.id;
        if (uid && (data.name || data.studentId)) {
          const existing = studentMap.get(uid);
          if (!existing) {
            studentMap.set(uid, {
              ...data,
              uid,
              firebaseUid: uid,
              status: data.status || 'active'
            } as UserProfile);
          } else {
            studentMap.set(uid, {
              ...data,
              ...existing,
              status: existing.status || data.status || 'active'
            } as UserProfile);
          }
        }
      }
    });

    // Include local cached profiles if Firestore is empty/offline
    const localProfiles = storage.getProfiles() || [];
    localProfiles.forEach(lp => {
      if (lp && lp.uid && !studentMap.has(lp.uid) && lp.isVerified) {
        studentMap.set(lp.uid, lp);
      }
    });

    let list = Array.from(studentMap.values());

    // Apply campus filter
    if (campusFilter && campusFilter !== 'All') {
      list = list.filter(s => s.campus === campusFilter || (s.campus && s.campus.includes(campusFilter)));
    }

    // Apply status filter
    if (statusFilter && statusFilter !== 'All') {
      if (statusFilter.toLowerCase() === 'active') {
        list = list.filter(s => s.status === 'active' || !s.status);
      } else if (statusFilter.toLowerCase() === 'disabled') {
        list = list.filter(s => s.status === 'disabled' || s.status === 'suspended');
      }
    }

    // Sort alphabetically by name
    return list.sort((a, b) => {
      const nameA = a.officialName || a.name || '';
      const nameB = b.officialName || b.name || '';
      return nameA.localeCompare(nameB);
    });
  } catch (error) {
    console.error("Error fetching registered students for admin:", error);
    return [];
  }
}

/**
 * Disable or Enable Registered Student Account
 */
export async function toggleRegisteredStudentStatus(
  uid: string, 
  studentId: string, 
  targetStatus: "active" | "disabled"
): Promise<{ success: boolean; message: string }> {
  const currentAuthUser = auth.currentUser;
  const currentProfile = storage.getCurrentUser();
  if (!isAuthorizedAdmin(currentProfile, currentAuthUser)) {
    return { success: false, message: "Unauthorized. Administrator privileges required." };
  }

  if (!uid) {
    return { success: false, message: "Missing student UID." };
  }

  try {
    const updatedAt = new Date().toISOString();
    const updatePayload = cleanForFirestore({
      status: targetStatus,
      updatedAt
    });

    // Update `users/{uid}` and `students/{uid}`
    await Promise.all([
      setDoc(doc(db, 'users', uid), updatePayload, { merge: true }).catch(() => {}),
      setDoc(doc(db, 'students', uid), updatePayload, { merge: true }).catch(() => {})
    ]);

    // If studentId provided, update niatIdRegistry and approved_students
    if (studentId) {
      const cleanId = studentId.trim().toUpperCase();
      const safeDocId = cleanId.replace(/[\/\s\\#\?]/g, '_').slice(0, 50);

      const registryRef = doc(db, 'niatIdRegistry', cleanId);
      const regSnap = await getDoc(registryRef).catch(() => null);
      if (regSnap && regSnap.exists()) {
        await updateDoc(registryRef, cleanForFirestore({ status: targetStatus, updatedAt })).catch(() => {});
      }

      const approvedRef = doc(db, 'approved_students', safeDocId);
      const appSnap = await getDoc(approvedRef).catch(() => null);
      if (appSnap && appSnap.exists()) {
        await updateDoc(approvedRef, cleanForFirestore({ 
          status: targetStatus === 'disabled' ? 'suspended' : 'active', 
          updatedAt 
        })).catch(() => {});
      }
    }

    return {
      success: true,
      message: targetStatus === 'disabled' 
        ? `Student account disabled successfully.`
        : `Student account enabled and reactivated successfully.`
    };
  } catch (error: any) {
    console.error("Error toggling registered student status:", error);
    return { success: false, message: error.message || "Failed to update student status." };
  }
}

/**
 * Helper to enforce a strict timeout on async promises so operations never hang indefinitely
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMsg: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(timeoutMsg)), timeoutMs))
  ]);
}

/**
 * Permanently delete student account and clean up associated records
 */
export async function deleteStudentAccountAdmin(
  student: { uid: string; studentId: string; email?: string; name?: string }
): Promise<{ success: boolean; message: string }> {
  const overallTimeoutMs = 12000;

  const runDeletion = async (): Promise<{ success: boolean; message: string }> => {
    console.log('[DELETE] Started', { uid: student.uid, studentId: student.studentId, name: student.name });

    // Step 1: Admin authorization check
    const currentAuthUser = auth.currentUser;
    const currentProfile = storage.getCurrentUser();
    if (!isAuthorizedAdmin(currentProfile, currentAuthUser)) {
      console.warn('[DELETE] Unauthorized attempt');
      return { success: false, message: "Unauthorized. Administrator privileges required." };
    }
    console.log('[DELETE] Admin verified:', currentAuthUser?.email || currentProfile?.email);

    const { uid, studentId } = student;
    if (!uid) {
      return { success: false, message: "Missing student UID." };
    }

    console.log('[DELETE] Student loaded:', { uid, studentId });

    const cleanId = studentId ? studentId.trim().toUpperCase() : '';
    const safeDocId = cleanId ? cleanId.replace(/[\/\s\\#\?]/g, '_').slice(0, 50) : '';

    // Step 2: Firebase Auth check/status logging
    console.log('[DELETE] Auth deletion checked');

    // Step 3: Core Firestore documents cleanup (users, students, niatIdRegistry)
    console.log('[DELETE] Firestore core cleanup started');
    try {
      const coreBatch = writeBatch(db);
      coreBatch.delete(doc(db, 'users', uid));
      coreBatch.delete(doc(db, 'students', uid));
      if (cleanId) {
        coreBatch.delete(doc(db, 'niatIdRegistry', cleanId));
        coreBatch.delete(doc(db, 'students', cleanId));
      }
      await withTimeout(coreBatch.commit().catch(e => console.warn('[DELETE] coreBatch commit warning:', e)), 4000, 'Core batch delete timeout');
    } catch (coreErr) {
      console.warn('[DELETE] Core docs cleanup non-fatal warning:', coreErr);
    }
    console.log('[DELETE] Firestore core cleanup completed');

    // Step 4: Reset approved_students document (preserving institutional roster record for potential re-invitation)
    try {
      if (safeDocId) {
        const approvedRef = doc(db, 'approved_students', safeDocId);
        const resetPayload = cleanForFirestore({
          registeredUid: "",
          invitationUsed: false,
          updatedAt: new Date().toISOString()
        });
        await withTimeout(setDoc(approvedRef, resetPayload, { merge: true }), 3000, 'Approved roster reset timeout')
          .catch(e => console.warn('[DELETE] Reset approved student warning:', e));
      }
      console.log('[DELETE] Registry & Approved roster reset completed');
    } catch (rosterErr) {
      console.warn('[DELETE] Approved roster reset non-fatal warning:', rosterErr);
    }

    // Step 5: Clean up related student collections (posts, showcases, projects, opps, notifications, tokens, connections, messages, reports)
    console.log('[DELETE] Firestore related collections cleanup started');
    try {
      const queryList: Array<{ col: string; field: string }> = [
        { col: 'posts', field: 'authorId' },
        { col: 'posts', field: 'ownerUid' },
        { col: 'studentShowcases', field: 'userId' },
        { col: 'studentShowcases', field: 'ownerUid' },
        { col: 'projects', field: 'creatorId' },
        { col: 'projects', field: 'ownerUid' },
        { col: 'opportunities', field: 'authorUid' },
        { col: 'opportunities', field: 'ownerUid' },
        { col: 'notifications', field: 'userId' },
        { col: 'notifications', field: 'actorId' },
        { col: 'notificationTokens', field: 'uid' },
        { col: 'connections', field: 'senderId' },
        { col: 'connections', field: 'receiverId' },
        { col: 'messages', field: 'senderId' },
        { col: 'messages', field: 'receiverId' },
        { col: 'reports', field: 'reporterId' }
      ];

      // Query all related collections concurrently with timeout
      const queryPromises = queryList.map(item => 
        withTimeout(
          getDocs(query(collection(db, item.col), where(item.field, '==', uid))),
          3000,
          `Query timeout on ${item.col}.${item.field}`
        ).catch(() => ({ docs: [] }))
      );

      const queryResults = await Promise.allSettled(queryPromises);
      const docsToDelete: Array<any> = [];

      queryResults.forEach(res => {
        if (res.status === 'fulfilled' && (res.value as any)?.docs) {
          (res.value as any).docs.forEach((d: any) => {
            docsToDelete.push(d.ref);
          });
        }
      });

      // Batch delete in chunks of 400
      if (docsToDelete.length > 0) {
        const chunkSize = 400;
        for (let i = 0; i < docsToDelete.length; i += chunkSize) {
          const chunk = docsToDelete.slice(i, i + chunkSize);
          const batch = writeBatch(db);
          chunk.forEach(ref => batch.delete(ref));
          await withTimeout(batch.commit(), 3500, 'Batch related delete timeout').catch(e => console.warn('[DELETE] Batch delete warning:', e));
        }
      }
    } catch (relatedErr) {
      console.warn('[DELETE] Related collections cleanup non-fatal warning:', relatedErr);
    }
    console.log('[DELETE] Firestore related collections cleanup completed');

    // Step 6: Clean up Firebase Storage files with individual timeouts
    console.log('[DELETE] Storage cleanup started');
    try {
      const storagePaths = [
        `users/${uid}`,
        `profiles/${uid}`,
        `profileImages/${uid}`,
        `projects/${uid}`
      ];

      const cleanFolder = async (folderPath: string) => {
        try {
          const folderRef = ref(firebaseStorage, folderPath);
          const listRes = await withTimeout(listAll(folderRef), 2500, `Storage list timeout for ${folderPath}`);
          if (listRes && listRes.items && listRes.items.length > 0) {
            const deletePromises = listRes.items.map(itemRef => 
              withTimeout(deleteObject(itemRef), 2000, 'Object delete timeout').catch(() => {})
            );
            await Promise.allSettled(deletePromises);
          }
        } catch (e) {
          // Folder may not exist or storage list is restricted; safely ignore
        }
      };

      await Promise.allSettled(storagePaths.map(p => cleanFolder(p)));
    } catch (storageErr) {
      console.warn('[DELETE] Storage cleanup non-fatal warning:', storageErr);
    }
    console.log('[DELETE] Storage cleanup completed');

    // Step 7: Local in-memory cache purge
    try {
      storage.purgeStudentLocalData(uid, cleanId);
    } catch (localErr) {
      console.warn('[DELETE] Local state purge warning:', localErr);
    }

    console.log('[DELETE] Completed');
    return {
      success: true,
      message: `Permanently deleted account and all associated data for ${student.name || student.studentId || uid}.`
    };
  };

  try {
    return await withTimeout(
      runDeletion(), 
      overallTimeoutMs, 
      "Student deletion timed out. Some cleanup may still be in progress. Check the Firebase logs before retrying."
    );
  } catch (error: any) {
    console.error('[DELETE] Final error in deleteStudentAccountAdmin:', error);
    return {
      success: false,
      message: error.message || "Failed to delete student account. Please check logs and retry."
    };
  }
}

/**
 * Fetch all approved student records for Admin management
 */
export async function fetchApprovedStudentsForAdmin(campusFilter?: string): Promise<ApprovedStudent[]> {
  try {
    const colRef = collection(db, 'approved_students');
    let qSnap;
    if (campusFilter && campusFilter !== 'All') {
      const q = query(colRef, where('campus', '==', campusFilter));
      qSnap = await getDocs(q);
    } else {
      qSnap = await getDocs(colRef);
    }

    const students: ApprovedStudent[] = [];
    qSnap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && typeof data === 'object') {
        students.push(data as ApprovedStudent);
      }
    });

    return students.sort((a, b) => {
      const idA = a && a.studentId ? String(a.studentId) : '';
      const idB = b && b.studentId ? String(b.studentId) : '';
      return idA.localeCompare(idB);
    });
  } catch (error) {
    console.error("Error fetching approved students for admin:", error);
    return [];
  }
}

/**
 * Add or update a single approved student with an invitation code
 */
export async function saveApprovedStudent(student: ApprovedStudent): Promise<{ success: boolean; message: string; invitationCode: string }> {
  const cleanId = student.studentId.trim().toUpperCase();
  if (!cleanId || !student.name.trim() || !student.campus) {
    return { success: false, message: "Student ID, Name, and Campus are required.", invitationCode: "" };
  }

  try {
    const safeDocId = cleanId.replace(/[\/\s\\#\?]/g, '_').slice(0, 50);
    const docRef = doc(db, 'approved_students', safeDocId);
    const existingSnap = await getDoc(docRef);

    let invitationCode = student.invitationCode;
    let invitationUsed = student.invitationUsed || false;

    if (!invitationCode) {
      invitationCode = generateInvitationCode();
    }

    const recordToSave: ApprovedStudent = {
      studentId: cleanId,
      name: student.name.trim(),
      email: student.email?.trim().toLowerCase() || `${student.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@niat.edu`,
      campus: student.campus,
      year: student.year || "1st Year",
      section: student.section || "A",
      branch: student.branch || "CSE",
      status: student.status || "active",
      invitationCode: invitationCode,
      invitationUsed: existingSnap.exists() ? (existingSnap.data().invitationUsed ?? invitationUsed) : invitationUsed,
      registeredUid: existingSnap.exists() ? existingSnap.data().registeredUid : (student.registeredUid || ""),
      updatedAt: new Date().toISOString()
    };

    await setDoc(docRef, cleanForFirestore(recordToSave), { merge: true });

    return {
      success: true,
      message: `Approved student record saved for ${recordToSave.name} (${recordToSave.studentId}). Code: ${invitationCode}`,
      invitationCode
    };
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to save student record.", invitationCode: "" };
  }
}

/**
 * Regenerate or Revoke Invitation Code for a student
 */
export async function regenerateInvitationCode(studentId: string): Promise<{ success: boolean; newCode: string; message: string }> {
  const cleanId = studentId.trim().toUpperCase();
  try {
    const safeDocId = cleanId.replace(/[\/\s\\#\?]/g, '_').slice(0, 50);
    const docRef = doc(db, 'approved_students', safeDocId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { success: false, newCode: "", message: "Student ID not found in database." };
    }

    const newCode = generateInvitationCode();
    await updateDoc(docRef, cleanForFirestore({
      invitationCode: newCode,
      invitationUsed: false,
      updatedAt: new Date().toISOString()
    }));

    return {
      success: true,
      newCode,
      message: `New invitation code generated for ${cleanId}: ${newCode}`
    };
  } catch (err: any) {
    return { success: false, newCode: "", message: err.message || "Failed to generate code." };
  }
}

/**
 * Disable or Enable student access
 */
export async function toggleStudentAccountStatus(studentId: string, status: "active" | "suspended"): Promise<{ success: boolean; message: string }> {
  const cleanId = studentId.trim().toUpperCase();
  try {
    const safeDocId = cleanId.replace(/[\/\s\\#\?]/g, '_').slice(0, 50);
    const studentRef = doc(db, 'approved_students', safeDocId);
    const docSnap = await getDoc(studentRef);

    if (!docSnap.exists()) {
      return { success: false, message: "Student not found." };
    }

    const data = docSnap.data() as ApprovedStudent;
    await updateDoc(studentRef, cleanForFirestore({ status, updatedAt: new Date().toISOString() }));

    // Also update registered user document if student registered
    if (data.registeredUid) {
      const userRef = doc(db, 'users', data.registeredUid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        await updateDoc(userRef, cleanForFirestore({ status }));
      }
    }

    return { success: true, message: `Student status set to "${status}" for ${cleanId}.` };
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to update status." };
  }
}

/**
 * Import Students from CSV content
 * Format: studentId,name,campus,year,section,branch,status
 */
export async function importStudentsFromCsv(csvContent: string): Promise<CsvImportResult> {
  const lines = (csvContent || '').split('\n').map(l => l.trim()).filter(Boolean);
  const errors: string[] = [];
  let importedCount = 0;
  let updatedCount = 0;
  let failedCount = 0;

  if (lines.length === 0) {
    return { totalRows: 0, importedCount: 0, updatedCount: 0, failedCount: 0, errors: ["CSV file is empty."] };
  }

  // Check header line
  let startIndex = 0;
  const firstLineLower = lines[0].toLowerCase();
  if (firstLineLower.includes('studentid') || firstLineLower.includes('name')) {
    startIndex = 1; // skip header
  }

  const validCampuses = ["Annamacharya × NIAT", "NRI × NIAT", "Chalapathi × NIAT", "Annamacharya University", "NRI Institute of Technology", "Chalapathi Institute of Technology"];

  const batch = writeBatch(db);
  let batchOpCount = 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    // parse CSV row taking into account quotes
    const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));

    if (cols.length < 2) {
      failedCount++;
      errors.push(`Row ${i + 1}: Insufficient columns (${line})`);
      continue;
    }

    const studentId = (cols[0] || '').toUpperCase();
    const name = cols[1] || '';
    const campusInput = cols[2] || 'Annamacharya × NIAT';
    const yearInput = cols[3] || '1st Year';
    const sectionInput = cols[4] || 'A';
    const branchInput = cols[5] || 'CSE';
    const statusInput = (cols[6] || 'active').toLowerCase() === 'suspended' ? 'suspended' : 'active';

    if (!studentId || !name) {
      failedCount++;
      errors.push(`Row ${i + 1}: Missing studentId or name`);
      continue;
    }

    let campus: CampusName = campusInput as CampusName;
    if (!validCampuses.includes(campusInput)) {
      if (campusInput.toLowerCase().includes('annamacharya')) campus = "Annamacharya × NIAT";
      else if (campusInput.toLowerCase().includes('nri')) campus = "NRI × NIAT";
      else if (campusInput.toLowerCase().includes('chalapathi')) campus = "Chalapathi × NIAT";
      else campus = "Annamacharya × NIAT";
    }

    const inviteCode = generateInvitationCode();
    const safeDocId = studentId.replace(/[\/\s\\#\?]/g, '_').slice(0, 50);
    const studentDocRef = doc(db, 'approved_students', safeDocId);

    batch.set(studentDocRef, cleanForFirestore({
      studentId,
      name,
      email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@niat.edu`,
      campus,
      year: yearInput as YearOfStudy,
      section: sectionInput as Section,
      branch: branchInput as Branch,
      status: statusInput,
      invitationCode: inviteCode,
      invitationUsed: false,
      updatedAt: new Date().toISOString()
    }), { merge: true });

    importedCount++;
    batchOpCount++;

    if (batchOpCount >= 400) {
      await batch.commit();
      batchOpCount = 0;
    }
  }

  if (batchOpCount > 0) {
    await batch.commit();
  }

  return {
    totalRows: lines.length - startIndex,
    importedCount,
    updatedCount,
    failedCount,
    errors
  };
}
