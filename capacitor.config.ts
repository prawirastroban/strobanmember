import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bengkelstroban.app',
  appName: 'Stroban',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    GoogleAuth: {
      // Web Client ID dari Firebase Console (project bengkel-stroban):
      // Authentication → Sign-in method → Google → Web SDK configuration.
      // WAJIB diisi sebelum build APK/AAB, atau plugin return error 10 (DEVELOPER_ERROR).
      scopes: ['profile', 'email'],
      serverClientId: 'REPLACE_WITH_FIREBASE_WEB_CLIENT_ID.apps.googleusercontent.com',
      forceCodeForRefreshToken: false,
    },
    SplashScreen: {
      launchShowDuration: 1000,
      backgroundColor: '#D50000',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
      fadeOutDuration: 300,
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'LIGHT',
      backgroundColor: '#00000000',
    },
  },
};

export default config;
