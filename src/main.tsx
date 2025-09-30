import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Initialize i18n with error handling
import('./lib/i18n').catch(error => {
  console.warn('Failed to load i18n:', error);
  // Continue without i18n if it fails
});

createRoot(document.getElementById("root")!).render(<App />);
