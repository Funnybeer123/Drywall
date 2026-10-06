import 'server-only'
import { and, eq, inArray, isNull, lte, lt, or } from 'drizzle-orm'
import { db } from '@/db'
import {
  customers,
  invoices,
  leads,
  projectAssignments,
  projects,
  reviewRequests,
  users,
  type Lead,
} from '@/db/schema'
import { layout } from '@/emails/templates'
import { sendEmail } from './email'
import { sendSms } from './sms'
import { appUrl, getSettings } from './settings'
import { balanceDue, getEstimateWithItems, getInvoiceWithItems } from './billing'
import { renderDocPdf } from './pdf'
import { formatCents } from './money'
import { addDays, formatDate, todayISO } from './dates'
import { formatPhone } from './utils'

// ---------- New quote request ----------

export async function notifyNewLead(lead: Lead) {
  const s = await getSettings()
  const ownerEmail = s.notifyEmail || s.email
  const ownerPhone = s.notifyPhone || s.phone
  const adminLink = appUrl(`/admin/leads/${lead.id}`)

  const alert = layout(s, {
    preheader: `${lead.name} — ${lead.jobType}`,
    heading: `New quote request: ${lead.jobType}`,
    paragraphs: ['A new customer just requested a quote on your website.'],
    rows: [
      ['Name', lead.name],
      ['Phone', formatPhone(lead.phone)],
      ['Email', lead.email],
      ['Address', [lead.address, lead.city].filter(Boolean).join(', ')],
      ['Job type', lead.jobType],
      ['Timeframe', lead.timeframe],
      ['Details', lead.description],
      ['Heard about us', [lead.source, lead.referredBy && `referred by ${lead.referredBy}`].filter(Boolean).join(' — ')],
      ['Photos', lead.photoUrls.length ? lead.photoUrls.map((u) => (u.startsWith('http') ? u : appUrl(u))).join('\n') : null],
    ],
    cta: { label: 'Open in dashboard', url: adminLink },
  })

  const jobs: Promise<unknown>[] = [
    sendEmail({ to: ownerEmail, subject: `New quote request — ${lead.name} (${lead.jobType})`, ...alert, replyTo: lead.email ?? undefined }),
    sendSms(
      ownerPhone,
      `New quote request!\n${lead.name} ${formatPhone(lead.phone)}\n${lead.jobType}${lead.city ? ` in ${lead.city}` : ''}\n${lead.description.slice(0, 160)}\n${adminLink}`,
    ),
  ]

  if (lead.email) {
    const confirm = layout(s, {
      heading: `Thanks, ${lead.name.split(' ')[0]}! We got your request.`,
      paragraphs: [
        `${s.ownerName} will review the details and get back to you within one business day, usually sooner.`,
        `Need us sooner? Call or text ${formatPhone(s.phone)}.`,
      ],
      rows: [
        ['Job type', lead.jobType],
        ['Details', lead.description],
      ],
    })
    jobs.push(sendEmail({ to: lead.email, subject: `We received your quote request — ${s.businessName}`, ...confirm }))
  }
  await Promise.all(jobs)
}

// ---------- Estimates & invoices ----------

export async function sendEstimate(estimateId: number, viaSms: boolean) {
  const data = await getEstimateWithItems({ id: estimateId })
  if (!data) throw new Error('Estimate not found')
  const { estimate, items } = data
  const [customer] = await db.select().from(customers).where(eq(customers.id, estimate.customerId))
  const s = await getSettings()
  const link = appUrl(`/e/${estimate.token}`)
  const results: string[] = []

  if (customer.email) {
    const pdf = await renderDocPdf({
      kind: 'Estimate',
      number: `E-${estimate.id}`,
      settings: s,
      customer,
      issueDate: todayISO(),
      dueLabel: 'Valid until',
      dueDate: estimate.validUntil,
      title: estimate.title,
      items,
      subtotalCents: estimate.subtotalCents,
      taxRateBps: estimate.taxRateBps,
      taxCents: estimate.taxCents,
      totalCents: estimate.totalCents,
      notes: estimate.notes,
      link,
    })
    const msg = layout(s, {
      heading: `Your estimate from ${s.businessName}`,
      paragraphs: [
        `Hi ${customer.name.split(' ')[0]}, thanks for the opportunity. Your estimate for "${estimate.title}" is ready.`,
        'You can review it and accept online. Once accepted, we’ll get you on the schedule.',
      ],
      rows: [
        ['Estimate total', formatCents(estimate.totalCents)],
        ['Valid until', estimate.validUntil ? formatDate(estimate.validUntil) : null],
      ],
      cta: { label: 'Review & accept estimate', url: link },
    })
    const r = await sendEmail({
      to: customer.email,
      subject: `Estimate: ${estimate.title} — ${s.businessName}`,
      ...msg,
      attachments: [{ filename: `Estimate-E-${estimate.id}.pdf`, content: pdf }],
    })
    results.push(r.ok ? 'email' : `email failed (${r.error})`)
  }
  if (viaSms && customer.phone) {
    const r = await sendSms(customer.phone, `${s.businessName}: your estimate for "${estimate.title}" (${formatCents(estimate.totalCents)}) is ready. Review & accept: ${link}`)
    results.push(r.ok ? 'text' : `text failed (${r.error})`)
  }
  return results
}

