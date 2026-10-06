import type { Metadata } from 'next'
import Link from 'next/link'
import { Download, Paperclip, Plus } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { formatCents } from '@/lib/money'
import { addMonths, formatDate, formatMonth } from '@/lib/dates'
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from '@/lib/expense-categories'
import { buttonClass, Card, CardHeader, Checkbox, EmptyState, Field, Input, LinkButton, PageHeader, Select } from '@/components/ui'
import type { ExpenseCategory } from '@/db/schema'
import { canEditExpense, filtersToQuery, parseExpenseFilters, queryExpenses, selectableProjects } from './queries'

export const metadata: Metadata = { title: 'Expenses' }

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser('expenses:add')
  const manage = can(user, 'expenses:manage')
  const f = parseExpenseFilters(await searchParams)
  const [rows, projects] = await Promise.all([queryExpenses(f, user), selectableProjects(user)])

  const total = rows.reduce((s, r) => s + r.expense.amountCents, 0)
  const byCat = new Map<ExpenseCategory, number>()
  for (const r of rows) byCat.set(r.expense.category, (byCat.get(r.expense.category) ?? 0) + r.expense.amountCents)
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1])
  const maxCat = cats[0]?.[1] ?? 0

  const query = filtersToQuery(f)
  const monthNav = (delta: number) => {
    const m = addMonths(`${f.month}-01`, delta).slice(0, 7)
    return `/admin/expenses?${filtersToQuery({ ...f, month: m })}`
  }
  const periodLabel = f.month ? formatMonth(`${f.month}-01`) : 'All time'

  return (
    <div>
      <PageHeader
        title="Expenses & supplies"
        description={manage ? 'Every receipt in one place — for job costing and tax time.' : 'Receipts you’ve logged for your jobs.'}
        actions={
          <>
            <a href={`/admin/expenses/export?${query}`} className={buttonClass('secondary')}>
              <Download className="size-4" /> Export CSV
            </a>
            <LinkButton href="/admin/expenses/new">
              <Plus className="size-4" /> Add expense
            </LinkButton>
          </>
        }
      />

      {/* Filters (plain GET form so it works without JS and the URL is shareable) */}
      <Card className="mb-6 p-4">
        <form method="get" action="/admin/expenses" className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[170px_1fr_1fr_auto_auto]">
          <Field label="Month" htmlFor="f-month">
            <Input id="f-month" name="month" type="month" defaultValue={f.month ?? ''} />
          </Field>
          <Field label="Category" htmlFor="f-category">
            <Select id="f-category" name="category" defaultValue={f.category ?? ''}>
              <option value="">All categories</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {EXPENSE_CATEGORY_LABELS[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Job" htmlFor="f-project">
            <Select id="f-project" name="projectId" defaultValue={f.projectId ? String(f.projectId) : ''}>
              <option value="">All jobs</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </Field>
          <div className="pb-2.5">
            <Checkbox name="overhead" value="1" label="Overhead only" defaultChecked={f.overhead} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className={buttonClass('dark')}>
              Apply
            </button>
            <Link href="/admin/expenses?month=all" className={buttonClass('ghost')}>
              All time
            </Link>
          </div>
        </form>
      </Card>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {f.month ? (
            <Link href={monthNav(-1)} className={buttonClass('secondary', 'sm')} aria-label="Previous month">
              ←
            </Link>
          ) : null}
          <h2 className="text-lg font-semibold text-slate-900">{periodLabel}</h2>
          {f.month ? (
            <Link href={monthNav(1)} className={buttonClass('secondary', 'sm')} aria-label="Next month">
              →
            </Link>
          ) : null}
        </div>
        <p className="text-sm text-slate-500">
          {rows.length} expense{rows.length === 1 ? '' : 's'} · <span className="font-semibold text-slate-900">{formatCents(total)}</span>
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="lg:order-1">
          {rows.length === 0 ? (
            <EmptyState
              title="No expenses found"
              description="Snap a photo of your receipt right after you buy materials — it takes 20 seconds."
              action={<LinkButton href="/admin/expenses/new">Add expense</LinkButton>}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Expense</th>
                    <th className="hidden md:table-cell">Job</th>
                    <th className="text-right">Amount</th>
                    <th className="w-10">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ expense: e, projectTitle, createdByName }) => (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap text-slate-600">{formatDate(e.date)}</td>
                      <td>
                        <p className="font-medium text-slate-900">
                          {e.vendor || EXPENSE_CATEGORY_LABELS[e.category]}
                          {e.receiptUrl ? (
                            <a href={e.receiptUrl} target="_blank" rel="noopener" className="ml-1.5 inline-flex align-middle text-slate-400 hover:text-brand" title="View receipt">
                              <Paperclip className="size-3.5" />
                              <span className="sr-only">View receipt</span>
                            </a>
                          ) : null}
                        </p>
                        <p className="text-xs text-slate-500">
                          {EXPENSE_CATEGORY_LABELS[e.category]}
                          {e.description ? ` · ${e.description}` : ''}
                        </p>
                        <p className="text-xs text-slate-500 md:hidden">{projectTitle ?? 'Overhead'}</p>
                        {manage && createdByName ? <p className="text-xs text-slate-400">by {createdByName}</p> : null}
                      </td>
                      <td className="hidden md:table-cell">
                        {e.projectId && projectTitle ? (
                          <Link href={`/admin/projects/${e.projectId}`} className="text-slate-700 hover:underline">
                            {projectTitle}
                          </Link>
                        ) : (
                          <span className="text-slate-400">Overhead</span>
                        )}
                      </td>
                      <td className="text-right font-medium whitespace-nowrap tabular-nums">{formatCents(e.amountCents)}</td>
                      <td>
                        {canEditExpense(user, e) ? (
                          <Link href={`/admin/expenses/${e.id}/edit`} className="text-sm text-brand hover:underline">
                            Edit
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="h-fit lg:order-2">
          <CardHeader title="By category" description={periodLabel} />
          {cats.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">Nothing to total yet.</p>
          ) : (
            <ul className="space-y-3 p-5">
              {cats.map(([c, cents]) => (
                <li key={c}>
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="text-slate-700">{EXPENSE_CATEGORY_LABELS[c]}</span>
                    <span className="font-medium tabular-nums">{formatCents(cents)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100" aria-hidden>
                    <div className="h-full rounded-full bg-[#d97706]" style={{ width: `${Math.max(2, (cents / maxCat) * 100)}%` }} />
                  </div>
                </li>
              ))}
              <li className="flex justify-between border-t border-slate-100 pt-3 text-sm font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatCents(total)}</span>
              </li>
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}
