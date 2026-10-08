import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'shop.gotreowen.memozi',
  appName: 'MemoZi',
  webDir: 'dist',
  android: {
    // The theme relies on CSS color-mix(), available from Chromium 111.
    minWebViewVersion: 111,
  },
};

export default config;
