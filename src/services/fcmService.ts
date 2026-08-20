import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { app, db, cleanForFirestore } from '../lib/firebase';

let messagingInstance: ReturnType<typeof getMessaging> | null = null;

/**
 * Initializes messaging safely if supported by browser/environment.
 */
export async function getFirebaseMessaging() {
  if (messagingInstance) return messagingInstance;
  try {
    const supported = await isSupported();
    if (supported) {
      messagingInstance = getMessaging(app);
      return messagingInstance;
    }
  } catch (e) {
    console.warn("[FCM] Firebase messaging is not supported in this environment:", e);
  }
  return null;
}

/**
 * Registers the user's FCM token in Firestore under notificationTokens collection.
 */
export async function registerDeviceToken(uid: string): Promise<string | null> {
  if (!uid) return null;

  try {
    if ('Notification' in window && Notification.permission !== 'granted') {
      return null;
    }

    const messaging = await getFirebaseMessaging();
    if (!messaging) return null;

    // Register Service Worker if needed
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      } catch (swErr) {
        console.warn("[FCM] Service worker registration warning:", swErr);
      }
    }

    const currentToken = await getToken(messaging, {
      serviceWorkerRegistration: 'serviceWorker' in navigator 
        ? await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js') 
        : undefined
    });

    if (currentToken) {
      const tokenDocId = `${uid}_${currentToken.slice(-12)}`;
      const tokenData = {
        id: tokenDocId,
        uid,
        token: currentToken,
        platform: 'web',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'notificationTokens', tokenDocId), cleanForFirestore(tokenData));
      return currentToken;
    }
  } catch (err) {
    console.warn("[FCM] Unable to retrieve or register device token:", err);
  }
  return null;
}

/**
 * Listens for FCM foreground messages.
 */
export async function onForegroundMessage(callback: (payload: any) => void) {
  const messaging = await getFirebaseMessaging();
  if (messaging) {
    return onMessage(messaging, callback);
  }
  return () => {};
}
