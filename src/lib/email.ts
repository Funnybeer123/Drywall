import 'server-only'
import { Resend } from 'resend'
import { db } from '@/db'
import { notificationLog } from '@/db/schema'

export type EmailAttachment = { filename: string; content: Buffer }

export type EmailMessage = {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
  attachments?: EmailAttachment[]
}

let client: Resend | null | undefined
function resend() {
  if (client === undefined) client = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  return client
}

/**
 * Sends an email through Resend. Without RESEND_API_KEY (local dev) it prints the
 * message to the terminal instead. Never throws — failures are logged so a broken
 * email setup can't block saving a lead or invoice.
 */
export async function sendEmail(msg: EmailMessage): Promise<{ ok: boolean; error?: string }> {
  const r = resend()
  let status: 'sent' | 'logged' | 'failed' = 'logged'
  let error: string | undefined

  if (!r) {
    console.log(
      `\n📧 [email not configured — would send]\n  To: ${msg.to}\n  Subject: ${msg.subject}\n` +
        `  Attachments: ${msg.attachments?.map((a) => a.filename).join(', ') || 'none'}\n` +
        msg.text.split('\n').map((l) => `  | ${l}`).join('\n') + '\n',
    )
  } else {
    try {
      const res = await r.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: msg.to,
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        replyTo: msg.replyTo,
        attachments: msg.attachments,
      })
      if (res.error) throw new Error(res.error.message)
      status = 'sent'
    } catch (e) {
      status = 'failed'
      error = e instanceof Error ? e.message : String(e)
      console.error('Email failed:', error)
    }
  }

  await db
    .insert(notificationLog)
    .values({ channel: 'email', to: msg.to, subject: msg.subject, body: msg.text.slice(0, 2000), status, error })
    .catch((e) => console.error('notification log failed', e))

  return { ok: status !== 'failed', error }
}
