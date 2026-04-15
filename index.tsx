
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  registerSW({
    onNeedRefresh() {
      // Automatic/Manual update notification disabled as requested by user.
      // The user prefers to reinstall manually to get updates.
      console.log('Nova versão disponível, mas a atualização automática está desativada.');
    },
    onOfflineReady() {
      console.log('Aplicativo pronto para uso offline.');
    },
  });
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element");

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
