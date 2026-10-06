import 'server-only'
import { cache } from 'react'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { settings, type Settings } from '@/db/schema'

/** Business settings (single row). Created with defaults on first use. */
export const getSettings = cache(async (): Promise<Settings> => {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1))
  if (row) return row
  const [created] = await db.insert(settings).values({ id: 1 }).onConflictDoNothing().returning()
  if (created) return created
  const [again] = await db.select().from(settings).where(eq(settings.id, 1))
  return again
})

export function appUrl(path = ''): string {
  const base = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')
  return base + path
}
