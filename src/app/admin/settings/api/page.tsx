import type { Metadata } from 'next'
import { desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { apiAuditLog, apiKeys } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { appUrl } from '@/lib/settings'
import { formatDateTime } from '@/lib/dates'
import { API_SCOPES } from '@/lib/api/keys'
import { OPERATIONS } from '@/lib/api/ops'
import { Badge, Card, CardHeader, EmptyState, PageHeader } from '@/components/ui'
import { ConfirmButton } from '@/components/form'
import { CreateKeyForm } from './create-key-form'
import { revokeApiKey } from './actions'

export const metadata: Metadata = { title: 'API & assistant' }

export default async function ApiSettingsPage() {
  await requireUser('settings:manage')
  const [keys, log] = await Promise.all([
    db.select().from(apiKeys).where(isNull(apiKeys.revokedAt)).orderBy(desc(apiKeys.createdAt)),
    db
      .select({ a: apiAuditLog, keyName: apiKeys.name })
      .from(apiAuditLog)
      .leftJoin(apiKeys, eq(apiKeys.id, apiAuditLog.keyId))
      .orderBy(desc(apiAuditLog.createdAt))
      .limit(100),
  ])
  const base = appUrl('/api/v1')
  const scopes = Object.entries(API_SCOPES).map(([id, label]) => ({ id, label, defaultOn: id === 'read' || id === 'write' }))

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: '/admin/settings', label: 'Settings' }}
        title="API & assistant"
        description="Let an AI assistant (like your Grok bot) read your business data and enter things for you. Every change it makes is logged below."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardHeader title="Create an API key" description="Give the assistant only the permissions it needs." />
          <div className="p-5">
            <CreateKeyForm scopes={scopes} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Connect your Grok bot" />
          <div className="space-y-4 p-5 text-sm text-slate-700">
            <p>Your bot needs the API key plus one of these, depending on how it’s built:</p>
            <ul className="space-y-3">
              <li>
                <p className="font-medium text-slate-900">Function calling (xAI API)</p>
                <p>
                  Load tool definitions from <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">GET {base}/tools</code>, pass them to Grok,
                  and forward each tool call to <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">POST {base}/tools/call</code> with{' '}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">{'{"name","arguments"}'}</code>. A ready-made example is in{' '}
                  <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">scripts/grok-assistant.ts</code>.
                </p>
              </li>
              <li>
                <p className="font-medium text-slate-900">OpenAPI import</p>
                <p>
                  Point the bot platform at <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">{base}/openapi.json</code>.
                </p>
              </li>
              <li>
                <p className="font-medium text-slate-900">Every request</p>
                <p>
                  Send the header <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">Authorization: Bearer &lt;your key&gt;</code>.
                </p>
              </li>
            </ul>
            <p className="text-xs text-slate-500">
              {OPERATIONS.length} tools available: business overview, leads, customers, estimates, jobs, crew, schedule, invoices, payments, expenses
              with receipts, price list, profit reports, website content and settings.
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Active keys" />
        {keys.length === 0 ? (
          <EmptyState title="No API keys yet" description="Create one above to connect your assistant." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Key</th>
                  <th>Permissions</th>
                  <th>Last used</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td className="font-medium">{k.name}</td>
                    <td className="font-mono text-xs text-slate-500">{k.prefix}…</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {k.scopes.map((s) => (
                          <Badge key={s} tone={s === 'send' || s === 'settings' ? 'yellow' : 'gray'}>
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="text-slate-500">{k.lastUsedAt ? formatDateTime(k.lastUsedAt) : 'Never'}</td>
                    <td className="text-right">
                      <ConfirmButton
                        action={revokeApiKey}
                        hidden={{ id: k.id }}
                        variant="danger"
                        confirm={`Revoke "${k.name}"? Anything using it will stop working immediately.`}
                      >
                        Revoke
                      </ConfirmButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title="Assistant activity" description="Every change made through the API (last 100), plus any errors." />
        {log.length === 0 ? (
          <EmptyState title="Nothing yet" description="Changes your assistant makes will show up here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Key</th>
                  <th>Action</th>
                  <th>Result</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {log.map(({ a, keyName }) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap text-slate-500">{formatDateTime(a.createdAt)}</td>
                    <td className="whitespace-nowrap">{keyName ?? '—'}</td>
                    <td className="font-mono text-xs whitespace-nowrap">{a.operation}</td>
                    <td>
                      <Badge tone={a.status < 300 ? 'green' : a.status < 500 ? 'yellow' : 'red'}>{a.status < 300 ? 'OK' : a.status}</Badge>
                    </td>
                    <td className="max-w-md truncate text-xs text-slate-500" title={a.summary ?? ''}>
                      {a.summary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
