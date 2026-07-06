import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: "Expense Tracker",
  webDir: 'dist', // Replace 'build' with your correct folder
  bundledWebRuntime: false,
  "plugins": {
    "SplashScreen": {
      "launchAutoHide": true,
      "LaunchShowDuration": 3000,
      "androidScaleType": "CENTER_CROP"
    },
    "IonRouterOutlet": {
      "animated": true
    }
  }
};

export default config;
