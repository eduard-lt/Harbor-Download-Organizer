/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// E2E-only Vite config — aliases Tauri APIs to mocks so Playwright
// can test the full UI without the Tauri runtime.
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@tauri-apps/api/core': path.resolve(__dirname, 'src/mocks/tauri-api.ts'),
            '@tauri-apps/api/event': path.resolve(__dirname, 'src/mocks/tauri-api.ts'),
            '@tauri-apps/api/window': path.resolve(__dirname, 'src/mocks/tauri-api.ts'),
            '@tauri-apps/plugin-shell': path.resolve(__dirname, 'src/mocks/tauri-api.ts'),
            '@tauri-apps/plugin-dialog': path.resolve(__dirname, 'src/mocks/tauri-api.ts'),
            '@tauri-apps/plugin-notification': path.resolve(__dirname, 'src/mocks/tauri-api.ts'),
        },
    },
    server: {
        port: 5174, // separate port from dev server
    },
})
