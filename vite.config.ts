import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import eslintPlugin from '@nabla/vite-plugin-eslint'
import mkcert from 'vite-plugin-mkcert'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [mkcert(), eslintPlugin(), tsconfigPaths({ loose: true }), react()],
  server: {
    https: true,
    open: true
    // port: 1337,
    // proxy: {
    //   '/api': {
    //     target: 'https://seb.xrplatform.io',
    //     changeOrigin: true,
    //     secure: false
    //     // ws: true,
    //   }
    // }
  },
  preview: {
    https: true,
    open: true
    // port: 8008,
    // proxy: {
    //   '/api': {
    //     target: 'https://peb.xrplatform.io',
    //     changeOrigin: true,
    //     secure: false
    //     // ws: true,
    //   }
    // }
  }
})
