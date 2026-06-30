import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: 'auto',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'manifest-admin.json', 'manifest-farmer.json', 'manifest-customer.json'],
        workbox: {
          maximumFileSizeToCacheInBytes: 3000000,
          globIgnores: [
            '**/node_modules/**/*',
            'assets/recharts*.js',
          ],
          navigateFallbackDenylist: [/^\/__/],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }
              }
            }
          ]
        },
        manifest: false
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâ€”file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
          pure_funcs: ['console.info', 'console.debug', 'console.warn'],
          passes: 2
        }
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'react';
              if (id.includes('lucide-react')) return 'icons';
              if (id.includes('@firebase/firestore') || id.includes('firebase/firestore')) return 'firebase-firestore';
              if (id.includes('@firebase/app-check') || id.includes('firebase/app-check')) return 'firebase-app-check';
              if (id.includes('@firebase/app/') || id.includes('@firebase/auth') || id.includes('firebase/app/') || id.includes('firebase/auth')) return 'firebase-core';
              if (id.includes('dayjs')) return 'dayjs';
              if (id.includes('@tanstack/react-virtual')) return 'react-virtual';
              if (id.includes('@capacitor')) return 'capacitor';
            }
          }
        }
      }
    }
  };
});
