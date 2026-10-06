import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { services } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { ActionForm, ConfirmButton, SubmitButton } from '@/components/form'
import { Card, Checkbox, Field, Input, PageHeader, Select, Textarea } from '@/components/ui'
import { SERVICE_ICONS } from '../../constants'
import { parseIdParam } from '../../lib'
import { deleteServiceAction, saveServiceAction } from '../actions'

export const metadata: Metadata = { title: 'Service' }

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser('content:manage')
  const id = parseIdParam((await params).id)
  const [s] = id === 'new' ? [] : await db.select().from(services).where(eq(services.id, id))
  if (id !== 'new' && !s) notFound()

  return (
    <>
      <PageHeader
        back={{ href: '/admin/content/services', label: 'Services' }}
        title={s ? `Edit ${s.name}` : 'Add service'}
        actions={
          s ? (
            <ConfirmButton action={deleteServiceAction} hidden={{ id: s.id }} variant="danger" confirm={`Delete “${s.name}”?`}>
              Delete
            </ConfirmButton>
          ) : null
        }
      />
      <Card className="max-w-3xl">
        <ActionForm action={saveServiceAction.bind(null, s?.id ?? null)} className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Service name" htmlFor="name">
              <Input id="name" name="name" defaultValue={s?.name} required maxLength={120} />
            </Field>
            <Field label="Icon" htmlFor="icon">
              <Select id="icon" name="icon" defaultValue={s?.icon ?? 'hammer'}>
                {Object.entries(SERVICE_ICONS).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Web address (optional)"
              htmlFor="slug"
              className="sm:col-span-2"
              hint={s ? `Currently /services#${s.slug}. Changing it breaks old links to this section.` : 'Leave blank to create it from the name.'}
            >
              <div className="flex items-center rounded-lg shadow-sm">
                <span className="hidden h-10 items-center rounded-l-lg bg-slate-50 px-3 text-sm text-slate-500 ring-1 ring-slate-300 ring-inset sm:flex">
                  /services#
                </span>
                <Input id="slug" name="slug" defaultValue={s?.slug ?? ''} placeholder="auto" maxLength={80} className="sm:rounded-l-none" />
              </div>
            </Field>
          </div>
          <Field label="Short summary" htmlFor="summary" hint="One sentence shown on the service cards.">
            <Textarea id="summary" name="summary" defaultValue={s?.summary} required rows={2} maxLength={300} className="min-h-0" />
          </Field>
          <Field label="Details" htmlFor="body" hint="A few paragraphs for the service page: what's included, how long it takes, why choose you. Blank lines start new paragraphs.">
            <Textarea id="body" name="body" defaultValue={s?.body ?? ''} rows={8} maxLength={10000} />
          </Field>
          <div className="flex flex-wrap items-end gap-6">
            <Checkbox name="published" defaultChecked={s?.published ?? true} label="Published" />
            <Field label="Sort order" htmlFor="sort" hint="Lower numbers show first.">
              <Input id="sort" name="sort" type="number" defaultValue={s?.sort ?? 0} className="w-24" />
            </Field>
          </div>
          <SubmitButton>{s ? 'Save changes' : 'Add service'}</SubmitButton>
        </ActionForm>
      </Card>
    </>
  )
}
