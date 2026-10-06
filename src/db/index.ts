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

const globalForDb = globalThis as unknown as { __db?: DB }

// Reuse one connection across hot reloads in dev.
export const db: DB = globalForDb.__db ?? createDb()
if (process.env.NODE_ENV !== 'production') globalForDb.__db = db

export { schema }
