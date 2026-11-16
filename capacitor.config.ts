import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.puzzletown.game',
  appName: 'PuzzleTown',
  webDir: 'dist',
  backgroundColor: '#dfb888',
  ios: {
    backgroundColor: '#dfb888'
  },
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#dfb888',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP'
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#dfb888'
    }
  }
};

export default config;
