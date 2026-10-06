import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users, type User } from '@/db/schema'
import { can, type Permission } from './permissions'

const COOKIE = 'wd_session'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function secret() {
  const s = process.env.AUTH_SECRET
  if (!s && process.env.NODE_ENV === 'production') throw new Error('AUTH_SECRET is not set')
  return new TextEncoder().encode(s || 'dev-only-insecure-secret-change-me')
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 11)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export async function createSession(userId: number) {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret())
  const jar = await cookies()
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  })
}

export async function destroySession() {
  const jar = await cookies()
  jar.delete(COOKIE)
}

export type SessionUser = Pick<User, 'id' | 'name' | 'email' | 'role' | 'phone'>

/** The logged-in user, re-read from the DB each request so deactivation/role changes apply immediately. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies()
  const token = jar.get(COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    const uid = Number(payload.uid)
    if (!Number.isInteger(uid)) return null
    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, phone: users.phone, active: users.active })
      .from(users)
      .where(eq(users.id, uid))
    if (!user || !user.active) return null
    return { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone }
  } catch {
    return null
  }
})

/** Use at the top of every admin page and server action. */
export async function requireUser(permission?: Permission): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (permission && !can(user, permission)) redirect('/admin?denied=1')
  return user
}
