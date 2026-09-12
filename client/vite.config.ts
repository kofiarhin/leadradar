/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // The shared package builds to CommonJS for the Node server, which a browser
      // cannot load as an ES module. Vite compiles the TypeScript source to real ESM
      // instead, so the client never depends on that build output.
      '@leadradar/shared': fileURLToPath(
        new URL('../packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
  server: {
    port: 5173,
    // Proxying keeps the client and API on one origin in development, so the session
    // cookie is same-site and no CORS policy is needed.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: false,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
