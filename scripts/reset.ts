import { rmSync } from 'node:fs'
import path from 'node:path'
import { loadEnv } from './env'
loadEnv()

if (process.env.DATABASE_URL) {
  console.error('Refusing to reset: DATABASE_URL is set (this only wipes the local embedded database).')
  process.exit(1)
}
rmSync(path.join(process.env.DATA_DIR || '.data', 'pglite'), { recursive: true, force: true })
console.log('✔ Local database deleted. Run `npm run setup` to recreate it.')
