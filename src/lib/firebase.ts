import { initializeApp } from 'firebase/app';
import { Capacitor } from '@capacitor/core';
import { getAuth } from 'firebase/auth';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

import { FirebaseAppCheck } from '@capacitor-firebase/app-check';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, CustomProvider } from 'firebase/app-check';

const app = initializeApp(firebaseConfig);

if (typeof window !== 'undefined') {
  // Force App Check to work on all domains for now
  (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = "A620E1E4-8750-4DA2-BDB4-CBE880A199BB";
// Temporarily disable AppCheck initialization
/*
  let appCheckProvider;
  if (Capacitor.isNativePlatform()) {
    appCheckProvider = new CustomProvider({
      getToken: async () => {
        const { token, expireTimeMillis } = await FirebaseAppCheck.getToken();
        return { token, expireTimeMillis };
      },
    });
  } else {
    // We must use a provider that works. If this enterprise key is wrong or missing domains, it will fail.
    // For now, re-enable it so we don't fail enforcement.
    appCheckProvider = new ReCaptchaEnterpriseProvider('6Lc4uSUtAAAAAKu9BcGINcmfTB8hBEZxlMP73hrw');
  }

  try {
    initializeAppCheck(app, {
      provider: appCheckProvider,
      isTokenAutoRefreshEnabled: true
    });
    // Save provider to window so secondaryApp can use it
    (window as any)._appCheckProvider = appCheckProvider;
  } catch (e) {
    console.warn("AppCheck init failed", e);
  }
*/
}

export const db = getFirestore(app);

enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn("Multiple tabs open, persistence can only be enabled in one tab at a a time.");
  } else if (err.code === 'unimplemented') {
    console.warn("The current browser does not support all of the features required to enable persistence");
  }
});

export const auth = getAuth(app);

// Secondary app instance to securely create farmer auth accounts without logging out the admin
const secondaryApp = initializeApp(firebaseConfig, "Secondary");

if (typeof window !== 'undefined' && (window as any)._appCheckProvider) {
/*
  try {
    initializeAppCheck(secondaryApp, {
      provider: (window as any)._appCheckProvider,
      isTokenAutoRefreshEnabled: true
    });
  } catch (e) {
    console.warn("Secondary AppCheck init failed", e);
  }
*/
}

export const secondaryAuth = getAuth(secondaryApp);

// Initialize Messaging (Push Notifications) safely
let messagingInstance: any = null;
isSupported().then((supported) => {
  if (supported) {
    messagingInstance = getMessaging(app);
  }
}).catch(console.error);

export const messaging = () => messagingInstance;
