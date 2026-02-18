import React from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { NuqsAdapter } from 'nuqs/adapters/react'
import App from "@/App"
import { ErrorBoundary } from "@/errors/ErrorBoundary"
import "@/index.css"



// Suppress browser extension warnings for video elements
const originalWarn = console.warn;
console.warn = function (...args) {
  // Filter out video element warnings from browser extensions
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Video element not found')) {
    return; // Suppress this specific warning
  }
  originalWarn.apply(console, args);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error: any) => {
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false
        }
        return failureCount < 3
      },
    },
    mutations: {
      retry: false,
    },
  },
})

const rootEl = document.getElementById("root")
if (!rootEl) {
  document.body.innerHTML = '<div style="padding:2rem;font-family:system-ui;background:#f9fafb;color:#111">Root element #root not found.</div>'
} else {
  createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <NuqsAdapter>
            <App />
          </NuqsAdapter>
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>
  )
} 