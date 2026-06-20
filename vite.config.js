import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

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
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  
  // ✅ TAMBAHKAN KONFIGURASI BUILD INI
  build: {
    // Naikkan limit warning (default 500kB)
    chunkSizeWarningLimit: 1000,
    
    rollupOptions: {
      output: {
        // ✅ PISAHKAN LIBRARY BESAR KE CHUNK TERPISAH
        manualChunks: {
          // React core (~40kB)
          'vendor-react': ['react', 'react-dom'],
          
          // Recharts - library chart paling berat (~200kB)
          'vendor-recharts': ['recharts'],
          
          // date-fns untuk format tanggal (~80kB)
          'vendor-date': ['date-fns'],
          
          // Supabase client (~100kB)
          'vendor-supabase': ['@supabase/supabase-js'],
          
          // Lucide icons (~150kB)
          'vendor-icons': ['lucide-react'],
          
          // Toast notifications (~20kB)
          'vendor-toast': ['react-hot-toast'],
        },
        
        // ✅ FORMAT NAMA FILE YANG JELAS
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      }
    },
    
    // ✅ MINIFY UNTUK PRODUCTION
    minify: 'esbuild',
    sourcemap: false,
  },
  
  // ✅ OPTIMASI UNTUK DEVELOPMENT
  server: {
    port: 5173,
    strictPort: true,
  },
})