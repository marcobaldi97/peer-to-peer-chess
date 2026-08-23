import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const source = join(root, 'node_modules', 'stockfish', 'bin')
const destination = join(root, 'public', 'stockfish')

mkdirSync(destination, { recursive: true })

for (const file of [
  'stockfish-18-lite-single.js',
  'stockfish-18-lite-single.wasm'
]) {
  copyFileSync(join(source, file), join(destination, file))
}
