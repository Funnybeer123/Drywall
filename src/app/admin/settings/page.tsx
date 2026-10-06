import type { Metadata } from 'next'
import { CircleCheck, CircleX } from 'lucide-react'
import { requireUser } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { ActionForm, SubmitButton } from '@/components/form'
import { Card, CardHeader, Checkbox, Field, Input, LinkButton, PageHeader, Textarea } from '@/components/ui'
import { PhotoInput } from '@/components/photo-input'
import { ColorField } from './color-field'
import {
  saveBrandingAction,
  saveBusinessAction,
  saveInvoicingAction,
  saveMarketingAction,
  saveNotificationsAction,
  saveSchedulingAction,
  sendTestEmailAction,
  sendTestSmsAction,
} from './actions'

export const metadata: Metadata = { title: 'Settings' }

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function configured(...keys: string[]) {
  return keys.every((k) => !!process.env[k]?.trim())
}

function integrations() {
  return [
    { name: 'Email (Resend)', ok: configured('RESEND_API_KEY'), keys: 'RESEND_API_KEY', note: 'Without it, emails are only printed to the server log.' },
    {
      name: 'Text messages (Twilio)',
      ok: configured('TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'),
      keys: 'TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER',
      note: 'Needed for lead alerts and crew reminders by text.',
    },
    { name: 'Online payments (Stripe)', ok: configured('STRIPE_SECRET_KEY'), keys: 'STRIPE_SECRET_KEY', note: 'Lets customers pay invoices by card.' },
    {
      name: 'Stripe webhook',
      ok: configured('STRIPE_WEBHOOK_SECRET'),
      keys: 'STRIPE_WEBHOOK_SECRET',
      note: 'Marks invoices paid automatically after an online payment.',
    },
    {
      name: 'Photo storage (Vercel Blob)',
      ok: configured('BLOB_READ_WRITE_TOKEN'),
      keys: 'BLOB_READ_WRITE_TOKEN',
      note: 'Required for uploads when hosted. Locally, files go to public/uploads.',
    },
    {
      name: 'Database (Postgres)',
      ok: configured('DATABASE_URL'),
      keys: 'DATABASE_URL',
      note: 'Without it, the built-in local database is used (development only).',
    },
    {
      name: 'Spam protection (Turnstile)',
      ok: configured('NEXT_PUBLIC_TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY'),
      keys: 'NEXT_PUBLIC_TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY',
      note: 'Optional. Blocks bots on the quote form.',
    },
  ]
}

