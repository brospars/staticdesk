// Fails the build when the loader exceeds its gzip budget (see ROADMAP, phase 2).
import { readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'

const BUDGET_BYTES = 15 * 1024
const file = new URL('../dist/widget.js', import.meta.url)
const size = gzipSync(readFileSync(file)).length

console.log(`widget.js: ${(size / 1024).toFixed(2)} kB gzip (budget ${BUDGET_BYTES / 1024} kB)`)

if (size > BUDGET_BYTES) {
  console.error('widget.js exceeds its size budget.')
  process.exit(1)
}
