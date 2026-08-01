import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'Expense Tracker',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 3000,
      androidScaleType: 'CENTER_CROP',
    },
    IonRouterOutlet: {
      animated: true,
    },
  },
};

export default config;
