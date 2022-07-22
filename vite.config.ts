import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import eslintPlugin from '@nabla/vite-plugin-eslint'
import mkcert from 'vite-plugin-mkcert'

// https://vitejs.dev/config/
export default defineConfig({
  assetsInclude: ['**/*.glb'],
  plugins: [mkcert(), eslintPlugin(), tsconfigPaths({ loose: true }), react()],
  server: {
    https: true,
    open: true
  },
  preview: {
    https: true,
    open: true
  }
})
