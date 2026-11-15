import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Aligned with tsconfig target ES2022: main.tsx uses top-level await to
  // hydrate before the React tree mounts.
  build: {
    target: 'es2022',
  },
});
