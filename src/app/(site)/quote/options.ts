export const JOB_TYPES = [
  'Drywall repair',
  'Hang & finish (new construction / remodel)',
  'Texture / popcorn removal',
  'Water damage repair',
  'Commercial',
  'Other',
] as const

export const TIMEFRAMES = ['ASAP', 'Within 2 weeks', 'Within a month', 'Flexible'] as const

export const SOURCES = [
  'Google',
  'Facebook',
  'Nextdoor',
  'Referral',
  'Saw a truck/sign',
  'Repeat customer',
  'Other',
] as const

export const MAX_PHOTOS = 6

/**
 * Turns a `?type=` value (a job type, a service slug like "water-damage", or a
 * loose keyword) into one of JOB_TYPES. Returns '' when nothing matches.
 */
export function matchJobType(raw: string | undefined | null): string {
  if (!raw) return ''
  const q = raw.toLowerCase().trim()
  const exact = JOB_TYPES.find((t) => t.toLowerCase() === q)
  if (exact) return exact
  if (/water|leak|flood/.test(q)) return 'Water damage repair'
  if (/textur|popcorn|ceiling|knockdown|orange/.test(q)) return 'Texture / popcorn removal'
  if (/commercial|office|retail|tenant/.test(q)) return 'Commercial'
  if (/hang|finish|construction|remodel|basement|addition/.test(q)) return 'Hang & finish (new construction / remodel)'
  if (/repair|patch|hole|crack/.test(q)) return 'Drywall repair'
  return ''
}
