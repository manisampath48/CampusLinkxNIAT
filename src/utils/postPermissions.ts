import { UserProfile } from '../types';
import { isAuthorizedAdmin } from './adminAuth';
import { auth } from '../lib/firebase';

export interface PostLikeItem {
  ownerUid?: string;
  authorUid?: string;
  authorId?: string;
  creatorId?: string;
}

/**
 * Checks if the current authenticated user is the true creator/owner of the content item.
 * Evaluates Firebase Authentication UID against explicit owner UID fields.
 * NEVER uses name, email, NIAT ID, or any display string.
 */
export function isContentOwner(
  item: PostLikeItem,
  currentUser: UserProfile | null,
  firebaseUid?: string | null
): boolean {
  const activeUid = firebaseUid || auth.currentUser?.uid || currentUser?.firebaseUid || currentUser?.uid;
  if (!activeUid) return false;

  if (item.ownerUid) {
    return item.ownerUid === activeUid;
  }

  // Fallback checks for legacy documents created before ownerUid was introduced
  const fallbackUid = item.authorUid || item.authorId || item.creatorId;
  if (fallbackUid) {
    return fallbackUid === activeUid;
  }

  // If no UID ownership field exists (e.g. legacy document with only owner name string),
  // normal students MUST NOT be granted ownership!
  return false;
}

/**
 * Checks if the current user has permission to edit the content item.
 * Normal students can edit ONLY their own content.
 * Authorized admins can edit/moderate content.
 */
export function canEditContent(
  item: PostLikeItem,
  currentUser: UserProfile | null,
  firebaseUid?: string | null
): boolean {
  if (isContentOwner(item, currentUser, firebaseUid)) {
    return true;
  }

  if (currentUser && isAuthorizedAdmin(currentUser, auth.currentUser)) {
    return true;
  }

  return false;
}

/**
 * Checks if the current user has permission to delete the content item.
 * Normal students can delete ONLY their own content.
 * Authorized admins can delete/moderate any content.
 */
export function canDeleteContent(
  item: PostLikeItem,
  currentUser: UserProfile | null,
  firebaseUid?: string | null
): boolean {
  if (isContentOwner(item, currentUser, firebaseUid)) {
    return true;
  }

  if (currentUser && isAuthorizedAdmin(currentUser, auth.currentUser)) {
    return true;
  }

  return false;
}

/**
 * Alias for canDeleteContent for backward compatibility.
 */
export const canManagePost = canDeleteContent;

