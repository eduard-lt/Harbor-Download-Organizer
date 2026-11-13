/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // `tauri dev` loads this exact URL (devUrl in tauri.conf.json), so fail
  // instead of silently moving to another port.
  server: { port: 5173, strictPort: true },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'src/setupTests.ts', 'src/**/*.test.{ts,tsx}', 'src/mocks/**', 'src/vite-env.d.ts'],
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
      },
    },
  },
})
