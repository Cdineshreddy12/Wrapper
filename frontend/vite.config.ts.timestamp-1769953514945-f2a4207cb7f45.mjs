// vite.config.ts
import { defineConfig } from "file:///Users/chintadineshreddy/Desktop/MegaRepo/wrapper/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///Users/chintadineshreddy/Desktop/MegaRepo/wrapper/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///Users/chintadineshreddy/Desktop/MegaRepo/wrapper/frontend/node_modules/vite-plugin-pwa/dist/index.js";
import { visualizer } from "file:///Users/chintadineshreddy/Desktop/MegaRepo/wrapper/frontend/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import path from "path";
import tailwindcss from "file:///Users/chintadineshreddy/Desktop/MegaRepo/wrapper/frontend/node_modules/@tailwindcss/vite/dist/index.mjs";
var __vite_injected_original_dirname = "/Users/chintadineshreddy/Desktop/MegaRepo/wrapper/frontend";
var vite_config_default = defineConfig(({ mode }) => {
  const plugins = [
    react({
      // Enable JSX runtime
      jsxRuntime: "automatic"
    }),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: "Wrapper Frontend",
        short_name: "Wrapper",
        description: "A modern React application for business management",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        // Include SVG files in precaching
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: "NetworkFirst",
            options: {
              cacheName: "api-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24
                // 24 hours
              }
            }
          }
        ]
      }
    })
  ];
  if (mode === "analyze") {
    plugins.push(visualizer({
      filename: "dist/stats.html",
      open: true,
      gzipSize: true,
      brotliSize: true
    }));
  }
  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src"),
        "@components": path.resolve(__vite_injected_original_dirname, "./src/components"),
        "@features": path.resolve(__vite_injected_original_dirname, "./src/features"),
        "@lib": path.resolve(__vite_injected_original_dirname, "./src/lib"),
        "@hooks": path.resolve(__vite_injected_original_dirname, "./src/hooks"),
        "@stores": path.resolve(__vite_injected_original_dirname, "./src/stores"),
        "@types": path.resolve(__vite_injected_original_dirname, "./src/types")
      }
    },
    server: {
      port: 3001,
      open: true,
      host: true,
      // Allow external connections
      cors: true,
      // Enable HMR for better DX
      hmr: {
        overlay: true
      },
      // Avoid full restart on .env change (restart can trigger dep-scan ETIMEDOUT)
      watch: {
        ignored: ["**/.env", "**/.env.*", "**/node_modules/**"]
      }
    },
    build: {
      outDir: "dist",
      sourcemap: true,
      // Optimize chunks for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom"],
            router: ["react-router-dom"],
            query: ["@tanstack/react-query"],
            ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu"],
            auth: ["@kinde-oss/kinde-auth-react"],
            forms: ["react-hook-form", "@hookform/resolvers", "zod"]
          }
        }
      },
      // Enable minification
      minify: "terser",
      terserOptions: {
        compress: {
          drop_console: mode === "production",
          drop_debugger: mode === "production"
        }
      }
    },
    // Optimize dependencies. If you see ETIMEDOUT on dep-scan after restart, run: npm run clean:vite && npm run dev
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@tanstack/react-query",
        "zustand",
        "zod",
        "react-hook-form",
        "@kinde-oss/kinde-auth-react",
        "canvas-confetti"
      ]
    },
    define: {
      // Make process.env available in the browser
      "process.env": process.env,
      // Provide fallback for process.env.NODE_ENV
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development"),
      // Define app version
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvY2hpbnRhZGluZXNocmVkZHkvRGVza3RvcC9NZWdhUmVwby93cmFwcGVyL2Zyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvY2hpbnRhZGluZXNocmVkZHkvRGVza3RvcC9NZWdhUmVwby93cmFwcGVyL2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9jaGludGFkaW5lc2hyZWRkeS9EZXNrdG9wL01lZ2FSZXBvL3dyYXBwZXIvZnJvbnRlbmQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSdcbmltcG9ydCB7IHZpc3VhbGl6ZXIgfSBmcm9tICdyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXInXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuaW1wb3J0IHRhaWx3aW5kY3NzIGZyb20gXCJAdGFpbHdpbmRjc3Mvdml0ZVwiXG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIGNvbnN0IHBsdWdpbnM6IGFueVtdID0gW1xuICAgIHJlYWN0KHtcbiAgICAgIC8vIEVuYWJsZSBKU1ggcnVudGltZVxuICAgICAganN4UnVudGltZTogJ2F1dG9tYXRpYycsXG4gICAgfSksXG4gICAgdGFpbHdpbmRjc3MoKSxcbiAgICBWaXRlUFdBKHtcbiAgICAgIHJlZ2lzdGVyVHlwZTogJ2F1dG9VcGRhdGUnLFxuICAgICAgaW5jbHVkZUFzc2V0czogWydmYXZpY29uLmljbycsICdhcHBsZS10b3VjaC1pY29uLnBuZycsICdtYXNrZWQtaWNvbi5zdmcnXSxcbiAgICAgIG1hbmlmZXN0OiB7XG4gICAgICAgIG5hbWU6ICdXcmFwcGVyIEZyb250ZW5kJyxcbiAgICAgICAgc2hvcnRfbmFtZTogJ1dyYXBwZXInLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ0EgbW9kZXJuIFJlYWN0IGFwcGxpY2F0aW9uIGZvciBidXNpbmVzcyBtYW5hZ2VtZW50JyxcbiAgICAgICAgdGhlbWVfY29sb3I6ICcjZmZmZmZmJyxcbiAgICAgICAgYmFja2dyb3VuZF9jb2xvcjogJyNmZmZmZmYnLFxuICAgICAgICBkaXNwbGF5OiAnc3RhbmRhbG9uZScsXG4gICAgICAgIG9yaWVudGF0aW9uOiAncG9ydHJhaXQnLFxuICAgICAgICBzY29wZTogJy8nLFxuICAgICAgICBzdGFydF91cmw6ICcvJyxcbiAgICAgICAgaWNvbnM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBzcmM6ICdwd2EtMTkyeDE5Mi5wbmcnLFxuICAgICAgICAgICAgc2l6ZXM6ICcxOTJ4MTkyJyxcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnXG4gICAgICAgICAgfSxcbiAgICAgICAgICB7XG4gICAgICAgICAgICBzcmM6ICdwd2EtNTEyeDUxMi5wbmcnLFxuICAgICAgICAgICAgc2l6ZXM6ICc1MTJ4NTEyJyxcbiAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9wbmcnXG4gICAgICAgICAgfVxuICAgICAgICBdXG4gICAgICB9LFxuICAgICAgd29ya2JveDoge1xuICAgICAgICBnbG9iUGF0dGVybnM6IFsnKiovKi57anMsY3NzLGh0bWwsaWNvLHBuZyxzdmd9J10sIC8vIEluY2x1ZGUgU1ZHIGZpbGVzIGluIHByZWNhY2hpbmdcbiAgICAgICAgcnVudGltZUNhY2hpbmc6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICB1cmxQYXR0ZXJuOiAvXmh0dHBzOlxcL1xcL2FwaVxcLi8sXG4gICAgICAgICAgICBoYW5kbGVyOiAnTmV0d29ya0ZpcnN0JyxcbiAgICAgICAgICAgIG9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgY2FjaGVOYW1lOiAnYXBpLWNhY2hlJyxcbiAgICAgICAgICAgICAgZXhwaXJhdGlvbjoge1xuICAgICAgICAgICAgICAgIG1heEVudHJpZXM6IDEwMCxcbiAgICAgICAgICAgICAgICBtYXhBZ2VTZWNvbmRzOiA2MCAqIDYwICogMjQgLy8gMjQgaG91cnNcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgXVxuICAgICAgfVxuICAgIH0pXG4gIF1cblxuICAvLyBBZGQgYnVuZGxlIGFuYWx5emVyIGluIGFuYWx5emUgbW9kZVxuICBpZiAobW9kZSA9PT0gJ2FuYWx5emUnKSB7XG4gICAgcGx1Z2lucy5wdXNoKHZpc3VhbGl6ZXIoe1xuICAgICAgZmlsZW5hbWU6ICdkaXN0L3N0YXRzLmh0bWwnLFxuICAgICAgb3BlbjogdHJ1ZSxcbiAgICAgIGd6aXBTaXplOiB0cnVlLFxuICAgICAgYnJvdGxpU2l6ZTogdHJ1ZSxcbiAgICB9KSlcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgcGx1Z2lucyxcbiAgICByZXNvbHZlOiB7XG4gICAgICBhbGlhczoge1xuICAgICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpLFxuICAgICAgICAnQGNvbXBvbmVudHMnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvY29tcG9uZW50cycpLFxuICAgICAgICAnQGZlYXR1cmVzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL2ZlYXR1cmVzJyksXG4gICAgICAgICdAbGliJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL2xpYicpLFxuICAgICAgICAnQGhvb2tzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL2hvb2tzJyksXG4gICAgICAgICdAc3RvcmVzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3N0b3JlcycpLFxuICAgICAgICAnQHR5cGVzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3R5cGVzJyksXG4gICAgICB9LFxuICAgIH0sXG4gICAgc2VydmVyOiB7XG4gICAgICBwb3J0OiAzMDAxLFxuICAgICAgb3BlbjogdHJ1ZSxcbiAgICAgIGhvc3Q6IHRydWUsIC8vIEFsbG93IGV4dGVybmFsIGNvbm5lY3Rpb25zXG4gICAgICBjb3JzOiB0cnVlLFxuICAgICAgLy8gRW5hYmxlIEhNUiBmb3IgYmV0dGVyIERYXG4gICAgICBobXI6IHtcbiAgICAgICAgb3ZlcmxheTogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICAvLyBBdm9pZCBmdWxsIHJlc3RhcnQgb24gLmVudiBjaGFuZ2UgKHJlc3RhcnQgY2FuIHRyaWdnZXIgZGVwLXNjYW4gRVRJTUVET1VUKVxuICAgICAgd2F0Y2g6IHtcbiAgICAgICAgaWdub3JlZDogWycqKi8uZW52JywgJyoqLy5lbnYuKicsICcqKi9ub2RlX21vZHVsZXMvKionXSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBidWlsZDoge1xuICAgICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgICBzb3VyY2VtYXA6IHRydWUsXG4gICAgICAvLyBPcHRpbWl6ZSBjaHVua3MgZm9yIGJldHRlciBjYWNoaW5nXG4gICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgIG91dHB1dDoge1xuICAgICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgICAgdmVuZG9yOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbSddLFxuICAgICAgICAgICAgcm91dGVyOiBbJ3JlYWN0LXJvdXRlci1kb20nXSxcbiAgICAgICAgICAgIHF1ZXJ5OiBbJ0B0YW5zdGFjay9yZWFjdC1xdWVyeSddLFxuICAgICAgICAgICAgdWk6IFsnQHJhZGl4LXVpL3JlYWN0LWRpYWxvZycsICdAcmFkaXgtdWkvcmVhY3QtZHJvcGRvd24tbWVudSddLFxuICAgICAgICAgICAgYXV0aDogWydAa2luZGUtb3NzL2tpbmRlLWF1dGgtcmVhY3QnXSxcbiAgICAgICAgICAgIGZvcm1zOiBbJ3JlYWN0LWhvb2stZm9ybScsICdAaG9va2Zvcm0vcmVzb2x2ZXJzJywgJ3pvZCddLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgLy8gRW5hYmxlIG1pbmlmaWNhdGlvblxuICAgICAgbWluaWZ5OiAndGVyc2VyJyxcbiAgICAgIHRlcnNlck9wdGlvbnM6IHtcbiAgICAgICAgY29tcHJlc3M6IHtcbiAgICAgICAgICBkcm9wX2NvbnNvbGU6IG1vZGUgPT09ICdwcm9kdWN0aW9uJyxcbiAgICAgICAgICBkcm9wX2RlYnVnZ2VyOiBtb2RlID09PSAncHJvZHVjdGlvbicsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gICAgLy8gT3B0aW1pemUgZGVwZW5kZW5jaWVzLiBJZiB5b3Ugc2VlIEVUSU1FRE9VVCBvbiBkZXAtc2NhbiBhZnRlciByZXN0YXJ0LCBydW46IG5wbSBydW4gY2xlYW46dml0ZSAmJiBucG0gcnVuIGRldlxuICAgIG9wdGltaXplRGVwczoge1xuICAgICAgaW5jbHVkZTogW1xuICAgICAgICAncmVhY3QnLFxuICAgICAgICAncmVhY3QtZG9tJyxcbiAgICAgICAgJ3JlYWN0LXJvdXRlci1kb20nLFxuICAgICAgICAnQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5JyxcbiAgICAgICAgJ3p1c3RhbmQnLFxuICAgICAgICAnem9kJyxcbiAgICAgICAgJ3JlYWN0LWhvb2stZm9ybScsXG4gICAgICAgICdAa2luZGUtb3NzL2tpbmRlLWF1dGgtcmVhY3QnLFxuICAgICAgICAnY2FudmFzLWNvbmZldHRpJyxcbiAgICAgIF0sXG4gICAgfSxcbiAgICBkZWZpbmU6IHtcbiAgICAgIC8vIE1ha2UgcHJvY2Vzcy5lbnYgYXZhaWxhYmxlIGluIHRoZSBicm93c2VyXG4gICAgICAncHJvY2Vzcy5lbnYnOiBwcm9jZXNzLmVudixcbiAgICAgIC8vIFByb3ZpZGUgZmFsbGJhY2sgZm9yIHByb2Nlc3MuZW52Lk5PREVfRU5WXG4gICAgICAncHJvY2Vzcy5lbnYuTk9ERV9FTlYnOiBKU09OLnN0cmluZ2lmeShwcm9jZXNzLmVudi5OT0RFX0VOViB8fCAnZGV2ZWxvcG1lbnQnKSxcbiAgICAgIC8vIERlZmluZSBhcHAgdmVyc2lvblxuICAgICAgX19BUFBfVkVSU0lPTl9fOiBKU09OLnN0cmluZ2lmeShwcm9jZXNzLmVudi5ucG1fcGFja2FnZV92ZXJzaW9uKSxcbiAgICB9LFxuICB9XG59KSAiXSwKICAibWFwcGluZ3MiOiAiO0FBQWdXLFNBQVMsb0JBQW9CO0FBQzdYLE9BQU8sV0FBVztBQUNsQixTQUFTLGVBQWU7QUFDeEIsU0FBUyxrQkFBa0I7QUFDM0IsT0FBTyxVQUFVO0FBQ2pCLE9BQU8saUJBQWlCO0FBTHhCLElBQU0sbUNBQW1DO0FBUXpDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBQ3hDLFFBQU0sVUFBaUI7QUFBQSxJQUNyQixNQUFNO0FBQUE7QUFBQSxNQUVKLFlBQVk7QUFBQSxJQUNkLENBQUM7QUFBQSxJQUNELFlBQVk7QUFBQSxJQUNaLFFBQVE7QUFBQSxNQUNOLGNBQWM7QUFBQSxNQUNkLGVBQWUsQ0FBQyxlQUFlLHdCQUF3QixpQkFBaUI7QUFBQSxNQUN4RSxVQUFVO0FBQUEsUUFDUixNQUFNO0FBQUEsUUFDTixZQUFZO0FBQUEsUUFDWixhQUFhO0FBQUEsUUFDYixhQUFhO0FBQUEsUUFDYixrQkFBa0I7QUFBQSxRQUNsQixTQUFTO0FBQUEsUUFDVCxhQUFhO0FBQUEsUUFDYixPQUFPO0FBQUEsUUFDUCxXQUFXO0FBQUEsUUFDWCxPQUFPO0FBQUEsVUFDTDtBQUFBLFlBQ0UsS0FBSztBQUFBLFlBQ0wsT0FBTztBQUFBLFlBQ1AsTUFBTTtBQUFBLFVBQ1I7QUFBQSxVQUNBO0FBQUEsWUFDRSxLQUFLO0FBQUEs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
