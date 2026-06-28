import { useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth } from './auth';

// Optional: Provide your VAPID Key here from Firebase Console -> Cloud Messaging -> Web Configuration
const VAPID_KEY = 'BGgcWx3CX-O046ut7vN_siLbE9Y_uGQNFHAXHdpjmnoRvGSLYy_Yt3VYHEq33aYbIt4ssrKhzekBoHuTqhUAnd0';

export function useMessaging() {
  const { user } = useAuth();
  const [fcmToken, setFcmToken] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const requestPermissionAndGetToken = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const msg = messaging();
          if (msg) {
            const token = await getToken(msg, { vapidKey: VAPID_KEY || undefined });
            if (token) {
              setFcmToken(token);
              // Save token to Firestore so admin can push notifications to this specific user
              await setDoc(doc(db, 'user_tokens', user.uid), {
                token,
                updatedAt: new Date().toISOString()
              }, { merge: true });
            } else {
              console.log('No registration token available. Request permission to generate one.');
            }
          }
        } else {
          console.log('Notification permission denied by user.');
        }
      } catch (error) {
        console.error('An error occurred while retrieving token: ', error);
      }
    };

    requestPermissionAndGetToken();

    // Listen for foreground messages
    const msg = messaging();
    if (msg) {
      const unsubscribe = onMessage(msg, (payload) => {
        console.log('Foreground message received: ', payload);
        // You could use a toast notification library here to show a popup
        // alert(`New Notification: ${payload.notification?.title} - ${payload.notification?.body}`);
        
        // Native notification fallback if the tab is visible
        if (Notification.permission === 'granted') {
            new Notification(payload.notification?.title || 'Notification', {
                body: payload.notification?.body || '',
                icon: '/favicon.ico'
            });
        }
      });
      return () => unsubscribe();
    }
  }, [user]);

  return { fcmToken };
}
