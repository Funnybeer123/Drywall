import type { Metadata } from 'next'
import { desc } from 'drizzle-orm'
import { Mail, MessageSquare } from 'lucide-react'
import { db } from '@/db'
import { notificationLog } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { formatDateTime } from '@/lib/dates'
import { Badge, Card, EmptyState, PageHeader, type BadgeTone } from '@/components/ui'

export const metadata: Metadata = { title: 'Notification log' }

const STATUS: Record<string, { tone: BadgeTone; label: string }> = {
  sent: { tone: 'green', label: 'Sent' },
  logged: { tone: 'yellow', label: 'Not sent (not configured)' },
  failed: { tone: 'red', label: 'Failed' },
}

export default async function NotificationLogPage() {
  await requireUser('settings:manage')
  const rows = await db.select().from(notificationLog).orderBy(desc(notificationLog.createdAt), desc(notificationLog.id)).limit(100)

  return (
    <>
      <PageHeader
        back={{ href: '/admin/settings', label: 'Settings' }}
        title="Notification log"
        description="The last 100 emails and texts the system tried to send. Use it to check whether a customer got their invoice or a lead alert went out."
      />
      <Card>
        {rows.length === 0 ? (
          <EmptyState title="Nothing sent yet" description="Emails and texts will show up here as they go out." />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Type</th>
                  <th>To</th>
                  <th>Subject / message</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const st = STATUS[r.status] ?? { tone: 'gray' as const, label: r.status }
                  return (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap text-slate-600">{formatDateTime(r.createdAt)}</td>
                      <td>
                        <span className="inline-flex items-center gap-1.5 text-slate-700">
                          {r.channel === 'sms' ? <MessageSquare className="size-4" /> : <Mail className="size-4" />}
                          {r.channel === 'sms' ? 'Text' : 'Email'}
                        </span>
                      </td>
                      <td className="max-w-48 break-all text-slate-700">{r.to}</td>
                      <td className="max-w-md min-w-56">
                        <p className="font-medium text-slate-900">{r.subject ?? <span className="text-slate-400">—</span>}</p>
                        <p className="line-clamp-2 text-xs text-slate-500">{r.body}</p>
                      </td>
                      <td>
                        <Badge tone={st.tone}>{st.label}</Badge>
                        {r.error ? <p className="mt-1 max-w-56 text-xs break-words text-red-600">{r.error}</p> : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
