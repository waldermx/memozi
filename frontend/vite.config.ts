/// <reference types="vitest" />

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  build: {
    target: 'es2020',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    // Token tests read the theme CSS as ?raw; vitest blanks CSS by default.
    // Only src/theme/*.css and the legacy src/styles/variables.css, never node_modules.
    css: {
      include: [/^(?!.*\/node_modules\/).*\/frontend\/src\/(theme\/[^/]+|styles\/variables)\.css(\?.*)?$/],
    },
  }
})
