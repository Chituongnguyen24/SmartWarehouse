import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: ['chrome80', 'es2020'],
  },
  server: {
    port: 5175,
    host: true,
  },
});
