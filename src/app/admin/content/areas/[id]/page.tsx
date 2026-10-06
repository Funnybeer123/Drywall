import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { serviceAreas } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { ActionForm, ConfirmButton, SubmitButton } from '@/components/form'
import { Card, Checkbox, Field, Input, PageHeader, Textarea } from '@/components/ui'
import { parseIdParam } from '../../lib'
import { deleteAreaAction, saveAreaAction } from '../actions'

export const metadata: Metadata = { title: 'Service area' }

export default async function AreaPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser('content:manage')
  const id = parseIdParam((await params).id)
  const [a] = id === 'new' ? [] : await db.select().from(serviceAreas).where(eq(serviceAreas.id, id))
  if (id !== 'new' && !a) notFound()
  const s = await getSettings()

  return (
    <>
      <PageHeader
        back={{ href: '/admin/content/areas', label: 'Service areas' }}
        title={a ? `${a.city}, ${a.state}` : 'Add service area'}
        description={a ? `Page: /areas/${a.slug}` : 'The page address is created automatically from the city and state.'}
        actions={
          a ? (
            <ConfirmButton action={deleteAreaAction} hidden={{ id: a.id }} variant="danger" confirm={`Remove ${a.city}, ${a.state}?`}>
              Delete
            </ConfirmButton>
          ) : null
        }
      />
      <Card className="max-w-3xl">
        <ActionForm action={saveAreaAction.bind(null, a?.id ?? null)} className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
            <Field label="City / town" htmlFor="city">
              <Input id="city" name="city" defaultValue={a?.city} required maxLength={120} />
            </Field>
            <Field label="State" htmlFor="state">
              <Input id="state" name="state" defaultValue={a?.state ?? s.state} required maxLength={20} />
            </Field>
          </div>
          <Field
            label="Local blurb (optional)"
            htmlFor="blurb"
            hint="A sentence or two unique to this town — neighborhoods you've worked in, typical homes, how close you are. Unique text helps the page rank on Google."
          >
            <Textarea id="blurb" name="blurb" defaultValue={a?.blurb ?? ''} rows={4} maxLength={3000} />
          </Field>
          <Checkbox name="published" defaultChecked={a?.published ?? true} label="Published (show on website)" />
          <SubmitButton>{a ? 'Save changes' : 'Add area'}</SubmitButton>
        </ActionForm>
      </Card>
    </>
  )
}
