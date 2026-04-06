// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  build: {
    chunkSizeWarningLimit: 600,

    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) {
              return 'vendor-react';
            }
            if (id.includes('recharts')) {
              return 'vendor-recharts';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (
              id.includes('d3-shape') ||
              id.includes('d3-scale') ||
              id.includes('d3-array')
            ) {
              return 'vendor-d3';
            }
          }
        },
      },
    },
  },
});
