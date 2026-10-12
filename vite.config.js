import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In development, forward /api/* to Django so the browser sees one origin
    // (no CORS needed locally). In production VITE_API_URL points at the backend.
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
})
