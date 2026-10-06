import { mkdirSync } from 'node:fs'
import { drizzle as drizzlePg, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { PGlite } from '@electric-sql/pglite'
import * as schema from './schema'

export type DB = NodePgDatabase<typeof schema>

export const PGLITE_DIR = '.data/pglite'

/**
 * Production: real Postgres (Neon) via DATABASE_URL.
 * Local dev: embedded Postgres (PGlite) stored in .data/ — no install needed.
 * Both expose the same Drizzle query API, so the rest of the app doesn't care.
 */
function createDb(): DB {
  if (process.env.DATABASE_URL) {
    return drizzlePg(process.env.DATABASE_URL, { schema })
  }
  mkdirSync('.data', { recursive: true })
  const client = new PGlite(PGLITE_DIR)
  return drizzlePglite(client, { schema }) as unknown as DB
}

// One connection per process, reused across hot reloads in dev. Created lazily on the
// first query so that merely importing this module (e.g. by `next build` workers)
// never opens the database — PGlite's files must only be opened by one process.
const globalForDb = globalThis as unknown as { __db?: DB }
function getDb(): DB {
  return (globalForDb.__db ??= createDb())
}

export const db: DB = new Proxy({} as DB, {
  get(_, prop) {
    const real = getDb()
    const value = Reflect.get(real, prop, real)
    return typeof value === 'function' ? value.bind(real) : value
  },
})

export { schema }
