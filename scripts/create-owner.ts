/**
 * Production setup: creates Willy's real owner login and the starter website
 * content (services, FAQ, price list) — with NO demo customers or sample reviews.
 *
 *   npm run create-owner
 *
 * Run it once against the production database (DATABASE_URL set in .env.local).
 */
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import bcrypt from 'bcryptjs'
import { loadEnv } from './env'
import { FAQS, PRICE_ITEMS, SERVICES } from './content'
loadEnv()

const { db } = await import('../src/db')
const s = await import('../src/db/schema')
const { eq } = await import('drizzle-orm')

console.log(`Database: ${process.env.DATABASE_URL ? 'DATABASE_URL (production Postgres)' : 'local embedded database'}\n`)

// OWNER_NAME / OWNER_EMAIL / OWNER_PASSWORD skip the prompts (used for unattended first-boot setup).
const env = process.env
const rl = env.OWNER_EMAIL && env.OWNER_PASSWORD ? null : createInterface({ input: stdin, output: stdout })
const name = (env.OWNER_NAME ?? (await rl!.question('Owner name: '))).trim() || 'Willy'
const email = (env.OWNER_EMAIL ?? (await rl!.question('Owner email (used to sign in): '))).trim().toLowerCase()
const password = env.OWNER_PASSWORD ?? (await rl!.question('Password (min 10 characters): '))
rl?.close()

if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('That email does not look valid.')
if (password.length < 10) throw new Error('Password must be at least 10 characters.')

const passwordHash = await bcrypt.hash(password, 11)
const [existing] = await db.select().from(s.users).where(eq(s.users.email, email))
if (existing) {
  await db.update(s.users).set({ name, passwordHash, role: 'owner', active: true }).where(eq(s.users.id, existing.id))
  console.log(`✔ Updated existing user ${email} → owner`)
} else {
  await db.insert(s.users).values({ name, email, passwordHash, role: 'owner' })
  console.log(`✔ Created owner ${email}`)
}

await db.insert(s.settings).values({ id: 1, ownerName: name, notifyEmail: email }).onConflictDoNothing()

if ((await db.select({ id: s.services.id }).from(s.services).limit(1)).length === 0) {
  await db.insert(s.services).values(SERVICES)
  await db.insert(s.faqs).values(FAQS)
  await db.insert(s.priceItems).values(PRICE_ITEMS)
  console.log('✔ Added starter services, FAQ and price list (edit them in the dashboard)')
}

console.log('\nDone. Sign in at /login, then open Settings to fill in your business info.')
process.exit(0)
