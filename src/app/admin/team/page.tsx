import type { Metadata } from 'next'
import Link from 'next/link'
import { asc, desc, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { invites, users } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { ROLE_LABELS } from '@/lib/permissions'
import { formatCents } from '@/lib/money'
import { formatDateTime } from '@/lib/dates'
import { appUrl } from '@/lib/settings'
import { formatPhone } from '@/lib/utils'
import { Badge, Card, CardHeader, EmptyState, Field, Input, PageHeader, Select } from '@/components/ui'
import { ConfirmButton, SubmitButton } from '@/components/form'
import { inviteAction, resendInviteAction, revokeInviteAction } from './actions'
import { LinkActionForm } from './link-action-form'
import { CopyLink } from './copy-link'
import { ROLE_HELP, ROLE_TONES } from './types'

export const metadata: Metadata = { title: 'Team' }

export default async function TeamPage() {
  const me = await requireUser('team:manage')
  const [members, pending, emails] = await Promise.all([
    db.select().from(users).orderBy(desc(users.active), asc(users.role), asc(users.name)),
    db.select().from(invites).where(isNull(invites.acceptedAt)).orderBy(desc(invites.createdAt)),
    db.select({ email: users.email }).from(users),
  ])
  const existingEmails = new Set(emails.map((e) => e.email))
  const now = new Date()

  return (
    <>
      <PageHeader title="Team" description="Invite managers and crew, set pay rates, and control who can see what." />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Team members" description={`${members.filter((m) => m.active).length} active`} />
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Role</th>
                    <th className="text-right">Pay / hr</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {members.map((u) => (
                    <tr key={u.id} className={u.active ? '' : 'opacity-60'}>
                      <td>
                        <Link href={`/admin/team/${u.id}`} className="font-medium text-slate-900 hover:text-brand-fg">
                          {u.name}
                          {u.id === me.id ? <span className="ml-1 text-xs font-normal text-slate-500">(you)</span> : null}
                        </Link>
                        <div className="text-xs text-slate-500">{u.email}</div>
                        {u.phone ? <div className="text-xs text-slate-500">{formatPhone(u.phone)}</div> : null}
                      </td>
                      <td>
                        <Badge tone={ROLE_TONES[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                      </td>
                      <td className="text-right tabular-nums">{u.payRateCents ? formatCents(u.payRateCents) : '—'}</td>
                      <td>{u.active ? <Badge tone="green">Active</Badge> : <Badge>Deactivated</Badge>}</td>
                      <td className="text-right">
                        <Link href={`/admin/team/${u.id}`} className="text-sm font-medium text-brand-fg hover:underline">
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <CardHeader title="Pending invites & password resets" description="Links expire after 7 days. Resending extends it." />
            {pending.length === 0 ? (
              <EmptyState title="No pending invites" description="People you invite show up here until they set their password." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {pending.map((inv) => {
                  const expired = inv.expiresAt < now
                  const isReset = existingEmails.has(inv.email)
                  return (
                    <li key={inv.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">
                          {inv.name}{' '}
                          {isReset ? <Badge tone="purple">Password reset</Badge> : <Badge tone={ROLE_TONES[inv.role]}>{ROLE_LABELS[inv.role]}</Badge>}
                        </p>
                        <p className="truncate text-sm text-slate-500">{inv.email}</p>
                        <p className={expired ? 'text-xs text-red-600' : 'text-xs text-slate-500'}>
                          {expired ? 'Expired' : 'Expires'} {formatDateTime(inv.expiresAt)}
                          {!isReset && inv.payRateCents ? ` · ${formatCents(inv.payRateCents)}/hr` : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {!expired ? <CopyLink url={appUrl(`/invite/${inv.token}`)} compact /> : null}
                        <ConfirmButton action={resendInviteAction} hidden={{ id: inv.id }}>
                          Resend
                        </ConfirmButton>
                        <ConfirmButton action={revokeInviteAction} hidden={{ id: inv.id }} variant="danger" confirm={`Revoke the invite for ${inv.email}?`}>
                          Revoke
                        </ConfirmButton>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Invite someone" description="They'll get a link to set their own password." />
            <LinkActionForm action={inviteAction} className="space-y-4 p-5" resetOnSuccess>
              <Field label="Name" htmlFor="inv-name">
                <Input id="inv-name" name="name" required maxLength={120} autoComplete="off" />
              </Field>
              <Field label="Email" htmlFor="inv-email">
                <Input id="inv-email" name="email" type="email" required autoComplete="off" />
              </Field>
              <Field label="Mobile phone (optional)" htmlFor="inv-phone" hint="If entered, we'll also text them the link.">
                <Input id="inv-phone" name="phone" type="tel" autoComplete="off" />
              </Field>
              <Field label="Role" htmlFor="inv-role">
                <Select id="inv-role" name="role" defaultValue="employee">
                  <option value="employee">{ROLE_LABELS.employee}</option>
                  <option value="manager">{ROLE_LABELS.manager}</option>
                  <option value="owner">{ROLE_LABELS.owner} (co-owner)</option>
                </Select>
              </Field>
              <Field label="Hourly pay rate" htmlFor="inv-pay" hint="Used to calculate labor cost on jobs. Only owners can see it.">
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">$</span>
                  <Input id="inv-pay" name="payRate" inputMode="decimal" placeholder="0.00" className="pl-7" />
                </div>
              </Field>
              <SubmitButton className="w-full" pendingText="Sending invite…">
                Send invite
              </SubmitButton>
            </LinkActionForm>
          </Card>

          <Card>
            <CardHeader title="What each role can do" />
            <dl className="space-y-4 p-5 text-sm">
              {ROLE_HELP.map((r) => (
                <div key={r.role}>
                  <dt>
                    <Badge tone={ROLE_TONES[r.role]}>{ROLE_LABELS[r.role]}</Badge>
                  </dt>
                  <dd className="mt-1 text-slate-600">{r.text}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </>
  )
}
