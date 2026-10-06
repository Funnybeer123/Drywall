'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { invites, users } from '@/db/schema'
import { createSession, hashPassword } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { toE164 } from '@/lib/utils'
import type { ActionState } from '@/lib/action-state'

const MIN_PASSWORD = 10

/** Public action: the token itself is the credential. */
export async function acceptInviteAction(token: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
  if (!rateLimit(`invite:${ip}`, 10, 15 * 60 * 1000)) return { error: 'Too many attempts. Try again in 15 minutes.' }

  const name = String(fd.get('name') ?? '').trim().slice(0, 120)
  const phoneRaw = String(fd.get('phone') ?? '').trim()
  const password = String(fd.get('password') ?? '')
  const confirm = String(fd.get('confirm') ?? '')

  if (!name) return { error: 'Please enter your name.' }
  if (phoneRaw && !toE164(phoneRaw)) return { error: 'Enter a valid 10-digit phone number, or leave it blank.' }
  if (password.length < MIN_PASSWORD) return { error: `Password must be at least ${MIN_PASSWORD} characters.` }
  if (password.length > 200) return { error: 'Password is too long.' }
  if (password !== confirm) return { error: "Passwords don't match." }

  const [inv] = await db
    .select()
    .from(invites)
    .where(and(eq(invites.token, token), isNull(invites.acceptedAt), gt(invites.expiresAt, new Date())))
  if (!inv) return { error: 'This link is no longer valid. Ask the owner to send a new one.' }

  const [existing] = await db.select().from(users).where(eq(users.email, inv.email))
  if (existing && !existing.active) return { error: 'This account has been deactivated. Ask the owner to reactivate it.' }

  const passwordHash = await hashPassword(password)

  // Claim the invite first so the same link can't be used twice (e.g. a double-tap).
  const claimed = await db
    .update(invites)
    .set({ acceptedAt: new Date() })
    .where(and(eq(invites.id, inv.id), isNull(invites.acceptedAt)))
    .returning({ id: invites.id })
  if (claimed.length === 0) return { error: 'This link has already been used. Try signing in.' }

  let userId: number
  if (existing) {
    // Password reset for someone already on the team: keep their role and pay rate.
    await db
      .update(users)
      .set({ passwordHash, name, ...(phoneRaw ? { phone: phoneRaw } : {}) })
      .where(eq(users.id, existing.id))
    userId = existing.id
  } else {
    const [created] = await db
      .insert(users)
      .values({
        name,
        email: inv.email,
        phone: phoneRaw || null,
        passwordHash,
        role: inv.role,
        payRateCents: inv.payRateCents,
        active: true,
      })
      .returning({ id: users.id })
    userId = created.id
  }

  await createSession(userId)
  redirect('/admin')
}
