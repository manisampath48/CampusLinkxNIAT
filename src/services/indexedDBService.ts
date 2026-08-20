/**
 * IndexedDB Persistent Video Cache Service for CampusLink
 * Stores high-fidelity binary video Blobs locally in the browser.
 */

const DB_NAME = 'campuslink_media_db';
const DB_VERSION = 1;
const STORE_NAME = 'showcase_videos';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'postId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save a video Blob to IndexedDB for a showcase post.
 */
export async function saveVideoToIndexedDB(postId: string, fileOrBlob: Blob): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const record = {
        postId,
        blob: fileOrBlob,
        mimeType: fileOrBlob.type || 'video/mp4',
        savedAt: Date.now()
      };
      const request = store.put(record);

      request.onsuccess = () => {
        console.log(`[IndexedDB] Stored video blob for post: ${postId} (${(fileOrBlob.size / (1024 * 1024)).toFixed(2)} MB)`);
        resolve();
      };
      request.onerror = () => {
        console.warn('[IndexedDB] Failed to save video blob:', request.error);
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('[IndexedDB] Storage warning (non-fatal):', err);
  }
}

/**
 * Retrieve a stored video Blob from IndexedDB and return an Object URL.
 */
export async function getVideoBlobUrlFromIndexedDB(postId: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(postId);

      request.onsuccess = () => {
        const record = request.result;
        if (record && record.blob) {
          const url = URL.createObjectURL(record.blob);
          console.log(`[IndexedDB] Loaded cached video for post: ${postId}`);
          resolve(url);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  } catch (e) {
    return null;
  }
}
