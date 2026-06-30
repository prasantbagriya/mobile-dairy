import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAppCheck } from '@capacitor-firebase/app-check';
import firebaseConfig from '../../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Secondary app instance to securely create farmer auth accounts without logging out the admin
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);

if (typeof window !== 'undefined') {
  // Force App Check to work on all domains for now
  (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = "A620E1E4-8750-4DA2-BDB4-CBE880A199BB";

  import('firebase/app-check').then(({ initializeAppCheck, ReCaptchaEnterpriseProvider, CustomProvider }) => {
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
      appCheckProvider = new ReCaptchaEnterpriseProvider('6Lc4uSUtAAAAAKu9BcGINcmfTB8hBEZxlMP73hrw');
    }

    try {
      initializeAppCheck(app, {
        provider: appCheckProvider,
        isTokenAutoRefreshEnabled: true
      });
      initializeAppCheck(secondaryApp, {
        provider: appCheckProvider,
        isTokenAutoRefreshEnabled: true
      });
    } catch (e) {
      console.warn("AppCheck init failed", e);
    }
  }).catch(e => {
    console.warn("Failed to dynamically load firebase/app-check", e);
  });
}

