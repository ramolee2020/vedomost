/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/vedomost/',
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    manifest: {
      name: 'Ведомость нормативов', short_name: 'Ведомость', lang: 'ru',
      start_url: '/vedomost/', display: 'standalone', background_color: '#ffffff', theme_color: '#1d4ed8',
      icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }],
    },
  })],
  test: { environment: 'node' },
});
