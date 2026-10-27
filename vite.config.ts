import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, 'index.html'),
        print: resolve(import.meta.dirname, 'print.html'),
      },
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
