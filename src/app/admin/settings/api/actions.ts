'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { apiKeys } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { guard, reqStr, ValidationError } from '@/lib/action-state'
import { API_SCOPES, generateApiKey } from '@/lib/api/keys'

export type CreateKeyState = { ok?: boolean; error?: string; message?: string; key?: string }

export async function createApiKey(_: CreateKeyState, fd: FormData): Promise<CreateKeyState> {
  const user = await requireUser('settings:manage')
  let key = ''
  const res = await guard(async () => {
    const name = reqStr(fd, 'name', 'Name').slice(0, 80)
    const scopes = fd.getAll('scope').map(String).filter((s) => s in API_SCOPES)
    if (!scopes.length) throw new ValidationError('Pick at least one permission.')
    const k = generateApiKey()
    await db.insert(apiKeys).values({ name, prefix: k.prefix, keyHash: k.hash, scopes, userId: user.id })
    key = k.key
  })
  if (res.error) return res
  revalidatePath('/admin/settings/api')
  return { ok: true, key, message: 'Key created. Copy it now — it won’t be shown again.' }
}

export async function revokeApiKey(fd: FormData): Promise<void> {
  await requireUser('settings:manage')
  const id = Number(fd.get('id'))
  if (!Number.isInteger(id) || id <= 0) return
  await db.update(apiKeys).set({ revokedAt: new Date() }).where(and(eq(apiKeys.id, id), isNull(apiKeys.revokedAt)))
  revalidatePath('/admin/settings/api')
}
