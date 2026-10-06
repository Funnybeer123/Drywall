'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { settings, type Settings } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { bool, guard, reqStr, str, ValidationError, type ActionState } from '@/lib/action-state'
import { getSettings } from '@/lib/settings'
import { filesFrom, saveUpload } from '@/lib/storage'
import { sendEmail } from '@/lib/email'
import { sendSms } from '@/lib/sms'
import { formatPhone, toE164 } from '@/lib/utils'
import { layout } from '@/emails/templates'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HEX_RE = /^#[0-9a-fA-F]{6}$/

// ---------- validation helpers ----------

function text(fd: FormData, key: string, max: number): string {
  return (str(fd, key) ?? '').slice(0, max)
}

function reqText(fd: FormData, key: string, label: string, max: number): string {
  return reqStr(fd, key, label).slice(0, max)
}

function numInRange(fd: FormData, key: string, label: string, min: number, max: number, opts: { integer?: boolean } = {}): number {
  const raw = str(fd, key)
  const n = raw == null ? NaN : Number(raw)
  if (!Number.isFinite(n) || n < min || n > max || (opts.integer && !Number.isInteger(n))) {
    throw new ValidationError(`${label} must be ${opts.integer ? 'a whole number' : 'a number'} between ${min} and ${max}.`)
  }
  return n
}

function optEmail(fd: FormData, key: string, label: string): string {
  const v = (str(fd, key) ?? '').toLowerCase()
  if (v && (!EMAIL_RE.test(v) || v.length > 200)) throw new ValidationError(`${label} must be a valid email address.`)
  return v
}

function optPhone(fd: FormData, key: string, label: string): string {
  const v = str(fd, key) ?? ''
  if (v && !toE164(v)) throw new ValidationError(`${label} must be a valid 10-digit phone number.`)
  return v ? formatPhone(v) : ''
}

function optHttpsUrl(fd: FormData, key: string, label: string): string {
  const v = str(fd, key) ?? ''
  if (!v) return ''
  if (!v.startsWith('https://')) throw new ValidationError(`${label} must start with https://`)
  try {
    new URL(v)
  } catch {
    throw new ValidationError(`${label} is not a valid link.`)
  }
  if (v.length > 500) throw new ValidationError(`${label} is too long.`)
  return v
}

async function save(values: Partial<Omit<Settings, 'id'>>): Promise<ActionState> {
  await getSettings() // makes sure the row exists
  await db.update(settings).set({ ...values, updatedAt: new Date() }).where(eq(settings.id, 1))
  revalidatePath('/', 'layout')
  return { ok: true, message: 'Saved.' }
}

// ---------- sections ----------

export async function saveBusinessAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser('settings:manage')
  return guard(async () => {
    const phone = optPhone(fd, 'phone', 'Business phone')
    if (!phone) throw new ValidationError('Business phone is required.')
    const email = optEmail(fd, 'email', 'Business email')
    if (!email) throw new ValidationError('Business email is required.')
    const state = reqText(fd, 'state', 'State', 20).toUpperCase()
    return save({
      businessName: reqText(fd, 'businessName', 'Business name', 120),
      ownerName: reqText(fd, 'ownerName', 'Owner name', 120),
      tagline: text(fd, 'tagline', 200),
      phone,
      email,
      address: text(fd, 'address', 200),
      city: reqText(fd, 'city', 'City', 120),
      state,
      licenseNumber: text(fd, 'licenseNumber', 80),
      insured: bool(fd, 'insured'),
      yearsInBusiness: numInRange(fd, 'yearsInBusiness', 'Years in business', 0, 100, { integer: true }),
      aboutText: text(fd, 'aboutText', 5000),
    })
  })
}

export async function saveBrandingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser('settings:manage')
  return guard(async () => {
    const accentColor = reqStr(fd, 'accentColor', 'Accent color')
    if (!HEX_RE.test(accentColor)) throw new ValidationError('Accent color must be a hex color like #ea580c.')

    const values: Partial<Settings> = {
      accentColor: accentColor.toLowerCase(),
      heroHeadline: reqText(fd, 'heroHeadline', 'Headline', 160),
      heroSubhead: reqText(fd, 'heroSubhead', 'Subheadline', 400),
    }
    const [logo] = filesFrom(fd, 'logo')
    if (logo) {
      if (!logo.type.startsWith('image/') || logo.type === 'image/heic') {
        throw new ValidationError('Logo must be a JPG, PNG or WebP image.')
      }
      values.logoUrl = await saveUpload(logo, 'branding')
    } else if (bool(fd, 'removeLogo')) {
      values.logoUrl = null
    }
    return save(values)
  })
}

