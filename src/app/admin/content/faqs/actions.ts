'use server'

import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { faqs } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { guard, int, reqStr, ValidationError, type ActionState } from '@/lib/action-state'
import { revalidateContent, sortValue } from '../lib'

export async function saveFaqAction(id: number | null, _: ActionState, fd: FormData): Promise<ActionState> {
  await requireUser('content:manage')
  return guard(async () => {
    const values = {
      question: reqStr(fd, 'question', 'Question').slice(0, 300),
      answer: reqStr(fd, 'answer', 'Answer').slice(0, 5000),
      sort: sortValue(fd),
    }
    if (id == null) {
      await db.insert(faqs).values(values)
    } else {
      const updated = await db.update(faqs).set(values).where(eq(faqs.id, id)).returning({ id: faqs.id })
      if (!updated.length) throw new ValidationError('This question was deleted.')
    }
    revalidateContent()
    redirect('/admin/content/faqs')
  })
}

export async function deleteFaqAction(fd: FormData): Promise<void> {
  await requireUser('content:manage')
  const id = int(fd, 'id')
  if (id) await db.delete(faqs).where(eq(faqs.id, id))
  revalidateContent()
  redirect('/admin/content/faqs')
}
