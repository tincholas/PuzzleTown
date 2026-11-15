import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { pwaManager } from './pwaManager';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import './index.css';

// Initialize proactive PWA update checks & listeners (no-ops in native Capacitor)
pwaManager.init();

// Initialize native Capacitor settings if running as iOS/Android app
if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  StatusBar.setBackgroundColor({ color: '#dfb888' }).catch(() => {});
  SplashScreen.hide().catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
