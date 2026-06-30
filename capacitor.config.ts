import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.milkmaster.com',
  appName: 'Mobile Dairy',
  webDir: 'dist',
  server: {
    url: 'https://milk-master-app.web.app',
    cleartext: true
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com'],
    },
  },
};

export default config;
