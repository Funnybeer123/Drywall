import 'server-only'
import twilio from 'twilio'
import { db } from '@/db'
import { notificationLog } from '@/db/schema'
import { toE164 } from './utils'

let client: ReturnType<typeof twilio> | null | undefined
function twilioClient() {
  if (client === undefined) {
    const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token } = process.env
    client = sid && token ? twilio(sid, token) : null
  }
  return client
}

/**
 * Sends a text message via Twilio. Without Twilio credentials (local dev) it prints
 * the text to the terminal instead. Never throws.
 */
export async function sendSms(to: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const number = toE164(to)
  let status: 'sent' | 'logged' | 'failed' = 'logged'
  let error: string | undefined

  const c = twilioClient()
  if (!number) {
    status = 'failed'
    error = `Invalid phone number: ${to}`
  } else if (!c || !process.env.TWILIO_FROM_NUMBER) {
    console.log(`\n💬 [SMS not configured — would text ${number}]\n  | ${body.split('\n').join('\n  | ')}\n`)
  } else {
    try {
      await c.messages.create({ to: number, from: process.env.TWILIO_FROM_NUMBER, body })
      status = 'sent'
    } catch (e) {
      status = 'failed'
      error = e instanceof Error ? e.message : String(e)
      console.error('SMS failed:', error)
    }
  }

  await db
    .insert(notificationLog)
    .values({ channel: 'sms', to: number ?? to, body: body.slice(0, 2000), status, error })
    .catch((e) => console.error('notification log failed', e))

  return { ok: status !== 'failed', error }
}
