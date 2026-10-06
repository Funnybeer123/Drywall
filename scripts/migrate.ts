import { loadEnv } from './env'
loadEnv()

const { db } = await import('../src/db')

if (process.env.DATABASE_URL) {
  const { migrate } = await import('drizzle-orm/node-postgres/migrator')
  await migrate(db, { migrationsFolder: './drizzle' })
} else {
  const { migrate } = await import('drizzle-orm/pglite/migrator')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await migrate(db as any, { migrationsFolder: './drizzle' })
}
console.log('✔ Database migrated')
process.exit(0)