export async function saveInvoicingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser('settings:manage')
  return guard(async () => {
    const pct = numInRange(fd, 'taxRatePct', 'Tax rate', 0, 25)
    return save({
      taxRateBps: Math.round(pct * 100),
      paymentTermsDays: numInRange(fd, 'paymentTermsDays', 'Payment terms', 0, 365, { integer: true }),
      invoiceFooter: text(fd, 'invoiceFooter', 1000),
    })
  })
}

export async function saveNotificationsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser('settings:manage')
  return guard(async () =>
    save({
      notifyEmail: optEmail(fd, 'notifyEmail', 'Notification email'),
      notifyPhone: optPhone(fd, 'notifyPhone', 'Notification phone'),
    }),
  )
}

export async function saveSchedulingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser('settings:manage')
  return guard(async () => {
    const days = [...new Set(fd.getAll('workDays').map(Number))].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort()
    if (days.length === 0) throw new ValidationError('Pick at least one work day.')
    return save({
      dailyCapacity: numInRange(fd, 'dailyCapacity', 'Jobs at once', 1, 50, { integer: true }),
      workDays: days.join(','),
    })
  })
}

export async function saveMarketingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser('settings:manage')
  return guard(async () =>
    save({
      googleReviewUrl: optHttpsUrl(fd, 'googleReviewUrl', 'Google review link'),
      facebookUrl: optHttpsUrl(fd, 'facebookUrl', 'Facebook link'),
      instagramUrl: optHttpsUrl(fd, 'instagramUrl', 'Instagram link'),
      reviewRequestsEnabled: bool(fd, 'reviewRequestsEnabled'),
      reviewDelayDays: numInRange(fd, 'reviewDelayDays', 'Review request delay', 0, 60, { integer: true }),
      overdueRemindersEnabled: bool(fd, 'overdueRemindersEnabled'),
    }),
  )
}

// ---------- tests ----------

export async function sendTestEmailAction(_: ActionState, _fd: FormData): Promise<ActionState> {
  const me = await requireUser('settings:manage')
  void _fd
  const s = await getSettings()
  const to = s.notifyEmail || s.email || me.email
  const msg = layout(s, {
    heading: 'Test email ✔',
    paragraphs: [
      `This is a test from your ${s.businessName} dashboard, sent by ${me.name}.`,
      'If you are reading this, email notifications are working. New quote requests will arrive at this address.',
    ],
  })
  const r = await sendEmail({ to, subject: `Test email — ${s.businessName}`, ...msg })
  revalidatePath('/admin/settings/notifications')
  if (!r.ok) return { error: `Email to ${to} failed: ${r.error ?? 'unknown error'}` }
  if (!process.env.RESEND_API_KEY) return { ok: true, message: `Email isn't configured (no RESEND_API_KEY), so the test to ${to} was printed to the server log instead.` }
  return { ok: true, message: `Test email sent to ${to}. Check your inbox (and spam folder).` }
}

export async function sendTestSmsAction(_: ActionState, _fd: FormData): Promise<ActionState> {
  const me = await requireUser('settings:manage')
  void _fd
  const s = await getSettings()
  const to = s.notifyPhone || s.phone || me.phone
  if (!to) return { error: 'Add a notification phone number first.' }
  const r = await sendSms(to, `${s.businessName}: test text from your dashboard. Text notifications are working!`)
  revalidatePath('/admin/settings/notifications')
  if (!r.ok) return { error: `Text to ${formatPhone(to)} failed: ${r.error ?? 'unknown error'}` }
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_FROM_NUMBER) {
    return { ok: true, message: `Texting isn't configured (Twilio keys missing), so the test to ${formatPhone(to)} was printed to the server log instead.` }
  }
  return { ok: true, message: `Test text sent to ${formatPhone(to)}.` }
}
