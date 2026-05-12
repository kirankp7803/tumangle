import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/socket.io': {
        target: 'http://127.0.0.1:8000',
        ws: true,
      },
      '/signup': {
        target: 'http://127.0.0.1:8000',
      },
      '/login': {
        target: 'http://127.0.0.1:8000',
      },
      '/update-profile': {
        target: 'http://127.0.0.1:8000',
      },
      '/upload-avatar': {
        target: 'http://127.0.0.1:8000',
      },
      '/uploads': {
        target: 'http://127.0.0.1:8000',
      },
    },
  },
})
