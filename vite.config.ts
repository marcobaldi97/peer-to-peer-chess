/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vitejs.dev/config https://vitest.dev/config
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'happy-dom',
    environmentOptions: { happyDOM: { url: 'http://localhost:3000/' } },
    setupFiles: '.vitest/setup',
    include: ['**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      all: true,
      include: ['src/features/chess/**', 'src/features/auth/**'],
      exclude: ['**/*.test.{ts,tsx}'],
      reporter: ['text', 'html'],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100
      }
    }
  }
})
