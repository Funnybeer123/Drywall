'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { customers, invoices } from '@/db/schema'
import { balanceDue } from '@/lib/billing'
import { getStripe } from '@/lib/stripe'
import { appUrl, getSettings } from '@/lib/settings'
import { rateLimit } from '@/lib/rate-limit'

/** Public "Pay now": creates a Stripe Checkout Session for the current balance and redirects to it. */
export async function payInvoiceAction(fd: FormData): Promise<void> {
  const token = String(fd.get('token') ?? '')
  if (!/^[A-Za-z0-9]{10,64}$/.test(token)) redirect('/')
  const back = `/i/${token}`

  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'
  if (!rateLimit(`pay:${ip}`, 20, 15 * 60 * 1000)) redirect(`${back}?payError=busy`)

  const stripe = getStripe()
  if (!stripe) redirect(back)

  const [inv] = await db.select().from(invoices).where(eq(invoices.token, token))
  if (!inv) redirect('/')
  const balance = balanceDue(inv)
  if (inv.status === 'void' || balance <= 0) redirect(back)
  if (balance < 50) redirect(`${back}?payError=1`) // Stripe's minimum charge is $0.50

  const [customer] = await db.select().from(customers).where(eq(customers.id, inv.customerId))
  const s = await getSettings()
  const metadata = { invoiceId: String(inv.id), invoiceToken: inv.token }

  let url: string | null = null
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // payment_method_types intentionally omitted: Stripe shows every method enabled in the dashboard (cards, ACH, wallets).
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: balance,
            product_data: { name: `Invoice #${inv.number}`, description: s.businessName },
          },
        },
      ],
      customer_email: customer?.email || undefined,
      client_reference_id: String(inv.id),
      metadata,
      payment_intent_data: { metadata, description: `${s.businessName} — Invoice #${inv.number}` },
      success_url: appUrl(`${back}?paid=1`),
      cancel_url: appUrl(back),
    })
    url = session.url
  } catch (e) {
    console.error('Stripe checkout failed:', e instanceof Error ? e.message : e)
  }
  redirect(url ?? `${back}?payError=1`)
}
