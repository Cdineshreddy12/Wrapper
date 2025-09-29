import React from 'react'
import ReactDOM from 'react-dom/client'
import { NuqsAdapter } from 'nuqs/adapters/react'
import App from './App'
import './index.css'
import { QueryProvider } from '@/providers'

// Suppress browser extension warnings for video elements
const originalWarn = console.warn;
console.warn = function (...args) {
  // Filter out video element warnings from browser extensions
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Video element not found')) {
    return; // Suppress this specific warning
  }
  originalWarn.apply(console, args);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
      <QueryProvider>
        <NuqsAdapter>
          <App />
        </NuqsAdapter>
      </QueryProvider>
  </React.StrictMode>,
) 