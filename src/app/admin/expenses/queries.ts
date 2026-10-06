import 'server-only'
import { and, asc, desc, eq, gte, inArray, isNull, lt, ne, type SQL } from 'drizzle-orm'
import { db } from '@/db'
import { expenses, projectAssignments, projects, users, type Expense } from '@/db/schema'
import type { SessionUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { isExpenseCategory } from '@/lib/expense-categories'
import { addMonths, todayISO } from '@/lib/dates'
import type { ExpenseCategory } from '@/db/schema'

export type ExpenseFilters = {
  month: string | null // 'YYYY-MM', or null for all time
  category: ExpenseCategory | null
  projectId: number | null
  overhead: boolean
}

type SP = Record<string, string | string[] | undefined>
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export function parseExpenseFilters(sp: SP): ExpenseFilters {
  const m = one(sp.month)
  const month = m === 'all' ? null : m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : todayISO().slice(0, 7)
  const c = one(sp.category)
  const p = Number(one(sp.projectId))
  const overhead = one(sp.overhead) === '1' || one(sp.overhead) === 'on'
  return {
    month,
    category: isExpenseCategory(c) ? c : null,
    projectId: !overhead && Number.isInteger(p) && p > 0 ? p : null,
    overhead,
  }
}

export function filtersToQuery(f: ExpenseFilters): string {
  const q = new URLSearchParams()
  q.set('month', f.month ?? 'all')
  if (f.category) q.set('category', f.category)
  if (f.projectId) q.set('projectId', String(f.projectId))
  if (f.overhead) q.set('overhead', '1')
  return q.toString()
}

/** Employees only ever see the expenses they entered themselves. */
export function scopeFor(user: SessionUser): SQL | undefined {
  return can(user, 'expenses:manage') ? undefined : eq(expenses.createdBy, user.id)
}

export async function queryExpenses(f: ExpenseFilters, user: SessionUser) {
  return db
    .select({
      expense: expenses,
      projectTitle: projects.title,
      createdByName: users.name,
    })
    .from(expenses)
    .leftJoin(projects, eq(projects.id, expenses.projectId))
    .leftJoin(users, eq(users.id, expenses.createdBy))
    .where(
      and(
        scopeFor(user),
        f.month ? gte(expenses.date, `${f.month}-01`) : undefined,
        f.month ? lt(expenses.date, addMonths(`${f.month}-01`, 1)) : undefined,
        f.category ? eq(expenses.category, f.category) : undefined,
        f.overhead ? isNull(expenses.projectId) : f.projectId ? eq(expenses.projectId, f.projectId) : undefined,
      ),
    )
    .orderBy(desc(expenses.date), desc(expenses.id))
}

/** Jobs this user may attach expenses to: everything for managers, assigned jobs for crew. */
export async function selectableProjects(user: SessionUser, opts: { includeId?: number | null } = {}) {
  const base = db
    .select({ id: projects.id, title: projects.title, status: projects.status })
    .from(projects)
  if (can(user, 'expenses:manage')) {
    const rows = await base.where(ne(projects.status, 'cancelled')).orderBy(desc(projects.createdAt))
    if (opts.includeId && !rows.some((r) => r.id === opts.includeId)) {
      const [extra] = await db.select({ id: projects.id, title: projects.title, status: projects.status }).from(projects).where(eq(projects.id, opts.includeId))
      if (extra) rows.unshift(extra)
    }
    return rows
  }
  const assigned = await db
    .select({ projectId: projectAssignments.projectId })
    .from(projectAssignments)
    .where(eq(projectAssignments.userId, user.id))
  const ids = assigned.map((a) => a.projectId)
  if (!ids.length) return []
  return base.where(inArray(projects.id, ids)).orderBy(asc(projects.title))
}

export async function userCanUseProject(user: SessionUser, projectId: number): Promise<boolean> {
  if (can(user, 'expenses:manage')) {
    const [p] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId))
    return !!p
  }
  const [a] = await db
    .select({ projectId: projectAssignments.projectId })
    .from(projectAssignments)
    .where(and(eq(projectAssignments.projectId, projectId), eq(projectAssignments.userId, user.id)))
  return !!a
}

const EDIT_WINDOW_MS = 24 * 60 * 60 * 1000

/** Managers can edit anything; anyone can fix their own entry for 24 hours. */
export function canEditExpense(user: SessionUser, e: Pick<Expense, 'createdBy' | 'createdAt'>): boolean {
  if (can(user, 'expenses:manage')) return true
  return e.createdBy === user.id && Date.now() - e.createdAt.getTime() < EDIT_WINDOW_MS
}
