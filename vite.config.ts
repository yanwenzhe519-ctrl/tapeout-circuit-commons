import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS === 'true' ? '/tapeout-circuit-commons/' : '/',
  server: { port: 4173, host: '127.0.0.1', proxy: { '/api/tapeout-processors': { target: 'https://tapeout.work', changeOrigin: true, secure: false, rewrite: (path) => path.replace('/api/tapeout-processors', '/api/v1/processors') } } }
})
