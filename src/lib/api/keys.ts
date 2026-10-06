import 'server-only'
import { createHash, randomBytes } from 'node:crypto'

export const API_SCOPES = {
  read: 'Read business data (leads, customers, jobs, schedule, invoices, expenses, reports).',
  write: 'Create and update leads, customers, jobs, schedule, estimates, invoice drafts, payments, expenses and labor.',
  content: 'Edit website content: gallery, reviews, services, FAQ, service areas.',
  send: 'Email/text customers (send estimates, invoices and reminders). Leave off unless you want the assistant contacting customers.',
  settings: 'Change business settings (name, phone, hours, tax rate, branding…).',
} as const

export type ApiScope = keyof typeof API_SCOPES

/** New key like `wdk_3f9a…` (shown once). Only its SHA-256 hash is stored. */
export function generateApiKey() {
  const key = 'wdk_' + randomBytes(24).toString('base64url')
  return { key, prefix: key.slice(0, 10), hash: hashApiKey(key) }
}

export function hashApiKey(key: string) {
  return createHash('sha256').update(key).digest('hex')
}
