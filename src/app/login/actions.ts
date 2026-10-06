'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { createSession, destroySession, verifyPassword } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import type { ActionState } from '@/lib/action-state'

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = String(fd.get('email') ?? '').trim().toLowerCase()
  const password = String(fd.get('password') ?? '')
  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0] ?? 'local'
  if (!rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) return { error: 'Too many attempts. Try again in 15 minutes.' }

  const [user] = await db.select().from(users).where(eq(users.email, email))
  if (!user || !user.passwordHash || !user.active || !(await verifyPassword(password, user.passwordHash))) {
    return { error: 'Email or password is incorrect.' }
  }
  await createSession(user.id)
  redirect('/admin')
}

export async function logoutAction() {
  await destroySession()
  redirect('/login')
}
