import { clsx, type ClassValue } from 'clsx'
import { customAlphabet } from 'nanoid'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// URL-safe, unguessable tokens for public invoice/estimate/invite links.
export const newToken = customAlphabet('23456789abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ', 24)

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** US phone → E.164 (+15555550123). Returns null if it doesn't look like a phone number. */
export function toE164(phone: string | null | undefined): string | null {
  if (!phone) return null
  const trimmed = phone.trim()
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '')
    return digits.length >= 10 ? `+${digits}` : null
  }
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return null
}

export function formatPhone(phone: string | null | undefined): string {
  const e = toE164(phone)
  if (!e || !e.startsWith('+1') || e.length !== 12) return phone ?? ''
  return `(${e.slice(2, 5)}) ${e.slice(5, 8)}-${e.slice(8)}`
}

export function telHref(phone: string): string {
  return `tel:${toE164(phone) ?? phone.replace(/[^\d+]/g, '')}`
}

export function smsHref(phone: string): string {
  return `sms:${toE164(phone) ?? phone.replace(/[^\d+]/g, '')}`
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

export function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
