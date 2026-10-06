import 'server-only'
import { sql, type SQL, type AnyColumn } from 'drizzle-orm'
import { BUSINESS_TZ } from '@/lib/dates'

/**
 * Timestamps are stored as UTC wall-clock time (timestamp without time zone).
 * This converts one to a 'YYYY-MM-DD' date in the business's time zone.
 */
export function localDate(col: AnyColumn | SQL): SQL<string> {
  return sql<string>`to_char((${col} at time zone 'UTC') at time zone ${sql.raw(`'${BUSINESS_TZ.replace(/'/g, '')}'`)}, 'YYYY-MM-DD')`
}