export async function sendInvoice(invoiceId: number, opts: { viaSms: boolean; reminder?: boolean }) {
  const data = await getInvoiceWithItems({ id: invoiceId })
  if (!data) throw new Error('Invoice not found')
  const { invoice, items } = data
  const [customer] = await db.select().from(customers).where(eq(customers.id, invoice.customerId))
  const [project] = invoice.projectId ? await db.select().from(projects).where(eq(projects.id, invoice.projectId)) : []
  const s = await getSettings()
  const link = appUrl(`/i/${invoice.token}`)
  const due = balanceDue(invoice)
  const results: string[] = []

  if (customer.email) {
    const pdf = await renderDocPdf({
      kind: 'Invoice',
      number: String(invoice.number),
      settings: s,
      customer,
      issueDate: invoice.issueDate,
      dueLabel: 'Due',
      dueDate: invoice.dueDate,
      title: project?.title,
      items,
      subtotalCents: invoice.subtotalCents,
      taxRateBps: invoice.taxRateBps,
      taxCents: invoice.taxCents,
      totalCents: invoice.totalCents,
      paidCents: invoice.paidCents,
      notes: invoice.notes,
      link,
    })
    const msg = layout(s, {
      heading: opts.reminder ? `Friendly reminder: invoice #${invoice.number}` : `Invoice #${invoice.number} from ${s.businessName}`,
      paragraphs: opts.reminder
        ? [`Hi ${customer.name.split(' ')[0]}, this is a friendly reminder that invoice #${invoice.number} was due ${formatDate(invoice.dueDate)}.`]
        : [`Hi ${customer.name.split(' ')[0]}, thank you for your business! Your invoice is attached and can be paid online.`],
      rows: [
        ['Amount due', formatCents(due)],
        ['Due date', formatDate(invoice.dueDate)],
        ['Project', project?.title],
      ],
      cta: { label: 'View & pay invoice', url: link },
      footerNote: 'Questions about this invoice? Just reply to this email.',
    })
    const r = await sendEmail({
      to: customer.email,
      subject: `${opts.reminder ? 'Reminder: ' : ''}Invoice #${invoice.number} — ${formatCents(due)} due ${formatDate(invoice.dueDate)}`,
      ...msg,
      replyTo: s.email,
      attachments: [{ filename: `Invoice-${invoice.number}.pdf`, content: pdf }],
    })
    results.push(r.ok ? 'email' : `email failed (${r.error})`)
  }
  if (opts.viaSms && customer.phone) {
    const r = await sendSms(
      customer.phone,
      `${s.businessName}: ${opts.reminder ? 'reminder — ' : ''}invoice #${invoice.number} for ${formatCents(due)} is due ${formatDate(invoice.dueDate)}. View & pay: ${link}`,
    )
    results.push(r.ok ? 'text' : `text failed (${r.error})`)
  }

  await db
    .update(invoices)
    .set(
      opts.reminder
        ? { lastReminderAt: new Date() }
        : { sentAt: new Date(), status: invoice.status === 'draft' ? 'sent' : invoice.status },
    )
    .where(eq(invoices.id, invoiceId))
  return results
}

// ---------- Review requests ----------

/** Called when a job is marked completed. Queues one review request per project. */
export async function queueReviewRequest(projectId: number) {
  const s = await getSettings()
  if (!s.reviewRequestsEnabled) return
  const [p] = await db.select().from(projects).where(eq(projects.id, projectId))
  if (!p) return
  const dueAt = new Date(Date.now() + s.reviewDelayDays * 24 * 60 * 60 * 1000)
  await db.insert(reviewRequests).values({ projectId, customerId: p.customerId, dueAt }).onConflictDoNothing()
}

