import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getSettings } from '@/lib/settings'
import { ActionForm, SubmitButton } from '@/components/form'
import { Card, Field, Input } from '@/components/ui'
import { loginAction } from './actions'

export const metadata: Metadata = { title: 'Sign in', robots: { index: false } }

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/admin')
  const s = await getSettings()
  return (
    <main className="bg-drywall flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 block text-center text-xl font-bold text-slate-900">
          {s.businessName}
        </Link>
        <Card className="p-6">
          <h1 className="text-lg font-semibold">Team sign in</h1>
          <p className="mb-5 text-sm text-slate-500">For owners, managers and crew.</p>
          <ActionForm action={loginAction} className="space-y-4">
            <Field label="Email" htmlFor="email">
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </Field>
            <Field label="Password" htmlFor="password">
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </Field>
            <SubmitButton className="w-full" pendingText="Signing in…">
              Sign in
            </SubmitButton>
          </ActionForm>
        </Card>
        <p className="mt-4 text-center text-xs text-slate-500">Forgot your password? Ask the owner to resend your invite.</p>
      </div>
    </main>
  )
}
