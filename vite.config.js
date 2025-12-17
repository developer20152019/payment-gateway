
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // Listen on all addresses (0.0.0.0) to allow access via IP
    strictPort: true, 
    proxy: {
      '/api': {
        // Use localhost to allow system-level IPv4/IPv6 resolution
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
        // Add logging to your terminal to debug proxy failures
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log(' [Vite Proxy Error]:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log(' [Vite Proxy Request]:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log(' [Vite Proxy Response]:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  }
});
