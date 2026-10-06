'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, isNull, ne, sql } from 'drizzle-orm'
import { db } from '@/db'
import { invites, users, roleEnum, type Role } from '@/db/schema'
import { requireUser, type SessionUser } from '@/lib/auth'
import { bool, int, reqStr, str, ValidationError } from '@/lib/action-state'
import { sendEmail } from '@/lib/email'
import { parseDollars } from '@/lib/money'
import { ROLE_LABELS } from '@/lib/permissions'
import { appUrl, getSettings } from '@/lib/settings'
import { sendSms } from '@/lib/sms'
import { formatPhone, newToken, toE164 } from '@/lib/utils'
import { layout } from '@/emails/templates'
import { INVITE_DAYS, type LinkActionState } from './types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function parseRole(fd: FormData): Role {
  const r = str(fd, 'role')
  if (!r || !(roleEnum.enumValues as readonly string[]).includes(r)) throw new ValidationError('Choose a role.')
  return r as Role
}

function parsePayRate(fd: FormData): number {
  const raw = str(fd, 'payRate')
  if (raw == null) return 0
  const cents = parseDollars(raw)
  if (cents == null || cents < 0 || cents > 100_000) throw new ValidationError('Pay rate must be a dollar amount between $0 and $1,000/hr.')
  return cents
}

function parseEmail(fd: FormData): string {
  const email = reqStr(fd, 'email', 'Email').toLowerCase()
  if (!EMAIL_RE.test(email) || email.length > 200) throw new ValidationError('Enter a valid email address.')
  return email
}

function expiry() {
  return new Date(Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000)
}

async function emailInvite(opts: {
  to: string
  name: string
  role: Role
  token: string
  from: SessionUser
  reset: boolean
}): Promise<{ ok: boolean; error?: string }> {
  const s = await getSettings()
  const url = appUrl(`/invite/${opts.token}`)
  const first = opts.name.split(' ')[0]
  const msg = opts.reset
    ? layout(s, {
        preheader: 'Set a new password for the team dashboard',
        heading: 'Set a new password',
        paragraphs: [
          `Hi ${first}, ${opts.from.name} sent you a link to set a new password for the ${s.businessName} team dashboard.`,
          `This link expires in ${INVITE_DAYS} days. If you didn't expect this, you can ignore this email.`,
        ],
        cta: { label: 'Set new password', url },
      })
    : layout(s, {
        preheader: `${opts.from.name} invited you to join ${s.businessName}`,
        heading: `Join ${s.businessName}`,
        paragraphs: [
          `Hi ${first}, ${opts.from.name} invited you to join ${s.businessName} on the team dashboard.`,
          `You'll be added as: ${ROLE_LABELS[opts.role]}. Click the button below to choose a password and get started — it works great on your phone.`,
          `This invite expires in ${INVITE_DAYS} days.`,
        ],
        cta: { label: 'Accept invite', url },
      })
  return sendEmail({
    to: opts.to,
    subject: opts.reset
      ? `Set a new password — ${s.businessName}`
      : `${opts.from.name} invited you to join ${s.businessName} on the team dashboard`,
    ...msg,
    replyTo: opts.from.email,
  })
}

function deliveryMessage(sent: { ok: boolean; error?: string }, to: string, what: string): string {
  if (!sent.ok) return `${what} created, but the email to ${to} failed (${sent.error ?? 'unknown error'}). Copy the link below and text it to them.`
  if (!process.env.RESEND_API_KEY) return `${what} created. Email isn't set up yet, so copy the link below and text it to them.`
  return `${what} emailed to ${to}. You can also copy the link below and text it to them.`
}

async function wrap(fn: () => Promise<LinkActionState>): Promise<LinkActionState> {
  try {
    return await fn()
  } catch (e) {
    if (e instanceof ValidationError) return { error: e.message }
    throw e
  }
}

// ---------- Invites ----------

