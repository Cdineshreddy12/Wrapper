/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_URL: string
  readonly VITE_DEFAULT_SUBDOMAIN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Vite-injected build-time version constant
declare const __APP_VERSION__: string; 