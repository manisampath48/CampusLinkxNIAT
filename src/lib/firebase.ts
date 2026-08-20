import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { 
  getAuth, 
  initializeAuth,
  browserLocalPersistence, 
  browserSessionPersistence,
  inMemoryPersistence,
  browserPopupRedirectResolver
} from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Pass the named database ID from firebase-applet-config.json
const DATABASE_ID = (firebaseConfig as any).firestoreDatabaseId || 'ai-studio-campuslink-13468461-ac7e-497a-846e-6a040556a21d';
export const db = getFirestore(app, DATABASE_ID);

let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: [browserLocalPersistence, browserSessionPersistence, inMemoryPersistence],
    popupRedirectResolver: browserPopupRedirectResolver
  });
} catch {
  authInstance = getAuth(app);
}

export const auth = authInstance;

export const storage = getStorage(app);
export const storageRef = storage;
export { app };

/**
 * Recursively removes any keys with `undefined` values from an object,
 * as Firestore throws an error if `undefined` values are passed.
 */
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => cleanForFirestore(item)) as unknown as T;
  }

  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(data)) {
    if (val !== undefined) {
      if (val && typeof val === 'object' && !(val instanceof Date)) {
        cleaned[key] = cleanForFirestore(val);
      } else {
        cleaned[key] = val;
      }
    }
  }
  return cleaned as T;
}
