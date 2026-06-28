import { useEffect, useState } from 'react';
import { messaging } from './firebase';
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
          const msg = await messaging();
          if (msg) {
            const { getToken } = await import('firebase/messaging');
            const token = await getToken(msg, { vapidKey: VAPID_KEY || undefined });
            if (token) {
              setFcmToken(token);
              const { saveMessagingToken } = await import('./messaging-db');
              await saveMessagingToken(user.uid, token);
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
    let unsubscribe: any;
    
    const setupListener = async () => {
      const msg = await messaging();
      if (msg) {
        const { onMessage } = await import('firebase/messaging');
        unsubscribe = onMessage(msg, (payload) => {
          console.log('Foreground message received: ', payload);
          if (Notification.permission === 'granted') {
              new Notification(payload.notification?.title || 'Notification', {
                  body: payload.notification?.body || '',
                  icon: '/favicon.ico'
              });
          }
        });
      }
    };
    
    setupListener();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  return { fcmToken };
}
