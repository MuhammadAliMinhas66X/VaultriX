import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
  preview: {
    allowedHosts: ['mellow-caring-production.up.railway.app'],
  },
});
