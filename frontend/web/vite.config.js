import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 使用相对路径，适配 Walrus 等 CDN 部署
  build: {
    rollupOptions: {
      output: {
        manualChunks: undefined, // 禁用代码分割警告
      },
    },
  },
  optimizeDeps: {
    include: [
      'bn.js',
      'elliptic',
      'buffer'
    ],
    exclude: [
      'rpc-websockets/dist/lib/client',
      'rpc-websockets/dist/lib/client/websocket.browser'
    ]
  },
  define: {
    // 为浏览器环境提供 process.env 的兼容
    'process.env': {},
    'process.argv': [],
    global: 'globalThis',
  },
  resolve: {
    alias: {
      // 如果需要的话可以添加路径别号
      '@': '/src',
      buffer: 'buffer',
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
  },
  server: {
    fs: {
      allow: ['..']
    }
  }
})
