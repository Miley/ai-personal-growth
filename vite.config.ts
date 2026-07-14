import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['app-icon.svg'],
      manifest: {
        name: 'Another-Me',
        short_name: 'Another-Me',
        description: '私密同伴、表达陪练与英语阅读。',
        theme_color: '#f5f1ea',
        background_color: '#f5f1ea',
        display: 'standalone',
        orientation: 'portrait',
        icons: [{ src: 'app-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
  },
})
