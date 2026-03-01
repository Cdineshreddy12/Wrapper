import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import { federation } from '@module-federation/vite'
import path from 'path'
import tailwindcss from "@tailwindcss/vite"
import { fixMfDevPaths } from './plugins/vite-plugin-fix-mf-paths'
import { patchMfRemotes } from './plugins/vite-plugin-patch-mf-remotes'


// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const mfRemotes = {
    remote_financial: {
      type: 'module',
      name: 'remote_financial',
      entry: 'http://localhost:5003/remoteEntry.js',
    },
  }
  const plugins: any[] = [
    react(),
    tailwindcss(),
    federation({
      name: 'wrapper_host',
      filename: 'remoteEntry.js',
      exposes: {
        './auth': './src/auth/index.ts',
      },
      remotes: mfRemotes,
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0', strictVersion: true },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0', strictVersion: true },
      },
      dts: false,
    }),
    patchMfRemotes(mfRemotes),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Wrapper Frontend',
        short_name: 'Wrapper',
        description: 'A modern React application for business management',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'], // Include SVG files in precaching
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
      }
    }),
    fixMfDevPaths(),
  ]

  // Add bundle analyzer in analyze mode
  if (mode === 'analyze') {
    plugins.push(visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }))
  }

  return {
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@features': path.resolve(__dirname, './src/features'),
        '@lib': path.resolve(__dirname, './src/lib'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@stores': path.resolve(__dirname, './src/stores'),
        '@types': path.resolve(__dirname, './src/types'),
      },
    },
    server: {
      port: 3001,
      open: true,
      host: true, // Allow external connections
      cors: true,
      // Enable HMR for better DX
      hmr: {
        overlay: true,
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3002',
          changeOrigin: true,
          secure: false,
        },
      },
      // Ignore non-source paths so edits to docs/config don't trigger HMR or page reloads
      watch: {
        ignored: [
          '**/.env',
          '**/.env.*',
          '**/node_modules/**',
          '**/vite.config.ts',
          '**/docs/**',
          '**/.husky/**',
          '**/coverage/**',
          '**/dist/**',
          '**/*.md',
          '**/scripts/**',
          '**/.cursor/**',
          '**/package.json',
          '**/tsconfig.json',
          '**/tsconfig.*.json',
          '**/index.html',
          '**/main.tsx',
          // Shared data/mock files: often touched by tooling; rarely edited. Ignore to avoid reload cascades.
          '**/src/data/**',
        ],
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['@tanstack/react-router'],
            query: ['@tanstack/react-query'],
            'radix-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-tabs'],
            auth: ['@kinde-oss/kinde-auth-react'],
            forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
            recharts: ['recharts'],
            motion: ['framer-motion'],
            tsparticles: ['@tsparticles/engine', '@tsparticles/react', '@tsparticles/slim'],
            reactflow: ['reactflow'],
          },
        },
      },
      minify: 'esbuild',
    },
    esbuild: mode === 'production' ? {
      drop: ['console', 'debugger'],
    } : {},
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@tanstack/react-query',
        '@tanstack/react-router',
        'zustand',
        'zod',
        'react-hook-form',
        '@kinde-oss/kinde-auth-react',
        'canvas-confetti',
        'sonner',
      ],
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    },
  }
}) 