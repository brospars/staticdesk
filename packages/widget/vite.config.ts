import { defineConfig } from 'vitest/config'

export default defineConfig({
  build: {
    target: 'es2019',
    lib: {
      entry: 'src/index.ts',
      name: 'StaticDesk',
      fileName: () => 'widget.js',
      formats: ['iife'],
    },
  },
  test: {
    environment: 'happy-dom',
  },
})
