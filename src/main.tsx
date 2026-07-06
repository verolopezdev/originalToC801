// main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initI18n } from './i18n';

const container = document.getElementById('root');
const root = createRoot(container!);

async function initApp() {

  // Initialize translations
  await initI18n();

  // Render app after DB + i18n are ready
  root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
  );
}

initApp();
