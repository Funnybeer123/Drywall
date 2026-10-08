import type { Metadata } from 'next'
import Link from 'next/link'
import { asc, desc, eq } from 'drizzle-orm'
import { MapPin, Plus, Receipt, Trash2 } from 'lucide-react'
import { db } from '@/db'
import { customers, estimates, expenses, invoices, laborEntries, projectAssignments, projectPhotos, users } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { getProjectFinancials } from '@/lib/profit'
import { balanceDue } from '@/lib/billing'
import { formatCents, laborCost } from '@/lib/money'
import { formatDate, formatDateTime, todayISO } from '@/lib/dates'
import { titleCase } from '@/lib/utils'
import { ActionForm, ConfirmButton, SubmitButton } from '@/components/form'
import { PhotoInput } from '@/components/photo-input'
import { Badge, Card, CardHeader, EmptyState, Input, LinkButton, PageHeader, Select, StatusBadge, Textarea } from '@/components/ui'
import { idParam, requireProjectAccess } from '../../_ops/access'
import { ContactLinks, DetailList, PHOTO_KINDS, PROJECT_STATUSES, label, mapsUrl } from '../../_ops/ui'
import { ProjectFields } from '../project-fields'
import { LaborForm } from './labor-form'
import {
  addLabor,
  addPhotos,
  deleteLabor,
  deletePhoto,
  deleteProject,
  setCrew,
  setProjectStatus,
  updateProject,
  updateProjectNotes,
} from '../actions'

