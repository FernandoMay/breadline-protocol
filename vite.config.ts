import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { copyFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'landing-as-root',
      writeBundle(options) {
        const outDir = options.dir!
        // 1. Preserve React app entry at /app/index.html
        mkdirSync(resolve(outDir, 'app'), { recursive: true })
        copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, 'app/index.html'))
        // 2. Overwrite root with landing page
        copyFileSync(resolve(import.meta.dirname, 'public/landing.html'), resolve(outDir, 'index.html'))
      },
    },
  ],
})
