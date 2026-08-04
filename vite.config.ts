import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: false
  },
  server: {
    host: '0.0.0.0',
    port: 3001,
    proxy: {
      '/api': {
        target: 'https://karatahta-backend-production.up.railway.app',
        changeOrigin: true,
        // needed for /api/kara-live and the Motion Canvas live-preview proxy
        // (/api/jobs/:id/mc-preview), both of which tunnel a WebSocket.
        ws: true
      },
      '/renders': {
        target: 'https://karatahta-backend-production.up.railway.app',
        changeOrigin: true
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 3001
  }
});
