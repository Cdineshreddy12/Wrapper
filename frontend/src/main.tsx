import React from "react"
import { createRoot } from "react-dom/client"
import "@/index.css"

const startupStorageResetEnabled = import.meta.env.VITE_RESET_AUTH_STORAGE_ON_BOOT === "true"

if (startupStorageResetEnabled) {
  const explicitSensitiveKeys = new Set([
    "kinde_backup_token",
    "kinde_token",
    "kinde_refresh_token",
    "authToken",
    "auth_token",
  ])

  const shouldRemoveKey = (key: string) => {
    if (explicitSensitiveKeys.has(key)) return true
    if (/^refreshToken\d+$/i.test(key)) return true
    if (key !== "pendingInvitationToken" && /(access.?token|refresh.?token|id.?token)/i.test(key)) {
      return true
    }
    return false
  }

  const clearStorage = (storage: Storage) => {
    for (let i = storage.length - 1; i >= 0; i -= 1) {
      const key = storage.key(i)
      if (!key) continue
      if (shouldRemoveKey(key)) {
        storage.removeItem(key)
      }
    }
  }

  const clearSensitiveStartupData = () => {
    try {
      clearStorage(localStorage)
      clearStorage(sessionStorage)
    } catch {
      // Ignore storage access failures in restricted browser modes.
    }
  }

  clearSensitiveStartupData()
}

const bootstrap = async () => {
  const { AppRoot } = await import("./AppRoot")
  const rootEl = document.getElementById("root")

  if (!rootEl) {
    document.body.innerHTML = '<div style="padding:2rem;font-family:system-ui;background:#f9fafb;color:#111">Root element #root not found.</div>'
    return
  }

  createRoot(rootEl).render(
    <React.StrictMode>
      <AppRoot />
    </React.StrictMode>
  )
}

// Suppress browser extension warnings for video elements
const originalWarn = console.warn;
console.warn = function (...args) {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Video element not found')) {
    return;
  }
  originalWarn.apply(console, args);
};
bootstrap()
