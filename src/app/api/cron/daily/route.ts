import { timingSafeEqual } from 'node:crypto'
import { runDailyAutomation } from '@/lib/notify'

export const maxDuration = 60

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const given = Buffer.from(req.headers.get('authorization') ?? '')
    const expected = Buffer.from(`Bearer ${secret}`)
    if (given.length === expected.length && timingSafeEqual(given, expected)) return true
  }
  // Locally (`next dev`) it's handy to open /api/cron/daily in a browser; anywhere else the secret is mandatory.
  return process.env.NODE_ENV === 'development'
}

export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  const startedAt = new Date()
  try {
    const summary = await runDailyAutomation()
    return Response.json({ ok: true, ranAt: startedAt.toISOString(), ms: Date.now() - startedAt.getTime(), ...summary })
  } catch (e) {
    console.error('Daily automation failed:', e)
    return Response.json({ ok: false, error: e instanceof Error ? e.message : 'Failed' }, { status: 500 })
  }
}
