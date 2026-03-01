import React from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"
import { NuqsAdapter } from 'nuqs/adapters/react'
import { ThemeProvider } from "@/components/theme/ThemeProvider"
import { KindeProvider } from "@/components/auth/KindeProvider"
import { Toaster } from "@/components/ui/sonner"
import { ErrorBoundary } from "@/errors/ErrorBoundary"
import { router } from "@/routes/router"
import "@/index.css"

// Suppress browser extension warnings for video elements
const originalWarn = console.warn;
console.warn = function (...args) {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Video element not found')) {
    return;
  }
  originalWarn.apply(console, args);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
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
            <ThemeProvider defaultTheme="system" storageKey="zopkit-theme">
              <Toaster position="top-right" richColors offset="80px" gap={12} />
              <KindeProvider>
                <RouterProvider router={router} />
              </KindeProvider>
            </ThemeProvider>
          </NuqsAdapter>
        </QueryClientProvider>
      </ErrorBoundary>
    </React.StrictMode>
  )
}
