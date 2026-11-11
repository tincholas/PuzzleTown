import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { pwaManager } from './pwaManager';
import './index.css';

// Initialize proactive PWA update checks & listeners
pwaManager.init();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
