'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/db'
import { customers, estimates, leads } from '@/db/schema'
import { bool, guard, str, type ActionState, ValidationError } from '@/lib/action-state'
import { rateLimit } from '@/lib/rate-limit'
import { sendEmail } from '@/lib/email'
import { sendSms } from '@/lib/sms'
import { appUrl, getSettings } from '@/lib/settings'
import { formatCents } from '@/lib/money'
import { todayISO } from '@/lib/dates'
import { layout } from '@/emails/templates'
import { createProjectFromEstimate } from '@/app/admin/estimates/convert'

/** Public: the customer accepts their estimate by typing their name. No login. */
export async function acceptEstimate(token: string, _: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
    if (!rateLimit(`estimate-accept:${ip}`, 10, 15 * 60 * 1000)) {
      throw new ValidationError('Too many attempts. Please try again in a few minutes.')
    }
    if (typeof token !== 'string' || !/^[A-Za-z0-9]{10,64}$/.test(token)) throw new ValidationError('Estimate not found.')

    const name = str(fd, 'name')?.slice(0, 120)
    if (!name || name.length < 2) throw new ValidationError('Please type your full name to accept.')
    if (!bool(fd, 'agree')) throw new ValidationError('Please check the box to agree to the estimate.')

    const [est] = await db.select().from(estimates).where(eq(estimates.token, token))
    if (!est) throw new ValidationError('Estimate not found.')
    if (est.status === 'accepted') return { ok: true, message: 'This estimate has already been accepted. Thank you!' }
    if (est.status === 'declined') throw new ValidationError('This estimate is no longer available. Please contact us for an updated quote.')
    if (est.validUntil && est.validUntil < todayISO()) {
      throw new ValidationError('This estimate has expired. Please contact us for an updated quote.')
    }

    // Conditional update so two simultaneous submits can only accept once.
    const [accepted] = await db
      .update(estimates)
      .set({ status: 'accepted', acceptedAt: new Date(), acceptedName: name })
      .where(and(eq(estimates.id, est.id), inArray(estimates.status, ['draft', 'sent'])))
      .returning()
    if (!accepted) return { ok: true, message: 'This estimate has already been accepted. Thank you!' }

    const projectId = await createProjectFromEstimate(accepted)
    if (est.leadId) await db.update(leads).set({ status: 'won' }).where(eq(leads.id, est.leadId))

    // Let Willie know right away. Email/SMS helpers never throw.
    const [customer] = await db.select().from(customers).where(eq(customers.id, est.customerId))
    const s = await getSettings()
    const adminLink = appUrl(`/admin/estimates/${est.id}`)
    const msg = layout(s, {
      preheader: `${customer?.name ?? name} accepted ${formatCents(est.totalCents)}`,
      heading: `Estimate accepted: ${est.title}`,
      paragraphs: [`${customer?.name ?? 'Your customer'} just accepted estimate E-${est.id} online. A pending job was created — schedule it when you’re ready.`],
      rows: [
        ['Customer', customer?.name],
        ['Signed as', name],
        ['Total', formatCents(est.totalCents)],
        ['Phone', customer?.phone],
        ['Email', customer?.email],
      ],
      cta: { label: 'Open the job', url: appUrl(`/admin/projects/${projectId}`) },
    })
    await Promise.all([
      sendEmail({
        to: s.notifyEmail || s.email,
        subject: `✅ Estimate accepted — ${customer?.name ?? name} (${formatCents(est.totalCents)})`,
        ...msg,
        replyTo: customer?.email ?? undefined,
      }),
      sendSms(
        s.notifyPhone || s.phone,
        `Estimate accepted! ${customer?.name ?? name} said yes to "${est.title}" (${formatCents(est.totalCents)}). ${adminLink}`,
      ),
    ])

    revalidatePath(`/e/${token}`)
    revalidatePath('/admin/estimates')
    revalidatePath(`/admin/estimates/${est.id}`)
    revalidatePath('/admin/projects')
    revalidatePath('/admin')
    return { ok: true, message: 'Thank you! Your estimate is accepted. We’ll be in touch shortly to get you on the schedule.' }
  })
}
