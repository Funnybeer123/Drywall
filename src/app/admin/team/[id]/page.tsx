import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { users } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { ROLE_LABELS } from '@/lib/permissions'
import { centsToInput } from '@/lib/money'
import { formatDateTime } from '@/lib/dates'
import { Badge, Card, CardHeader, Checkbox, Field, Input, PageHeader, Select } from '@/components/ui'
import { SubmitButton } from '@/components/form'
import { resetPasswordAction, updateUserAction } from '../actions'
import { LinkActionForm } from '../link-action-form'
import { ROLE_HELP, ROLE_TONES } from '../types'

export const metadata: Metadata = { title: 'Edit team member' }

export default async function TeamMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser('team:manage')
  const { id } = await params
  const userId = Number(id)
  if (!Number.isInteger(userId)) notFound()
  const [u] = await db.select().from(users).where(eq(users.id, userId))
  if (!u) notFound()
  const isSelf = u.id === me.id

  return (
    <>
      <PageHeader
        back={{ href: '/admin/team', label: 'Team' }}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {u.name}
            <Badge tone={ROLE_TONES[u.role]}>{ROLE_LABELS[u.role]}</Badge>
            {!u.active ? <Badge>Deactivated</Badge> : null}
          </span>
        }
        description={`Joined ${formatDateTime(u.createdAt)}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Profile & access" />
          <LinkActionForm action={updateUserAction.bind(null, u.id)} className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" htmlFor="name">
                <Input id="name" name="name" defaultValue={u.name} required maxLength={120} />
              </Field>
              <Field label="Mobile phone" htmlFor="phone" hint="Used for job reminder texts.">
                <Input id="phone" name="phone" type="tel" defaultValue={u.phone ?? ''} />
              </Field>
              <Field label="Email (used to sign in)" htmlFor="email" className="sm:col-span-2">
                <Input id="email" name="email" type="email" defaultValue={u.email} required />
              </Field>
              <Field label="Role" htmlFor="role" hint={isSelf ? "You can't change your own role." : undefined}>
                {isSelf ? (
                  <>
                    <input type="hidden" name="role" value={u.role} />
                    <Select id="role" value={u.role} disabled>
                      <option value={u.role}>{ROLE_LABELS[u.role]}</option>
                    </Select>
                  </>
                ) : (
                  <Select id="role" name="role" defaultValue={u.role}>
                    <option value="employee">{ROLE_LABELS.employee}</option>
                    <option value="manager">{ROLE_LABELS.manager}</option>
                    <option value="owner">{ROLE_LABELS.owner}</option>
                  </Select>
                )}
              </Field>
              <Field label="Hourly pay rate" htmlFor="payRate">
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">$</span>
                  <Input id="payRate" name="payRate" inputMode="decimal" defaultValue={centsToInput(u.payRateCents)} className="pl-7" />
                </div>
              </Field>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              {isSelf ? (
                <>
                  <input type="hidden" name="active" value="on" />
                  <p className="text-sm text-slate-600">You can&apos;t deactivate your own account.</p>
                </>
              ) : (
                <>
                  <Checkbox name="active" defaultChecked={u.active} label="Active — can sign in" />
                  <p className="mt-1 ml-6 text-xs text-slate-500">
                    Uncheck when someone leaves. They&apos;re signed out immediately, but their past jobs, hours and receipts stay on record.
                  </p>
                </>
              )}
            </div>
            <SubmitButton>Save changes</SubmitButton>
          </LinkActionForm>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Reset password" description="Sends a link to set a new password. Their current password keeps working until they use it." />
            <LinkActionForm action={resetPasswordAction.bind(null, u.id)} className="p-5">
              <SubmitButton variant="secondary" pendingText="Creating link…" className="w-full">
                Send password reset link
              </SubmitButton>
            </LinkActionForm>
          </Card>

          <Card>
            <CardHeader title="Roles" />
            <dl className="space-y-3 p-5 text-sm">
              {ROLE_HELP.map((r) => (
                <div key={r.role}>
                  <dt className="font-medium text-slate-900">{ROLE_LABELS[r.role]}</dt>
                  <dd className="text-slate-600">{r.text}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </>
  )
}
