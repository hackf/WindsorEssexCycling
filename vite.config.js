import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    // Disable inline assets, otherwise icon images will be converted to base64
    // Leaflet does not work with base64 unless you create custom div icons
    assetsInlineLimit: 0,
  }
})
