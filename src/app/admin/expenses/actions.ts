'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { expenses } from '@/db/schema'
import { requireUser, type SessionUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { bool, guard, int, str, ValidationError, type ActionState } from '@/lib/action-state'
import { parseDollars } from '@/lib/money'
import { isValidISODate } from '@/lib/dates'
import { isExpenseCategory } from '@/lib/expense-categories'
import { filesFrom, saveUpload } from '@/lib/storage'
import { canEditExpense, userCanUseProject } from './queries'

async function readExpense(fd: FormData, user: SessionUser) {
  const date = str(fd, 'date')
  if (!isValidISODate(date)) throw new ValidationError('Enter the purchase date.')
  const category = str(fd, 'category')
  if (!isExpenseCategory(category)) throw new ValidationError('Pick a category.')
  const amountCents = parseDollars(str(fd, 'amount'))
  if (amountCents == null || amountCents <= 0) throw new ValidationError('Enter the amount spent.')
  if (amountCents > 100_000_000) throw new ValidationError('That amount looks too large.')

  const projectId = int(fd, 'projectId')
  if (projectId) {
    if (!(await userCanUseProject(user, projectId))) throw new ValidationError('You can only add expenses to jobs you’re assigned to.')
  } else if (!can(user, 'expenses:manage')) {
    throw new ValidationError('Pick the job this purchase was for.')
  }

  return {
    date,
    category,
    amountCents,
    projectId: projectId || null,
    vendor: str(fd, 'vendor')?.slice(0, 120) ?? null,
    description: str(fd, 'description')?.slice(0, 500) ?? null,
  }
}

async function readReceipt(fd: FormData): Promise<string | null> {
  const [file] = filesFrom(fd, 'receipt')
  return file ? saveUpload(file, 'receipts') : null
}

function revalidateExpense(projectId: number | null) {
  revalidatePath('/admin/expenses')
  revalidatePath('/admin/reports')
  revalidatePath('/admin')
  if (projectId) revalidatePath(`/admin/projects/${projectId}`)
}

function destination(fd: FormData, projectId: number | null) {
  return fd.get('returnTo') === 'project' && projectId ? `/admin/projects/${projectId}` : '/admin/expenses'
}

export async function createExpenseAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser('expenses:add')
  let to = ''
  const result = await guard(async () => {
    const values = await readExpense(fd, user)
    const receiptUrl = await readReceipt(fd)
    await db.insert(expenses).values({ ...values, receiptUrl, createdBy: user.id })
    revalidateExpense(values.projectId)
    to = destination(fd, values.projectId)
  })
  if (result.error || !to) return result
  redirect(to)
}

export async function updateExpenseAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser('expenses:add')
  let to = ''
  const result = await guard(async () => {
    const id = int(fd, 'id')
    const [existing] = id ? await db.select().from(expenses).where(eq(expenses.id, id)) : []
    if (!existing) throw new ValidationError('Expense not found.')
    if (!canEditExpense(user, existing)) throw new ValidationError('You can only edit your own expenses within 24 hours.')
    const values = await readExpense(fd, user)
    const newReceipt = await readReceipt(fd)
    const receiptUrl = newReceipt ?? (bool(fd, 'removeReceipt') ? null : existing.receiptUrl)
    await db.update(expenses).set({ ...values, receiptUrl }).where(eq(expenses.id, existing.id))
    revalidateExpense(values.projectId)
    if (existing.projectId && existing.projectId !== values.projectId) revalidateExpense(existing.projectId)
    to = destination(fd, values.projectId)
  })
  if (result.error || !to) return result
  redirect(to)
}

export async function deleteExpenseAction(fd: FormData): Promise<void> {
  const user = await requireUser('expenses:add')
  const id = int(fd, 'id')
  const [existing] = id ? await db.select().from(expenses).where(eq(expenses.id, id)) : []
  if (!existing || !canEditExpense(user, existing)) redirect('/admin/expenses')
  await db.delete(expenses).where(eq(expenses.id, existing.id))
  revalidateExpense(existing.projectId)
  redirect(fd.get('returnTo') === 'project' && existing.projectId ? `/admin/projects/${existing.projectId}` : '/admin/expenses')
}
