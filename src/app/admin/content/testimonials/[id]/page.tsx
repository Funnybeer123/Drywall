import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { testimonials } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { ActionForm, ConfirmButton, SubmitButton } from '@/components/form'
import { Card, Checkbox, Field, Input, PageHeader, Select, Textarea } from '@/components/ui'
import { parseIdParam } from '../../lib'
import { deleteTestimonialAction, saveTestimonialAction } from '../actions'

export const metadata: Metadata = { title: 'Review' }

export default async function TestimonialPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser('content:manage')
  const id = parseIdParam((await params).id)
  const [t] = id === 'new' ? [] : await db.select().from(testimonials).where(eq(testimonials.id, id))
  if (id !== 'new' && !t) notFound()

  return (
    <>
      <PageHeader
        back={{ href: '/admin/content/testimonials', label: 'Reviews' }}
        title={t ? 'Edit review' : 'Add review'}
        description="Use the customer's real words. First name + last initial is fine for privacy."
        actions={
          t ? (
            <ConfirmButton action={deleteTestimonialAction} hidden={{ id: t.id }} variant="danger" confirm="Delete this review?">
              Delete
            </ConfirmButton>
          ) : null
        }
      />
      <Card className="max-w-3xl">
        <ActionForm action={saveTestimonialAction.bind(null, t?.id ?? null)} className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer name" htmlFor="customerName" hint="e.g. Jennifer R.">
              <Input id="customerName" name="customerName" defaultValue={t?.customerName} required maxLength={120} />
            </Field>
            <Field label="Location (optional)" htmlFor="location" hint="Town or neighborhood.">
              <Input id="location" name="location" defaultValue={t?.location ?? ''} maxLength={120} />
            </Field>
            <Field label="Project type (optional)" htmlFor="projectType" hint="e.g. Basement finish">
              <Input id="projectType" name="projectType" defaultValue={t?.projectType ?? ''} maxLength={120} />
            </Field>
            <Field label="Rating" htmlFor="rating">
              <Select id="rating" name="rating" defaultValue={String(t?.rating ?? 5)}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {'★'.repeat(n)} ({n} star{n === 1 ? '' : 's'})
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Review" htmlFor="quote">
            <Textarea id="quote" name="quote" defaultValue={t?.quote} required rows={5} maxLength={3000} />
          </Field>
          <div className="flex flex-wrap items-end gap-6">
            <Checkbox name="featured" defaultChecked={t?.featured ?? false} label="Featured on home page" />
            <Checkbox name="published" defaultChecked={t?.published ?? true} label="Published" />
            <Field label="Sort order" htmlFor="sort" hint="Lower numbers show first.">
              <Input id="sort" name="sort" type="number" defaultValue={t?.sort ?? 0} className="w-24" />
            </Field>
          </div>
          <SubmitButton>{t ? 'Save changes' : 'Add review'}</SubmitButton>
        </ActionForm>
      </Card>
    </>
  )
}