export const metadata: Metadata = { title: 'Job' }

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser('jobs:view_assigned')
  const id = idParam((await params).id)
  const p = await requireProjectAccess(user, id)

  const manage = can(user, 'jobs:manage')
  const canLabor = can(user, 'labor:manage')
  const ownerView = can(user, 'job_profit:view')
  const showRates = can(user, 'pay_rates:view')
  const canExpenses = can(user, 'expenses:manage')
  const canInvoices = can(user, 'invoices:manage')
  const canEstimates = can(user, 'estimates:manage')

  const [[customer], crew, team, photos, labor, exps, ests, invs, fin] = await Promise.all([
    db.select().from(customers).where(eq(customers.id, p.customerId)),
    db
      .select({ id: users.id, name: users.name, phone: users.phone })
      .from(projectAssignments)
      .innerJoin(users, eq(users.id, projectAssignments.userId))
      .where(eq(projectAssignments.projectId, id))
      .orderBy(asc(users.name)),
    manage || canLabor
      ? db
          .select({ id: users.id, name: users.name, role: users.role, payRateCents: users.payRateCents })
          .from(users)
          .where(eq(users.active, true))
          .orderBy(asc(users.name))
      : Promise.resolve([]),
    db.select().from(projectPhotos).where(eq(projectPhotos.projectId, id)).orderBy(desc(projectPhotos.createdAt)),
    canLabor ? db.select().from(laborEntries).where(eq(laborEntries.projectId, id)).orderBy(desc(laborEntries.date)) : Promise.resolve([]),
    canExpenses ? db.select().from(expenses).where(eq(expenses.projectId, id)).orderBy(desc(expenses.date)) : Promise.resolve([]),
    canEstimates ? db.select().from(estimates).where(eq(estimates.projectId, id)).orderBy(desc(estimates.createdAt)) : Promise.resolve([]),
    canInvoices ? db.select().from(invoices).where(eq(invoices.projectId, id)).orderBy(desc(invoices.issueDate)) : Promise.resolve([]),
    ownerView ? getProjectFinancials([id]) : Promise.resolve(null),
  ])
  const f = fin?.get(id)
  const today = todayISO()
  const map = mapsUrl(p.address, p.city)
  const crewIds = new Set(crew.map((c) => c.id))
  const totalHours = labor.reduce((s, l) => s + l.hours, 0)
  const dates = p.startDate
    ? `${formatDate(p.startDate)}${p.endDate && p.endDate !== p.startDate ? ` – ${formatDate(p.endDate)}` : ''}`
    : 'Not scheduled'

  return (
    <>
      <PageHeader
        back={{ href: '/admin/projects', label: 'Jobs' }}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {p.title} <StatusBadge status={p.status} />
          </span>
        }
        description={
          <>
            {manage ? (
              <Link href={`/admin/customers/${customer.id}`} className="font-medium text-slate-700 hover:text-brand-fg">
                {customer.name}
              </Link>
            ) : (
              customer.name
            )}{' '}
            · {dates}
          </>
        }
        actions={
          canInvoices ? (
            <LinkButton href={`/admin/invoices/new?projectId=${p.id}`} size="sm" variant="secondary">
              <Receipt className="size-4" /> New invoice
            </LinkButton>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ---------- Main column ---------- */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card className="p-5">
            {map ? (
              <a href={map} target="_blank" rel="noopener noreferrer" className="mb-4 flex items-start gap-2 text-base font-medium text-slate-900 hover:text-brand-fg">
                <MapPin className="mt-0.5 size-5 shrink-0 text-brand-fg" />
                <span>{[p.address, p.city].filter(Boolean).join(', ')}</span>
              </a>
            ) : null}
            <div className="mb-5">
              <ContactLinks phone={customer.phone} email={manage ? customer.email : null} />
            </div>
            <DetailList
              items={[
                ['Customer', customer.name],
                ['Dates', dates],
                ['Crew', crew.map((c) => c.name).join(', ') || 'Nobody assigned yet'],
                ['Quoted', manage && p.quotedCents ? formatCents(p.quotedCents) : null],
                ['Completed', p.completedAt ? formatDateTime(p.completedAt) : null],
                ['Scope', p.description],
              ]}
            />
            {!manage && p.notes ? (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Job notes</p>
                <p className="mt-1 text-sm whitespace-pre-line">{p.notes}</p>
              </div>
            ) : null}
          </Card>

          {manage ? (
            <Card>
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-base font-semibold text-slate-900">
                  Edit details & dates
                  <span className="text-sm font-normal text-slate-500 group-open:hidden">Show</span>
                  <span className="hidden text-sm font-normal text-slate-500 group-open:inline">Hide</span>
                </summary>
                <ActionForm action={updateProject.bind(null, p.id)} className="border-t border-slate-100 p-5">
                  <ProjectFields p={p} />
                  <div className="mt-4">
                    <SubmitButton>Save job</SubmitButton>
                  </div>
                </ActionForm>
              </details>
            </Card>
          ) : null}

          {/* Photos */}
          <Card>
            <CardHeader title={`Photos (${photos.length})`} description="Before, progress and after shots. Great for marketing and disputes." />
            <div className="space-y-5 p-5">
              {PHOTO_KINDS.map((kind) => {
                const list = photos.filter((ph) => ph.kind === kind)
                if (!list.length) return null
                return (
                  <div key={kind}>
                    <p className="mb-2 text-xs font-semibold tracking-wide text-slate-500 uppercase">{label(kind)}</p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {list.map((ph) => (
                        <div key={ph.id} className="group relative">
                          <a href={ph.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg ring-1 ring-slate-200">
                            <img src={ph.url} alt={ph.caption ?? `${kind} photo`} loading="lazy" className="aspect-square w-full object-cover" />
                          </a>
                          {ph.caption ? <p className="mt-1 truncate text-xs text-slate-500">{ph.caption}</p> : null}
                          {manage || ph.uploadedBy === user.id ? (
                            <div className="absolute top-1 right-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100">
                              <ConfirmButton action={deletePhoto} hidden={{ photoId: ph.id }} variant="danger" confirm="Delete this photo?">
                                <Trash2 className="size-3.5" />
                                <span className="sr-only">Delete photo</span>
                              </ConfirmButton>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
              {photos.length === 0 ? <p className="text-sm text-slate-500">No photos yet.</p> : null}

              {can(user, 'jobs:add_photos') ? (
                <ActionForm action={addPhotos.bind(null, p.id)} encType="multipart/form-data" resetOnSuccess className="space-y-3 border-t border-slate-100 pt-5">
                  <PhotoInput name="photos" max={12} label="Take or choose photos" />
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr_auto]">
                    <Select name="kind" defaultValue={p.status === 'completed' ? 'after' : p.status === 'in_progress' ? 'progress' : 'before'} aria-label="Photo type">
                      {PHOTO_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {label(k)}
                        </option>
                      ))}
                    </Select>
                    <Input name="caption" placeholder="Caption (optional)" aria-label="Caption" />
                    <SubmitButton variant="secondary" pendingText="Uploading…">
                      Upload
                    </SubmitButton>
                  </div>
                </ActionForm>
              ) : null}
            </div>
          </Card>

          {/* Labor */}
          {canLabor ? (
            <Card>
              <CardHeader
                title="Labor"
                description={`${totalHours.toLocaleString('en-US', { maximumFractionDigits: 2 })} hours logged${showRates && f ? ` · ${formatCents(f.laborCents)}` : ''}`}
              />
              {labor.length ? (
                <div className="overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Worker</th>
                        <th className="text-right">Hours</th>
                        {showRates ? <th className="text-right">Rate</th> : null}
                        {showRates ? <th className="text-right">Cost</th> : null}
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {labor.map((l) => (
                        <tr key={l.id}>
                          <td className="whitespace-nowrap">{formatDate(l.date)}</td>
                          <td>
                            {l.workerName}
                            {l.note ? <p className="text-xs text-slate-500">{l.note}</p> : null}
                          </td>
                          <td className="text-right">{l.hours}</td>
                          {showRates ? <td className="text-right whitespace-nowrap">{formatCents(l.rateCents)}/hr</td> : null}
                          {showRates ? <td className="text-right font-medium">{formatCents(laborCost(l.hours, l.rateCents))}</td> : null}
                          <td className="w-px">
                            <ConfirmButton action={deleteLabor} hidden={{ entryId: l.id }} variant="ghost" confirm="Delete this labor entry?">
                              <Trash2 className="size-3.5" />
                              <span className="sr-only">Delete</span>
                            </ConfirmButton>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="px-5 pt-4 text-sm text-slate-500">No labor logged yet.</p>
              )}
              <div className="border-t border-slate-100 p-5">
                <LaborForm
                  action={addLabor.bind(null, p.id)}
                  workers={team.map((t) => ({ id: t.id, name: t.name, ...(showRates ? { payRateCents: t.payRateCents } : {}) }))}
                  showRates={showRates}
                  today={today}
                />
              </div>
            </Card>
          ) : null}

          {/* Expenses */}
          {canExpenses || can(user, 'expenses:add') ? (
            <Card>
              <CardHeader
                title="Materials & expenses"
                description={canExpenses ? `${formatCents(exps.reduce((s, e) => s + e.amountCents, 0))} total` : undefined}
                action={
                  <LinkButton href={`/admin/expenses/new?projectId=${p.id}`} size="sm" variant="secondary">
                    <Plus className="size-4" /> Add expense
                  </LinkButton>
                }
              />
              {canExpenses ? (
                exps.length ? (
                  <div className="overflow-x-auto">
                    <table className="table-base">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Category</th>
                          <th>Vendor / description</th>
                          <th className="text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {exps.map((e) => (
                          <tr key={e.id}>
                            <td className="whitespace-nowrap">{formatDate(e.date)}</td>
                            <td className="whitespace-nowrap">{titleCase(e.category)}</td>
                            <td>
                              {e.vendor ?? '—'}
                              {e.description ? <p className="text-xs text-slate-500">{e.description}</p> : null}
                              {e.receiptUrl ? (
                                <a href={e.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-fg hover:underline">
                                  Receipt
                                </a>
                              ) : null}
                            </td>
                            <td className="text-right font-medium">{formatCents(e.amountCents)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState title="No expenses logged for this job" />
                )
              ) : (
                <p className="px-5 py-4 text-sm text-slate-500">Bought materials for this job? Add the receipt so it’s tracked.</p>
              )}
            </Card>
          ) : null}

          {/* Estimates & invoices */}
          {canEstimates || canInvoices ? (
            <Card>
              <CardHeader
                title="Estimates & invoices"
                action={
                  canInvoices ? (
                    <LinkButton href={`/admin/invoices/new?projectId=${p.id}`} size="sm" variant="secondary">
                      <Plus className="size-4" /> New invoice
                    </LinkButton>
                  ) : null
                }
              />
              {ests.length + invs.length === 0 ? (
                <EmptyState title="Nothing yet" />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {ests.map((e) => (
                    <li key={`e${e.id}`}>
                      <Link href={`/admin/estimates/${e.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                        <span className="min-w-0 truncate">
                          <span className="font-medium">Estimate E-{e.id}</span> <span className="text-slate-500">· {e.title}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2 text-sm">
                          {formatCents(e.totalCents)} <StatusBadge status={e.status} />
                        </span>
                      </Link>
                    </li>
                  ))}
                  {invs.map((i) => {
                    const overdue = (i.status === 'sent' || i.status === 'partial') && i.dueDate < today
                    return (
                      <li key={`i${i.id}`}>
                        <Link href={`/admin/invoices/${i.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                          <span className="min-w-0 truncate">
                            <span className="font-medium">Invoice #{i.number}</span>{' '}
                            <span className="text-slate-500">
                              · {titleCase(i.kind)} · due {formatDate(i.dueDate)}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-2 text-sm">
                            {formatCents(i.totalCents)}
                            {i.status !== 'void' && balanceDue(i) > 0 && i.paidCents > 0 ? (
                              <span className="text-xs text-slate-500">({formatCents(balanceDue(i))} due)</span>
                            ) : null}
                            <StatusBadge status={overdue ? 'overdue' : i.status} />
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Card>
          ) : null}
        </div>

        {/* ---------- Side column ---------- */}
        <div className="min-w-0 space-y-6">
          {manage ? (
            <Card>
              <CardHeader title="Status" />
              <ActionForm action={setProjectStatus.bind(null, p.id)} className="space-y-3 p-5">
                <Select name="status" defaultValue={p.status} aria-label="Job status">
                  {PROJECT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {label(s)}
                    </option>
                  ))}
                </Select>
                <SubmitButton variant="secondary" size="sm">
                  Update status
                </SubmitButton>
                <p className="text-xs text-slate-500">Marking a job completed queues an automatic review request to the customer.</p>
              </ActionForm>
            </Card>
          ) : null}

          {ownerView && f ? (
            <Card>
              <CardHeader
                title="Job profit"
                action={f.projected ? <Badge tone="yellow">Projected</Badge> : <Badge tone="green">Actual</Badge>}
                description={f.projected ? 'Based on the quote — nothing invoiced yet.' : 'Based on invoiced amounts (pre-tax).'}
              />
              <dl className="space-y-2 p-5 text-sm">
                <Row k="Quoted" v={formatCents(f.quotedCents)} />
                <Row k="Invoiced" v={formatCents(f.invoicedCents)} />
                <Row k="Collected" v={formatCents(f.collectedCents)} />
                <div className="my-2 border-t border-slate-100" />
                <Row k="Materials & expenses" v={`− ${formatCents(f.expenseCents)}`} />
                <Row k="Labor" v={`− ${formatCents(f.laborCents)}`} />
                <div className="my-2 border-t border-slate-200" />
                <div className="flex items-baseline justify-between">
                  <dt className="font-semibold">{f.projected ? 'Projected profit' : 'Profit'}</dt>
                  <dd className={`text-lg font-bold ${f.profitCents >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCents(f.profitCents)}</dd>
                </div>
                <Row k="Margin" v={f.marginPct == null ? '—' : `${f.marginPct.toFixed(1)}%`} />
              </dl>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Crew" />
            {manage ? (
              <ActionForm action={setCrew.bind(null, p.id)} className="space-y-2 p-5">
                {team.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="userId" value={t.id} defaultChecked={crewIds.has(t.id)} className="size-4 accent-[var(--brand)]" />
                    {t.name}
                    <span className="text-xs text-slate-400">{t.role === 'employee' ? 'crew' : t.role}</span>
                  </label>
                ))}
                <div className="pt-2">
                  <SubmitButton variant="secondary" size="sm">
                    Save crew
                  </SubmitButton>
                </div>
              </ActionForm>
            ) : (
              <ul className="space-y-1 p-5 text-sm">
                {crew.map((c) => (
                  <li key={c.id}>{c.name}</li>
                ))}
              </ul>
            )}
          </Card>

          {manage ? (
            <Card>
              <CardHeader title="Job notes" description="Visible to the crew on this job." />
              <ActionForm action={updateProjectNotes.bind(null, p.id)} className="p-5">
                <Textarea name="notes" rows={5} defaultValue={p.notes ?? ''} placeholder="Gate code, parking, materials to bring…" />
                <div className="mt-3">
                  <SubmitButton variant="secondary" size="sm">
                    Save notes
                  </SubmitButton>
                </div>
              </ActionForm>
            </Card>
          ) : null}

          {manage && invs.length === 0 && canInvoices ? (
            <div className="flex justify-end">
              <ConfirmButton action={deleteProject} hidden={{ id: p.id }} variant="danger" confirm="Delete this job, its photos and labor entries? This can’t be undone.">
                Delete job
              </ConfirmButton>
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{k}</dt>
      <dd className="font-medium text-slate-900">{v}</dd>
    </div>
  )
}

