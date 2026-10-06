import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { faqs } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { ActionForm, ConfirmButton, SubmitButton } from '@/components/form'
import { Card, Field, Input, PageHeader, Textarea } from '@/components/ui'
import { parseIdParam } from '../../lib'
import { deleteFaqAction, saveFaqAction } from '../actions'

export const metadata: Metadata = { title: 'FAQ' }

export default async function FaqPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser('content:manage')
  const id = parseIdParam((await params).id)
  const [f] = id === 'new' ? [] : await db.select().from(faqs).where(eq(faqs.id, id))
  if (id !== 'new' && !f) notFound()

  return (
    <>
      <PageHeader
        back={{ href: '/admin/content/faqs', label: 'FAQ' }}
        title={f ? 'Edit question' : 'Add question'}
        actions={
          f ? (
            <ConfirmButton action={deleteFaqAction} hidden={{ id: f.id }} variant="danger" confirm="Delete this question?">
              Delete
            </ConfirmButton>
          ) : null
        }
      />
      <Card className="max-w-3xl">
        <ActionForm action={saveFaqAction.bind(null, f?.id ?? null)} className="space-y-4 p-5">
          <Field label="Question" htmlFor="question">
            <Input id="question" name="question" defaultValue={f?.question} required maxLength={300} />
          </Field>
          <Field label="Answer" htmlFor="answer">
            <Textarea id="answer" name="answer" defaultValue={f?.answer} required rows={5} maxLength={5000} />
          </Field>
          <Field label="Sort order" htmlFor="sort" hint="Lower numbers show first.">
            <Input id="sort" name="sort" type="number" defaultValue={f?.sort ?? 0} className="w-24" />
          </Field>
          <SubmitButton>{f ? 'Save changes' : 'Add question'}</SubmitButton>
        </ActionForm>
      </Card>
    </>
  )
}
