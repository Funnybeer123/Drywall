import type { Metadata } from 'next'
import Link from 'next/link'
import { asc } from 'drizzle-orm'
import { Plus } from 'lucide-react'
import { db } from '@/db'
import { faqs } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { ConfirmButton } from '@/components/form'
import { Card, EmptyState, LinkButton, PageHeader } from '@/components/ui'
import { ContentTabs } from '../tabs'
import { deleteFaqAction } from './actions'

export const metadata: Metadata = { title: 'FAQ' }

export default async function FaqsAdminPage() {
  await requireUser('content:manage')
  const rows = await db.select().from(faqs).orderBy(asc(faqs.sort), asc(faqs.id))

  return (
    <>
      <PageHeader
        title="Website content"
        description="Frequently asked questions. Answering common questions up front saves you phone time and builds trust."
        actions={
          <LinkButton href="/admin/content/faqs/new">
            <Plus className="size-4" /> Add question
          </LinkButton>
        }
      />
      <ContentTabs active="/admin/content/faqs" />

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title="No questions yet"
            description="Think about what customers ask on every call: price, timing, mess, insurance."
            action={<LinkButton href="/admin/content/faqs/new">Add a question</LinkButton>}
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((f) => (
              <li key={f.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/content/faqs/${f.id}`} className="font-medium text-slate-900 hover:text-brand">
                    {f.question}
                  </Link>
                  <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{f.answer}</p>
                  <p className="mt-0.5 text-xs text-slate-400">sort {f.sort}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <LinkButton href={`/admin/content/faqs/${f.id}`} variant="secondary" size="sm">
                    Edit
                  </LinkButton>
                  <ConfirmButton action={deleteFaqAction} hidden={{ id: f.id }} variant="danger" confirm="Delete this question?">
                    Delete
                  </ConfirmButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
