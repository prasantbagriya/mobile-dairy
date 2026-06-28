importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC24tcVIhoPoBfcOLEF3vPOTDpdrm-aSAw",
  authDomain: "milk-master-app.firebaseapp.com",
  projectId: "milk-master-app",
  storageBucket: "milk-master-app.firebasestorage.app",
  messagingSenderId: "970852092792",
  appId: "1:970852092792:web:b7bcb8517bf3f24def968d",
  measurementId: "G-H26R3EXHCX"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/favicon.ico'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
