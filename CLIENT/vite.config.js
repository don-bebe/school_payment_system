import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.js',
  },
  server: {
    port: 5173,
    strictPort: true,
    headers: {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        // Allow inline styles + Google Fonts stylesheets
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        // Allow Google Fonts to serve the actual font files
        "font-src 'self' https://fonts.gstatic.com data:",
        // Allow XHR/fetch to both API ports
        "connect-src 'self' http://localhost:5221 http://localhost:5000",
        "img-src 'self' data: blob:",
        "media-src 'self'",
      ].join('; '),
    },
  },
  // Ensures assets resolve correctly when loaded from Electron's file:// origin
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})