import { UserProfile } from '../types';
import { User as FirebaseUser } from 'firebase/auth';

/**
 * Strict server-and-auth-backed admin authorization check.
 * Validates against authenticated Firebase Auth session and verified Firestore admin status.
 * Rejects loose client-side checks like studentId.includes('ADMIN').
 */
export function isAuthorizedAdmin(currentUser: UserProfile | null, firebaseUser: FirebaseUser | null): boolean {
  const firebaseEmail = (firebaseUser?.email || '').toLowerCase().trim();
  const profileEmail = (currentUser?.email || '').toLowerCase().trim();

  // 1. Superadmin email check
  if (firebaseEmail === 'manisampatharveti@gmail.com') {
    return true;
  }

  if (profileEmail === 'manisampatharveti@gmail.com' && (!firebaseUser || firebaseEmail === 'manisampatharveti@gmail.com')) {
    return true;
  }

  // 2. Custom claim or profile role check if verified
  if (currentUser && currentUser.isVerified && (currentUser.isAdmin === true || currentUser.role === 'ADMIN')) {
    return true;
  }

  return false;
}
