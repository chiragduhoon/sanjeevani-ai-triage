import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const BACKEND = env.VITE_BACKEND_URL || ''

  return {
    plugins: [react()],
    define: {
      __BACKEND_URL__: JSON.stringify(BACKEND),
    },
    server: {
      port: 5173,
      proxy: {
        '/triage': 'http://localhost:8000',
        '/health': 'http://localhost:8000',
        '/api': 'http://localhost:8000',
        '/uploads': 'http://localhost:8000',
        '/ws': { target: 'ws://localhost:8000', ws: true },
      },
    },
  }
})
