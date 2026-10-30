import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // "@/" maps to ./src/ — used throughout as "@/components/..."
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Vitest configuration (test runner)
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
