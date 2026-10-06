import { after } from 'next/server'
import type Stripe from 'stripe'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { customers, invoices, payments } from '@/db/schema'
import { getStripe } from '@/lib/stripe'
import { recordPayment } from '@/lib/billing'
import { sendEmail } from '@/lib/email'
import { sendSms } from '@/lib/sms'
import { appUrl, getSettings } from '@/lib/settings'
import { formatCents } from '@/lib/money'
import { layout } from '@/emails/templates'

// Stripe needs the exact raw body to verify the signature.
export async function POST(req: Request) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !secret) return new Response('Stripe is not configured', { status: 400 })

  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('Missing signature', { status: 400 })
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret)
  } catch (e) {
    console.error('Stripe webhook signature check failed:', e instanceof Error ? e.message : e)
    return new Response('Invalid signature', { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const session = event.data.object
      // For ACH, "completed" arrives with payment_status 'unpaid'; the money lands later via async_payment_succeeded.
      if (session.payment_status === 'paid') await handlePaidSession(session)
    } else if (event.type === 'checkout.session.async_payment_failed') {
      console.warn(`Stripe async payment failed for checkout session ${event.data.object.id}`)
    }
  } catch (e) {
    // Returning 500 makes Stripe retry later; recording is idempotent on the session id.
    console.error('Stripe webhook handling failed:', e)
    return new Response('Webhook handler error', { status: 500 })
  }

  return Response.json({ received: true })
}

async function handlePaidSession(session: Stripe.Checkout.Session) {
  const invoiceId = Number(session.metadata?.invoiceId)
  const token = session.metadata?.invoiceToken
  if (!Number.isInteger(invoiceId) || !token) return // not one of our invoice checkouts

  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId))
  if (!inv || inv.token !== token) {
    console.warn(`Stripe session ${session.id} references unknown invoice ${invoiceId}`)
    return
  }
  const amountCents = session.amount_total ?? 0
  if (amountCents <= 0) return

  const [already] = await db.select({ id: payments.id }).from(payments).where(eq(payments.stripeRef, session.id))
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? null)

  await recordPayment({
    invoiceId,
    amountCents,
    method: 'stripe',
    stripeRef: session.id,
    reference: paymentIntentId,
  })

  // Duplicate deliveries of the same event shouldn't text Willie twice.
  if (!already) after(() => notifyOwner(invoiceId, amountCents))
}

async function notifyOwner(invoiceId: number, amountCents: number) {
  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId))
  if (!inv) return
  const [customer] = await db.select({ name: customers.name }).from(customers).where(eq(customers.id, inv.customerId))
  const s = await getSettings()
  const who = customer?.name ?? 'a customer'
  const line = `💰 Payment received: ${formatCents(amountCents)} from ${who} for invoice #${inv.number}`
  const link = appUrl(`/admin/invoices/${inv.id}`)
  const remaining = Math.max(0, inv.totalCents - inv.paidCents)

  const msg = layout(s, {
    preheader: line,
    heading: `Payment received: ${formatCents(amountCents)}`,
    paragraphs: [`${who} just paid invoice #${inv.number} online.`],
    rows: [
      ['Amount', formatCents(amountCents)],
      ['Invoice', `#${inv.number}`],
      ['Remaining balance', remaining > 0 ? formatCents(remaining) : 'Paid in full'],
    ],
    cta: { label: 'View invoice', url: link },
  })
  await Promise.all([
    sendEmail({ to: s.notifyEmail || s.email, subject: line, ...msg }),
    sendSms(s.notifyPhone || s.phone, `${line}\n${link}`),
  ])
}
