// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react({
    // Use the automatic JSX runtime so test files (and any .jsx file)
    // do not need an explicit `import React from 'react'`. This is
    // the modern React 19 convention.
    jsxRuntime: 'automatic',
  })],

  // esbuild config — applies to test files too. Sets the JSX runtime
  // to automatic so `React is not defined` errors do not occur in
  // vitest + jsdom.
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react',
  },

  build: {
    chunkSizeWarningLimit: 600,

    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) {
              return 'vendor-react';
            }
            if (id.includes('@supabase/supabase-js') || id.includes('@supabase/')) {
              return 'supabase';
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

  test: {
    // Vitest configuration — Vite-native test runner, no extra config
    // file needed. Uses jsdom for DOM globals + jsdom's window object
    // (required for React Testing Library to render components).
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      // Coverage is opt-in to keep dev installs lean. Run with
      // `npm test -- --coverage` to generate a report.
      reporter: ['text', 'html'],
    },
  },
});
