import type { Metadata } from 'next'
import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { invites, users } from '@/db/schema'
import { getSettings } from '@/lib/settings'
import { ROLE_LABELS } from '@/lib/permissions'
import { formatPhone } from '@/lib/utils'
import { ActionForm, SubmitButton } from '@/components/form'
import { Badge, Card, Field, Input, LinkButton } from '@/components/ui'
import { acceptInviteAction } from './actions'

export const metadata: Metadata = { title: 'Join the team', robots: { index: false, follow: false } }

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const s = await getSettings()
  const [inv] = token.length <= 64 ? await db.select().from(invites).where(eq(invites.token, token)) : []

  let problem: string | null = null
  if (!inv) problem = "This link isn't valid. It may have been replaced by a newer invite, or copied incorrectly."
  else if (inv.acceptedAt) problem = 'This link has already been used. If that was you, just sign in.'
  else if (inv.expiresAt < new Date()) problem = 'This link has expired. Links are good for 7 days.'

  const [existing] = inv && !problem ? await db.select().from(users).where(eq(users.email, inv.email)) : []
  const isReset = !!existing

  return (
    <main className="bg-drywall flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <p className="mb-6 text-center text-xl font-bold text-slate-900">{s.businessName}</p>
        {problem || !inv ? (
          <Card className="p-6 text-center">
            <h1 className="text-lg font-semibold text-slate-900">This link can&apos;t be used</h1>
            <p className="mt-2 text-sm text-slate-600">{problem}</p>
            <p className="mt-2 text-sm text-slate-600">
              Ask {s.ownerName} to send you a new link{s.phone ? <> — call or text {formatPhone(s.phone)}</> : null}.
            </p>
            <div className="mt-5 flex justify-center">
              <LinkButton href="/login" variant="secondary">
                Go to sign in
              </LinkButton>
            </div>
          </Card>
        ) : (
          <Card className="p-6">
            <h1 className="text-lg font-semibold text-slate-900">{isReset ? 'Set a new password' : `Join ${s.businessName}`}</h1>
            <p className="mt-1 mb-5 text-sm text-slate-500">
              {isReset ? (
                <>Choose a new password for {inv.email}.</>
              ) : (
                <>
                  You&apos;ve been invited to the team dashboard as <Badge>{ROLE_LABELS[inv.role]}</Badge>. Choose a password to finish
                  setting up your account.
                </>
              )}
            </p>
            <ActionForm action={acceptInviteAction.bind(null, token)} className="space-y-4">
              <Field label="Email">
                <Input value={inv.email} readOnly disabled autoComplete="username" />
              </Field>
              <Field label="Your name" htmlFor="name">
                <Input id="name" name="name" defaultValue={existing?.name ?? inv.name} required maxLength={120} autoComplete="name" />
              </Field>
              {!isReset ? (
                <Field label="Mobile phone (optional)" htmlFor="phone" hint="So we can text you your job schedule.">
                  <Input id="phone" name="phone" type="tel" autoComplete="tel" />
                </Field>
              ) : null}
              <Field label="Password" htmlFor="password" hint="At least 10 characters. A short phrase is easy to remember.">
                <Input id="password" name="password" type="password" minLength={10} required autoComplete="new-password" />
              </Field>
              <Field label="Confirm password" htmlFor="confirm">
                <Input id="confirm" name="confirm" type="password" minLength={10} required autoComplete="new-password" />
              </Field>
              <SubmitButton className="w-full" pendingText="Setting up…">
                {isReset ? 'Save password & sign in' : 'Join the team'}
              </SubmitButton>
            </ActionForm>
          </Card>
        )}
        <p className="mt-4 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-slate-700 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  )
}
