import type { Metadata } from 'next'
import { requireUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { todayISO } from '@/lib/dates'
import { ActionForm, SubmitButton } from '@/components/form'
import { Card, LinkButton, PageHeader } from '@/components/ui'
import { createExpenseAction } from '../actions'
import { ExpenseFields } from '../expense-fields'
import { selectableProjects } from '../queries'

export const metadata: Metadata = { title: 'Add expense' }

export default async function NewExpensePage({ searchParams }: { searchParams: Promise<{ projectId?: string }> }) {
  const user = await requireUser('expenses:add')
  const sp = await searchParams
  const projects = await selectableProjects(user)
  const pid = Number(sp.projectId)
  const fromProject = Number.isInteger(pid) && projects.some((p) => p.id === pid) ? pid : null
  const back = fromProject ? { href: `/admin/projects/${fromProject}`, label: 'Back to job' } : { href: '/admin/expenses', label: 'Expenses' }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Add expense"
        description={fromProject ? `For ${projects.find((p) => p.id === fromProject)?.title}` : 'Log materials, fuel, rentals and other costs.'}
        back={back}
      />
      <Card className="p-5">
        <ActionForm action={createExpenseAction} encType="multipart/form-data">
          {fromProject ? <input type="hidden" name="returnTo" value="project" /> : null}
          <ExpenseFields
            projects={projects}
            allowOverhead={can(user, 'expenses:manage')}
            defaults={{ date: todayISO(), projectId: fromProject }}
          />
          <div className="mt-6 flex justify-end gap-2">
            <LinkButton href={back.href} variant="secondary">
              Cancel
            </LinkButton>
            <SubmitButton>Save expense</SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </div>
  )
}