export async function sendReviewRequest(requestId: number) {
  const s = await getSettings()
  const [rr] = await db.select().from(reviewRequests).where(eq(reviewRequests.id, requestId))
  if (!rr || rr.status !== 'pending') return false
  const [customer] = await db.select().from(customers).where(eq(customers.id, rr.customerId))
  const reviewUrl = s.googleReviewUrl || appUrl('/reviews')
  const first = customer.name.split(' ')[0]

  if (customer.email) {
    const msg = layout(s, {
      heading: `How did we do, ${first}?`,
      paragraphs: [
        `Thanks again for choosing ${s.businessName}. If you're happy with the work, would you take 30 seconds to leave a quick review?`,
        'Reviews are the #1 way local homeowners find us, and they mean a lot to a small business.',
      ],
      cta: { label: 'Leave a review ⭐', url: reviewUrl },
      footerNote: 'Anything not perfect? Reply to this email and we’ll make it right.',
    })
    await sendEmail({ to: customer.email, subject: `Quick favor? — ${s.businessName}`, ...msg, replyTo: s.email })
  }
  if (customer.phone) {
    await sendSms(customer.phone, `Hi ${first}, thanks for choosing ${s.businessName}! If you're happy with the work, a quick review would mean a lot: ${reviewUrl}`)
  }
  await db.update(reviewRequests).set({ status: 'sent', sentAt: new Date() }).where(eq(reviewRequests.id, requestId))
  return true
}

// ---------- Daily automation (cron) ----------

export async function runDailyAutomation() {
  const s = await getSettings()
  const today = todayISO()
  const summary = { reviewRequests: 0, overdueReminders: 0, crewTexts: 0 }

  // 1. Review requests that are due
  if (s.reviewRequestsEnabled) {
    const due = await db
      .select({ id: reviewRequests.id })
      .from(reviewRequests)
      .where(and(eq(reviewRequests.status, 'pending'), lte(reviewRequests.dueAt, new Date())))
    for (const r of due) if (await sendReviewRequest(r.id)) summary.reviewRequests++
  }

  // 2. Overdue invoice reminders — at most once every 7 days per invoice
  if (s.overdueRemindersEnabled) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const overdue = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(
        and(
          inArray(invoices.status, ['sent', 'partial']),
          lt(invoices.dueDate, today),
          or(isNull(invoices.lastReminderAt), lt(invoices.lastReminderAt, weekAgo)),
        ),
      )
    for (const inv of overdue) {
      await sendInvoice(inv.id, { viaSms: true, reminder: true })
      summary.overdueReminders++
    }
  }

  // 3. Tomorrow's jobs: text the owner and each assigned crew member
  const tomorrow = addDays(today, 1)
  const jobs = await db
    .select()
    .from(projects)
    .where(and(inArray(projects.status, ['scheduled', 'in_progress']), lte(projects.startDate, tomorrow)))
  const tomorrowsJobs = jobs.filter((j) => j.startDate && (j.endDate ?? j.startDate) >= tomorrow)
  if (tomorrowsJobs.length) {
    const lines = tomorrowsJobs.map((j) => `• ${j.title}${j.address ? ` — ${j.address}` : ''}`).join('\n')
    await sendSms(s.notifyPhone || s.phone, `Tomorrow (${formatDate(tomorrow)}):\n${lines}`)
    summary.crewTexts++

    const assignments = await db
      .select({ projectId: projectAssignments.projectId, phone: users.phone, name: users.name })
      .from(projectAssignments)
      .innerJoin(users, eq(users.id, projectAssignments.userId))
      .where(
        and(
          inArray(projectAssignments.projectId, tomorrowsJobs.map((j) => j.id)),
          eq(users.active, true),
          inArray(users.role, ['employee', 'manager']),
        ),
      )
    const byPhone = new Map<string, string[]>()
    for (const a of assignments) {
      if (!a.phone) continue
      const job = tomorrowsJobs.find((j) => j.id === a.projectId)!
      byPhone.set(a.phone, [...(byPhone.get(a.phone) ?? []), `• ${job.title}${job.address ? ` — ${job.address}` : ''}`])
    }
    for (const [phone, jobLines] of byPhone) {
      await sendSms(phone, `${s.businessName} — your jobs tomorrow (${formatDate(tomorrow)}):\n${jobLines.join('\n')}`)
      summary.crewTexts++
    }
  }

  return summary
}

export async function leadCountNew() {
  const rows = await db.select({ id: leads.id }).from(leads).where(eq(leads.status, 'new'))
  return rows.length
}
