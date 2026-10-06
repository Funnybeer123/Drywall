'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { leads } from '@/db/schema'
import { guard, reqStr, str, ValidationError, type ActionState } from '@/lib/action-state'
import { notifyNewLead } from '@/lib/notify'
import { rateLimit, verifyTurnstile } from '@/lib/rate-limit'
import { filesFrom, saveUpload } from '@/lib/storage'
import { JOB_TYPES, MAX_PHOTOS, SOURCES, TIMEFRAMES } from './options'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clip(v: string | null, max: number): string | null {
  return v == null ? null : v.slice(0, max)
}

function oneOf<T extends readonly string[]>(v: string | null, list: T): T[number] | null {
  return v && (list as readonly string[]).includes(v) ? (v as T[number]) : null
}

export async function submitQuote(_: ActionState, fd: FormData): Promise<ActionState> {
  return guard(async () => {
    // Honeypot: real people never see this field. Pretend it worked so bots move on.
    if (str(fd, 'company_website')) redirect('/quote/thanks')

    const name = clip(reqStr(fd, 'name', 'Your name'), 120)!
    const phone = clip(reqStr(fd, 'phone', 'Phone number'), 40)!
    if (phone.replace(/\D/g, '').length < 10) throw new ValidationError('Please enter a valid phone number, including area code.')
    const email = clip(str(fd, 'email'), 200)?.toLowerCase() ?? null
    if (email && !EMAIL_RE.test(email)) throw new ValidationError('That email address doesn’t look right.')

    const jobType = oneOf(reqStr(fd, 'jobType', 'Job type'), JOB_TYPES)
    if (!jobType) throw new ValidationError('Please choose a job type.')
    const description = clip(reqStr(fd, 'description', 'Project description'), 5000)!
    if (description.length < 10) throw new ValidationError('Please tell us a little more about the project.')

    const files = filesFrom(fd, 'photos')
    if (files.length > MAX_PHOTOS) throw new ValidationError(`Please attach no more than ${MAX_PHOTOS} photos.`)

    // Only count/verify submissions that passed validation, so typos don't lock people out.
    const h = await headers()
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'local'
    if (!rateLimit(`quote:${ip}`, 5, 60 * 60 * 1000)) {
      throw new ValidationError('Too many requests from this device. Please call or text us instead.')
    }
    const turnstileToken = typeof fd.get('cf-turnstile-response') === 'string' ? String(fd.get('cf-turnstile-response')) : null
    if (!(await verifyTurnstile(turnstileToken, ip === 'local' ? null : ip))) {
      throw new ValidationError('Please complete the “I’m not a robot” check and try again.')
    }

    const photoUrls: string[] = []
    for (const f of files) photoUrls.push(await saveUpload(f, 'leads'))

    const source = oneOf(str(fd, 'source'), SOURCES)
    const [lead] = await db
      .insert(leads)
      .values({
        name,
        phone,
        email,
        address: clip(str(fd, 'address'), 200),
        city: clip(str(fd, 'city'), 100),
        jobType,
        description,
        timeframe: oneOf(str(fd, 'timeframe'), TIMEFRAMES),
        source,
        referredBy: clip(str(fd, 'referredBy'), 120),
        photoUrls,
      })
      .returning()

    // Send emails/texts after the response so the customer isn't kept waiting.
    after(async () => {
      try {
        await notifyNewLead(lead)
      } catch (e) {
        console.error('notifyNewLead failed', e)
      }
    })

    revalidatePath('/admin', 'layout')
    redirect('/quote/thanks')
  })
}
