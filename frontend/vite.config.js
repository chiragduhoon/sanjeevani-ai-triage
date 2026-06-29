import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/triage': BACKEND_URL,
      '/health': BACKEND_URL,
      '/api': BACKEND_URL,
      '/uploads': BACKEND_URL,
      '/ws': { target: BACKEND_URL.replace('https', 'wss'), ws: true },
    },
  },
})
