import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa' // Import plugin

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Catat Keuangan Pro',
        short_name: 'KeuanganPro',
        description: 'Aplikasi Pencatat Keuangan Pribadi Powerful',
        theme_color: '#0f172a', // Warna dark mode
        background_color: '#0f172a',
        display: 'standalone', // INI KUNCINYA! (Hilangkan address bar browser)
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png', // Siapkan gambar ini di folder 'public'
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png', // Siapkan gambar ini di folder 'public'
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})