import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'libsodium-sumo': path.resolve(__dirname, '../../node_modules/libsodium-sumo/dist/modules-esm/libsodium.mjs'),
      './libsodium-sumo.mjs': path.resolve(__dirname, '../../node_modules/libsodium-sumo/dist/modules-esm/libsodium.mjs'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['libsodium-wrappers-sumo', 'libsodium-sumo'],
  },
});
