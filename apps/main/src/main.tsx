import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Ensure React is available globally for legacy libraries
if (typeof window !== 'undefined') {
  (window as any).React = React;
}

// Add global error handler
window.onerror = (message, source, lineno, colno, error) => {
  console.error('Global Error:', { message, source, lineno, colno, error });
};

window.addEventListener('error', (event) => {
  console.error('Window Error Event:', event.error);
});

// Add unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
});

try {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error('Root element not found!');
  }
  console.log('Root element found, mounting React app...');
  createRoot(root).render(<App />);
  console.log('React app mounted successfully!');
} catch (error) {
  console.error('Failed to mount React app:', error);
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `<div style="color: red; padding: 20px; font-size: 16px;">
      <h1>Error Loading App</h1>
      <p>${String(error)}</p>
      <pre>${error instanceof Error ? error.stack : ''}</pre>
    </div>`;
  }
}
