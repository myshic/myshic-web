/**
 * Vite config for the Netlight Chrome extension.
 *
 * Builds:
 *   - popup.html + React UI → dist/popup.html + assets/
 *   - background service worker → dist/background.js
 *   - Copies manifest.json, rules/, icons/ into dist/
 *
 * Load the dist/ folder as an unpacked extension in Chrome.
 */

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { cpSync, existsSync } from 'fs'

/** Plugin that copies public/ assets into dist/ after build */
function copyPublicAssets() {
  return {
    name: 'copy-public-assets',
    closeBundle() {
      const pub = resolve(__dirname, 'public')
      const dist = resolve(__dirname, 'dist')

      // Copy manifest.json
      cpSync(resolve(pub, 'manifest.json'), resolve(dist, 'manifest.json'))

      // Copy rules/
      if (existsSync(resolve(pub, 'rules'))) {
        cpSync(resolve(pub, 'rules'), resolve(dist, 'rules'), { recursive: true })
      }

      // Copy icons/
      if (existsSync(resolve(pub, 'icons'))) {
        cpSync(resolve(pub, 'icons'), resolve(dist, 'icons'), { recursive: true })
      }

      console.log('✅ Copied manifest.json, rules/, icons/ into dist/')
    }
  }
}

export default defineConfig({
  plugins: [react(), copyPublicAssets()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        background: resolve(__dirname, 'src/background/index.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Service worker must be at dist root as background.js
          if (chunkInfo.name === 'background') return 'background.js'
          return 'assets/[name]-[hash].js'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
  // Disable automatic public dir — we copy manually via the plugin
  publicDir: false,
})
