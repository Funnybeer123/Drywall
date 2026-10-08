/**
 * Registers an API key for the assistant without signing in to the dashboard.
 * The key is generated elsewhere; only its SHA-256 hash and prefix are passed in,
 * so the key itself never reaches the server's settings.
 *
 *   API_KEY_HASH=<sha256 hex> API_KEY_PREFIX=<first 10 chars> API_KEY_USER_EMAIL=<owner email> \
 *   API_KEY_SCOPES=read,write API_KEY_NAME="Grok assistant" npm run create-api-key
 *
 * Used by scripts/azure/start.sh. Running it twice with the same hash does nothing.
 */
import { loadEnv } from './env'
loadEnv()

const { db } = await import('../src/db')
const s = await import('../src/db/schema')
const { eq } = await import('drizzle-orm')

const env = process.env
const hash = env.API_KEY_HASH ?? ''
const prefix = env.API_KEY_PREFIX ?? ''
const email = (env.API_KEY_USER_EMAIL ?? '').toLowerCase()
const name = env.API_KEY_NAME || 'Grok assistant'
const VALID = ['read', 'write', 'content', 'send', 'settings']
const scopes = (env.API_KEY_SCOPES || 'read,write').split(',').map((x) => x.trim()).filter((x) => VALID.includes(x))

if (!/^[0-9a-f]{64}$/.test(hash)) throw new Error('API_KEY_HASH must be a SHA-256 hex digest.')
if (!prefix.startsWith('wdk_')) throw new Error('API_KEY_PREFIX must be the first characters of a wdk_ key.')
if (!scopes.length) throw new Error('API_KEY_SCOPES has no valid scopes.')

const [user] = await db.select().from(s.users).where(eq(s.users.email, email))
if (!user) throw new Error(`No user with email ${email}.`)

const [existing] = await db.select({ id: s.apiKeys.id }).from(s.apiKeys).where(eq(s.apiKeys.keyHash, hash))
if (existing) {
  console.log(`✔ API key ${prefix}… already exists`)
} else {
  await db.insert(s.apiKeys).values({ name, prefix, keyHash: hash, scopes, userId: user.id })
  console.log(`✔ Created API key ${prefix}… (${scopes.join(', ')}) for ${email}`)
}
process.exit(0)
