import { parseISODate } from '@/lib/dates'

const fmtFriendly = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
const fmtLong = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })

/** "Wed, Oct 7" */
export function friendlyDate(iso: string): string {
  return fmtFriendly.format(parseISODate(iso))
}

/** "Wednesday, October 7" */
export function longDate(iso: string): string {
  return fmtLong.format(parseISODate(iso))
}

/** Splits admin-entered text into paragraphs on blank lines (or single newlines). */
export function paragraphs(text: string | null | undefined): string[] {
  return (text ?? '')
    .split(/\n\s*\n|\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}
