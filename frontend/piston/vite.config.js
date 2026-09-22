import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    host: true,
    port: 3000,
    open: false,
    watch: {
      ignored: ['**/public/models/**']
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        digitalTwin: resolve(__dirname, 'digital-twin/index.html')
      }
    }
  }
});