export async function inviteAction(_: LinkActionState, fd: FormData): Promise<LinkActionState> {
  const me = await requireUser('team:manage')
  return wrap(async () => {
    const name = reqStr(fd, 'name', 'Name').slice(0, 120)
    const email = parseEmail(fd)
    const phone = str(fd, 'phone')
    if (phone && !toE164(phone)) throw new ValidationError('Enter a valid 10-digit phone number, or leave it blank.')
    const role = parseRole(fd)
    const payRateCents = parsePayRate(fd)

    const [existing] = await db.select({ id: users.id, active: users.active }).from(users).where(eq(users.email, email))
    if (existing) {
      throw new ValidationError(
        existing.active
          ? 'That email already belongs to someone on your team. Open their profile to reset their password.'
          : 'That email belongs to a deactivated team member. Open their profile to reactivate them.',
      )
    }

    // Replace any earlier pending invite for the same email so only one link works.
    await db.delete(invites).where(and(eq(invites.email, email), isNull(invites.acceptedAt)))
    const token = newToken()
    await db.insert(invites).values({ email, name, role, payRateCents, token, expiresAt: expiry(), createdBy: me.id })
    const link = appUrl(`/invite/${token}`)

    const sent = await emailInvite({ to: email, name, role, token, from: me, reset: false })
    let message = deliveryMessage(sent, email, 'Invite')
    if (phone) {
      const s = await getSettings()
      const sms = await sendSms(phone, `${me.name} invited you to join ${s.businessName} on the team dashboard. Set up your login here: ${link}`)
      if (!sms.ok) message += ` The text message failed (${sms.error ?? 'unknown error'}).`
      else if (process.env.TWILIO_ACCOUNT_SID) message += ` We also texted the link to ${formatPhone(phone)}.`
    }
    revalidatePath('/admin/team')
    return { ok: true, message, link }
  })
}

export async function resendInviteAction(fd: FormData): Promise<void> {
  const me = await requireUser('team:manage')
  const id = int(fd, 'id')
  if (!id) return
  const [inv] = await db.select().from(invites).where(and(eq(invites.id, id), isNull(invites.acceptedAt)))
  if (!inv) return
  await db.update(invites).set({ expiresAt: expiry() }).where(eq(invites.id, id))
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, inv.email))
  await emailInvite({ to: inv.email, name: inv.name, role: inv.role, token: inv.token, from: me, reset: !!existing })
  revalidatePath('/admin/team')
}

export async function revokeInviteAction(fd: FormData): Promise<void> {
  await requireUser('team:manage')
  const id = int(fd, 'id')
  if (!id) return
  await db.delete(invites).where(and(eq(invites.id, id), isNull(invites.acceptedAt)))
  revalidatePath('/admin/team')
}

// ---------- Team members ----------

async function activeOwnerCount(excludingId: number) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.role, 'owner'), eq(users.active, true), ne(users.id, excludingId)))
  return Number(row?.n ?? 0)
}

export async function updateUserAction(userId: number, _: LinkActionState, fd: FormData): Promise<LinkActionState> {
  const me = await requireUser('team:manage')
  return wrap(async () => {
    const [target] = await db.select().from(users).where(eq(users.id, userId))
    if (!target) throw new ValidationError('That team member no longer exists.')

    const name = reqStr(fd, 'name', 'Name').slice(0, 120)
    const email = parseEmail(fd)
    const phone = str(fd, 'phone')?.slice(0, 40) ?? null
    const role = parseRole(fd)
    const payRateCents = parsePayRate(fd)
    const active = bool(fd, 'active')

    if (target.id === me.id) {
      if (role !== 'owner') throw new ValidationError("You can't remove your own owner role. Ask another owner to do it.")
      if (!active) throw new ValidationError("You can't deactivate your own account.")
    }
    const wasActiveOwner = target.role === 'owner' && target.active
    const staysActiveOwner = role === 'owner' && active
    if (wasActiveOwner && !staysActiveOwner && (await activeOwnerCount(target.id)) === 0) {
      throw new ValidationError('There must always be at least one active owner.')
    }

    if (email !== target.email) {
      const [clash] = await db.select({ id: users.id }).from(users).where(eq(users.email, email))
      if (clash) throw new ValidationError('Another team member already uses that email.')
    }

    await db.update(users).set({ name, email, phone, role, payRateCents, active }).where(eq(users.id, userId))
    revalidatePath('/admin/team')
    revalidatePath(`/admin/team/${userId}`)
    return { ok: true, message: 'Saved.' }
  })
}

export async function resetPasswordAction(userId: number, _: LinkActionState, _fd: FormData): Promise<LinkActionState> {
  const me = await requireUser('team:manage')
  void _fd
  return wrap(async () => {
    const [target] = await db.select().from(users).where(eq(users.id, userId))
    if (!target) throw new ValidationError('That team member no longer exists.')
    if (!target.active) throw new ValidationError('Reactivate this person first, then send a password reset.')

    await db.delete(invites).where(and(eq(invites.email, target.email), isNull(invites.acceptedAt)))
    const token = newToken()
    await db.insert(invites).values({
      email: target.email,
      name: target.name,
      role: target.role,
      payRateCents: target.payRateCents,
      token,
      expiresAt: expiry(),
      createdBy: me.id,
    })
    const sent = await emailInvite({ to: target.email, name: target.name, role: target.role, token, from: me, reset: true })
    revalidatePath('/admin/team')
    return { ok: true, message: deliveryMessage(sent, target.email, 'Password reset link'), link: appUrl(`/invite/${token}`) }
  })
}
