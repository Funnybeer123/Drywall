import 'server-only'
import Stripe from 'stripe'

let client: Stripe | null | undefined

/** Stripe client, or null when STRIPE_SECRET_KEY isn't set (online pay button is hidden). */
export function getStripe(): Stripe | null {
  if (client === undefined) client = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null
  return client
}
