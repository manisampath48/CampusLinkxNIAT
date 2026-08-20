// Firebase Messaging Service Worker for CampusLink
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

firebase.initializeApp({
  projectId: "neon-imagery-wn50x",
  appId: "1:537012973805:web:c677799b2912e69ad99ce4",
  apiKey: "AIzaSyDkxDTIVr-UD5a0rL1E9qA3WOIx0YIWMbk",
  authDomain: "neon-imagery-wn50x.firebaseapp.com",
  messagingSenderId: "537012973805"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);
  
  const title = payload.notification?.title || payload.data?.title || 'CampusLink';
  const options = {
    body: payload.notification?.body || payload.data?.body || 'New message received',
    icon: '/niat-logo.png',
    badge: '/niat-logo.png',
    data: payload.data || {}
  };

  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const senderId = event.notification.data?.senderId || '';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.postMessage({ type: 'OPEN_CHAT', senderId });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/?tab=messages' + (senderId ? `&user=${senderId}` : ''));
      }
    })
  );
});
