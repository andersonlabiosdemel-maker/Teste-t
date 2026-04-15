import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mixpdv.app',
  appName: 'Mix PDV',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
