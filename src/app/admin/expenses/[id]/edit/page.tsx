import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { expenses } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { ActionForm, ConfirmButton, SubmitButton } from '@/components/form'
import { Card, LinkButton, PageHeader } from '@/components/ui'
import { deleteExpenseAction, updateExpenseAction } from '../../actions'
import { ExpenseFields } from '../../expense-fields'
import { canEditExpense, selectableProjects } from '../../queries'

export const metadata: Metadata = { title: 'Edit expense' }

export default async function EditExpensePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
}) {
  const user = await requireUser('expenses:add')
  const id = Number((await params).id)
  if (!Number.isInteger(id)) notFound()
  const [expense] = await db.select().from(expenses).where(eq(expenses.id, id))
  if (!expense) notFound()
  if (!canEditExpense(user, expense)) redirect('/admin/expenses')
  const fromProject = (await searchParams).from === 'project' && expense.projectId ? expense.projectId : null
  const projects = await selectableProjects(user, { includeId: expense.projectId })
  const backHref = fromProject ? `/admin/projects/${fromProject}` : '/admin/expenses'

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Edit expense" back={{ href: backHref, label: fromProject ? 'Back to job' : 'Expenses' }} />
      <Card className="p-5">
        <ActionForm action={updateExpenseAction} encType="multipart/form-data">
          <input type="hidden" name="id" value={expense.id} />
          {fromProject ? <input type="hidden" name="returnTo" value="project" /> : null}
          <ExpenseFields projects={projects} allowOverhead={can(user, 'expenses:manage')} defaults={expense} />
          <div className="mt-6 flex justify-end gap-2">
            <LinkButton href={backHref} variant="secondary">
              Cancel
            </LinkButton>
            <SubmitButton>Save changes</SubmitButton>
          </div>
        </ActionForm>
      </Card>
      <div className="mt-4 flex justify-end">
        <ConfirmButton
          action={deleteExpenseAction}
          hidden={fromProject ? { id: expense.id, returnTo: 'project' } : { id: expense.id }}
          variant="danger"
          confirm="Delete this expense?"
        >
          Delete expense
        </ConfirmButton>
      </div>
    </div>
  )
}