export default async function SettingsPage() {
  await requireUser('settings:manage')
  const s = await getSettings()
  const workDays = new Set(s.workDays.split(',').map(Number))
  const status = integrations()

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your business details, branding and automation. Changes show on the website right away."
        actions={
          <>
            <LinkButton href="/admin/settings/api" variant="secondary">
              API &amp; assistant
            </LinkButton>
            <LinkButton href="/admin/settings/notifications" variant="secondary">
              Notification log
            </LinkButton>
          </>
        }
      />

      <div className="space-y-6">
        {/* Business info */}
        <Card>
          <CardHeader title="Business info" description="Shown on your website, estimates, invoices and emails." />
          <ActionForm action={saveBusinessAction} className="p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business name" htmlFor="businessName">
                <Input id="businessName" name="businessName" defaultValue={s.businessName} required maxLength={120} />
              </Field>
              <Field label="Owner name" htmlFor="ownerName">
                <Input id="ownerName" name="ownerName" defaultValue={s.ownerName} required maxLength={120} />
              </Field>
              <Field label="Tagline" htmlFor="tagline" className="sm:col-span-2">
                <Input id="tagline" name="tagline" defaultValue={s.tagline} maxLength={200} />
              </Field>
              <Field label="Phone" htmlFor="phone" hint="Customers call and text this number.">
                <Input id="phone" name="phone" type="tel" defaultValue={s.phone} required />
              </Field>
              <Field label="Email" htmlFor="email">
                <Input id="email" name="email" type="email" defaultValue={s.email} required />
              </Field>
              <Field label="Street address (optional)" htmlFor="address" className="sm:col-span-2">
                <Input id="address" name="address" defaultValue={s.address} maxLength={200} />
              </Field>
              <Field label="City" htmlFor="city">
                <Input id="city" name="city" defaultValue={s.city} required maxLength={120} />
              </Field>
              <Field label="State" htmlFor="state">
                <Input id="state" name="state" defaultValue={s.state} required maxLength={20} />
              </Field>
              <Field label="License number" htmlFor="licenseNumber">
                <Input id="licenseNumber" name="licenseNumber" defaultValue={s.licenseNumber} maxLength={80} />
              </Field>
              <Field label="Years in business" htmlFor="yearsInBusiness">
                <Input id="yearsInBusiness" name="yearsInBusiness" type="number" min={0} max={100} defaultValue={s.yearsInBusiness} required />
              </Field>
              <div className="sm:col-span-2">
                <Checkbox name="insured" defaultChecked={s.insured} label="Fully insured (shows an “Insured” badge on the website)" />
              </div>
              <Field label="About us" htmlFor="aboutText" className="sm:col-span-2" hint="A few sentences in your own words. Shown on the About page.">
                <Textarea id="aboutText" name="aboutText" defaultValue={s.aboutText} rows={6} maxLength={5000} />
              </Field>
            </div>
            <div className="mt-5">
              <SubmitButton>Save business info</SubmitButton>
            </div>
          </ActionForm>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader title="Branding" description="Your color and logo, plus the big headline at the top of the home page." />
          <ActionForm action={saveBrandingAction} className="p-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Accent color" className="sm:col-span-2" hint="Used for buttons and highlights across the site and emails.">
                <ColorField name="accentColor" defaultValue={s.accentColor} />
              </Field>
              <div className="sm:col-span-2">
                <p className="mb-1.5 text-sm font-medium text-slate-700">Logo</p>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex h-24 w-40 shrink-0 items-center justify-center rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
                    {s.logoUrl ? (
                      <img src={s.logoUrl} alt="Current logo" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-xs text-slate-400">No logo yet</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <PhotoInput name="logo" multiple={false} max={1} accept="image/png,image/jpeg,image/webp" label={s.logoUrl ? 'Replace logo' : 'Upload logo'} />
                    <p className="text-xs text-slate-500">A wide PNG with a transparent background looks best. Without a logo, your business name is shown.</p>
                    {s.logoUrl ? <Checkbox name="removeLogo" label="Remove logo" /> : null}
                  </div>
                </div>
              </div>
              <Field label="Home page headline" htmlFor="heroHeadline" className="sm:col-span-2">
                <Input id="heroHeadline" name="heroHeadline" defaultValue={s.heroHeadline} required maxLength={160} />
              </Field>
              <Field label="Home page subheadline" htmlFor="heroSubhead" className="sm:col-span-2">
                <Textarea id="heroSubhead" name="heroSubhead" defaultValue={s.heroSubhead} required rows={2} maxLength={400} className="min-h-0" />
              </Field>
            </div>
            <div className="mt-5">
              <SubmitButton>Save branding</SubmitButton>
            </div>
          </ActionForm>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Invoices */}
          <Card>
            <CardHeader title="Invoices & payments" description="Defaults for new estimates and invoices." />
            <ActionForm action={saveInvoicingAction} className="space-y-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Sales tax rate" htmlFor="taxRatePct" hint="Use 0 if you don't charge tax on labor.">
                  <div className="relative">
                    <Input
                      id="taxRatePct"
                      name="taxRatePct"
                      type="number"
                      step="0.001"
                      min={0}
                      max={25}
                      defaultValue={s.taxRateBps / 100}
                      className="pr-8"
                      required
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">%</span>
                  </div>
                </Field>
                <Field label="Payment due in" htmlFor="paymentTermsDays" hint="0 = due on receipt.">
                  <div className="relative">
                    <Input id="paymentTermsDays" name="paymentTermsDays" type="number" min={0} max={365} defaultValue={s.paymentTermsDays} className="pr-12" required />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500">days</span>
                  </div>
                </Field>
              </div>
              <Field label="Invoice footer" htmlFor="invoiceFooter" hint="Printed at the bottom of every invoice — e.g. thank-you note, check payable to, warranty.">
                <Textarea id="invoiceFooter" name="invoiceFooter" defaultValue={s.invoiceFooter} rows={3} maxLength={1000} />
              </Field>
              <SubmitButton>Save</SubmitButton>
            </ActionForm>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader title="Notifications" description="Where new quote requests and alerts go." />
            <ActionForm action={saveNotificationsAction} className="space-y-4 p-5">
              <Field label="Alert email" htmlFor="notifyEmail" hint={`Leave blank to use the business email (${s.email}).`}>
                <Input id="notifyEmail" name="notifyEmail" type="email" defaultValue={s.notifyEmail} />
              </Field>
              <Field label="Alert mobile number" htmlFor="notifyPhone" hint={`Gets a text for every new quote request. Blank = business phone (${s.phone}).`}>
                <Input id="notifyPhone" name="notifyPhone" type="tel" defaultValue={s.notifyPhone} />
              </Field>
              <SubmitButton>Save</SubmitButton>
            </ActionForm>
            <div className="flex flex-wrap gap-3 border-t border-slate-100 p-5">
              <ActionForm action={sendTestEmailAction}>
                <SubmitButton variant="secondary" size="sm" pendingText="Sending…">
                  Send test email
                </SubmitButton>
              </ActionForm>
              <ActionForm action={sendTestSmsAction}>
                <SubmitButton variant="secondary" size="sm" pendingText="Sending…">
                  Send test text
                </SubmitButton>
              </ActionForm>
            </div>
          </Card>

          {/* Scheduling */}
          <Card>
            <CardHeader title="Scheduling" description="Controls which days customers can be booked." />
            <ActionForm action={saveSchedulingAction} className="space-y-4 p-5">
              <Field
                label="Jobs you can run at the same time"
                htmlFor="dailyCapacity"
                hint="Start at 1 if it's just you. Increase it as you hire crews — 2 crews = 2 jobs at once."
              >
                <Input id="dailyCapacity" name="dailyCapacity" type="number" min={1} max={50} defaultValue={s.dailyCapacity} className="w-28" required />
              </Field>
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium text-slate-700">Work days</legend>
                <div className="flex flex-wrap gap-2">
                  {DAYS.map((d, i) => (
                    <label
                      key={d}
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm ring-1 ring-slate-300 ring-inset has-[:checked]:bg-brand-soft has-[:checked]:ring-brand"
                    >
                      <input type="checkbox" name="workDays" value={i} defaultChecked={workDays.has(i)} className="size-4 accent-[var(--brand)]" />
                      {d}
                    </label>
                  ))}
                </div>
              </fieldset>
              <SubmitButton>Save</SubmitButton>
            </ActionForm>
          </Card>

          {/* Marketing */}
          <Card>
            <CardHeader title="Marketing & reviews" description="Automatic follow-ups that bring in more work." />
            <ActionForm action={saveMarketingAction} className="space-y-4 p-5">
              <Field
                label="Google review link"
                htmlFor="googleReviewUrl"
                hint={
                  <>
                    Get it from your Google Business Profile: search your business name on Google, click <strong>Ask for reviews</strong> (or
                    &ldquo;Get more reviews&rdquo;), then copy the link. It looks like https://g.page/r/…
                  </>
                }
              >
                <Input id="googleReviewUrl" name="googleReviewUrl" type="url" placeholder="https://g.page/r/..." defaultValue={s.googleReviewUrl} />
              </Field>
              <Field label="Facebook page" htmlFor="facebookUrl">
                <Input id="facebookUrl" name="facebookUrl" type="url" placeholder="https://facebook.com/..." defaultValue={s.facebookUrl} />
              </Field>
              <Field label="Instagram" htmlFor="instagramUrl">
                <Input id="instagramUrl" name="instagramUrl" type="url" placeholder="https://instagram.com/..." defaultValue={s.instagramUrl} />
              </Field>
              <div className="space-y-3 rounded-lg bg-slate-50 p-3">
                <Checkbox name="reviewRequestsEnabled" defaultChecked={s.reviewRequestsEnabled} label="Ask customers for a review after a job is completed" />
                <div className="ml-6 flex items-center gap-2 text-sm text-slate-600">
                  Send
                  <Input name="reviewDelayDays" type="number" min={0} max={60} defaultValue={s.reviewDelayDays} className="w-20" aria-label="Days after completion" />
                  day(s) after the job is marked complete
                </div>
                <Checkbox name="overdueRemindersEnabled" defaultChecked={s.overdueRemindersEnabled} label="Send weekly reminders for overdue invoices" />
              </div>
              <SubmitButton>Save</SubmitButton>
            </ActionForm>
          </Card>
        </div>

        {/* Integrations */}
        <Card>
          <CardHeader
            title="Integrations"
            description="Connected services. These are set as environment variables where the site is hosted (e.g. Vercel → Settings → Environment Variables)."
          />
          <ul className="divide-y divide-slate-100">
            {status.map((i) => (
              <li key={i.name} className="flex items-start gap-3 px-5 py-3">
                {i.ok ? (
                  <CircleCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-label="Configured" />
                ) : (
                  <CircleX className="mt-0.5 size-5 shrink-0 text-slate-400" aria-label="Not configured" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {i.name} <span className={i.ok ? 'text-emerald-700' : 'text-slate-500'}>— {i.ok ? 'connected' : 'not set up'}</span>
                  </p>
                  <p className="text-xs text-slate-500">{i.note}</p>
                  <p className="mt-0.5 font-mono text-[11px] break-all text-slate-400">{i.keys}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}
