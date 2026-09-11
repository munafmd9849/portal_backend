import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';
import dualListen from './vite-plugin-dual-listen.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_PORT = 5173;
const INNER_PORT = 5178;

/** Vercel serves 404.html for unknown paths when SPA rewrites are missing. */
function copyIndexTo404() {
  return {
    name: 'copy-index-to-404',
    closeBundle() {
      const indexPath = path.resolve(__dirname, 'dist/index.html');
      const notFoundPath = path.resolve(__dirname, 'dist/404.html');
      if (fs.existsSync(indexPath)) {
        fs.copyFileSync(indexPath, notFoundPath);
      }
    },
  };
}

function proxyToBackend() {
  return {
    target: 'http://127.0.0.1:3000',
    changeOrigin: true,
    secure: false,
    ws: true,
    timeout: 180000,
    proxyTimeout: 180000,
  };
}

// Inner Vite is HTTP on 5178. Port 5173 accepts HTTP (admin) and HTTPS (LAN camera).
export default defineConfig({
  plugins: [
    react({
      include: '**/*.{jsx,tsx}',
    }),
    copyIndexTo404(),
    dualListen({ publicPort: PUBLIC_PORT }),
  ],

  server: {
    host: true,
    port: INNER_PORT,
    strictPort: true,
    allowedHosts: true,
    open: false,
    headers: {
      'Permissions-Policy': 'camera=*, microphone=*, display-capture=*',
    },
    hmr: {
      overlay: true,
      clientPort: PUBLIC_PORT,
    },
    watch: {
      usePolling: false,
    },
    proxy: {
      '/api': proxyToBackend(),
      '/socket.io': proxyToBackend(),
    },
  },
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      // Use absolute path for react-pdf to avoid duplicate module warnings
      'react-pdf': path.resolve(__dirname, 'node_modules/react-pdf/dist/esm/entry.webpack5'),
    },
  },
  optimizeDeps: {
    // Exclude react-pdf from optimizeDeps since we're using alias with absolute path
    exclude: ['react-pdf'],
  },
  build: {
    target: 'es2020',
  },
});
