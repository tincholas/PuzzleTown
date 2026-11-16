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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Initialize native Capacitor settings after React mounts the initial frame
if (Capacitor.isNativePlatform()) {
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  if (Capacitor.getPlatform() === 'android') {
    StatusBar.setBackgroundColor({ color: '#dfb888' }).catch(() => {});
  }
  requestAnimationFrame(() => {
    SplashScreen.hide().catch(() => {});
  });
}
