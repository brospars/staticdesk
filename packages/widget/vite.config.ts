import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

export default defineConfig({
  define: {
    __VERSION__: JSON.stringify(version),
  },
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
