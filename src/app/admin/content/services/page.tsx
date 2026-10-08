import type { Metadata } from 'next'
import Link from 'next/link'
import { asc } from 'drizzle-orm'
import { Hammer, Plus } from 'lucide-react'
import { db } from '@/db'
import { services } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { ConfirmButton } from '@/components/form'
import { Badge, Card, EmptyState, LinkButton, PageHeader } from '@/components/ui'
import { ContentTabs } from '../tabs'
import { SERVICE_ICONS } from '../constants'
import { deleteServiceAction, toggleServiceAction } from './actions'

export const metadata: Metadata = { title: 'Services' }

export default async function ServicesAdminPage() {
  await requireUser('content:manage')
  const rows = await db.select().from(services).orderBy(asc(services.sort), asc(services.id))

  return (
    <>
      <PageHeader
        title="Website content"
        description="The services listed on your website. Clear names and detailed descriptions help you show up on Google."
        actions={
          <LinkButton href="/admin/content/services/new">
            <Plus className="size-4" /> Add service
          </LinkButton>
        }
      />
      <ContentTabs active="/admin/content/services" />

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title="No services yet"
            description="List what you do — hanging, finishing, repairs, textures…"
            action={<LinkButton href="/admin/content/services/new">Add a service</LinkButton>}
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {rows.map((s) => {
              const Icon = SERVICE_ICONS[s.icon]?.Icon ?? Hammer
              return (
                <li key={s.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-fg">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2">
                        <Link href={`/admin/content/services/${s.id}`} className="font-medium text-slate-900 hover:text-brand-fg">
                          {s.name}
                        </Link>
                        {s.published ? null : <Badge>Hidden</Badge>}
                      </p>
                      <p className="line-clamp-2 text-sm text-slate-500">{s.summary}</p>
                      <p className="mt-0.5 font-mono text-xs text-slate-400">
                        /services#{s.slug} · sort {s.sort}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <LinkButton href={`/admin/content/services/${s.id}`} variant="secondary" size="sm">
                      Edit
                    </LinkButton>
                    <ConfirmButton action={toggleServiceAction} hidden={{ id: s.id }}>
                      {s.published ? 'Hide' : 'Publish'}
                    </ConfirmButton>
                    <ConfirmButton action={deleteServiceAction} hidden={{ id: s.id }} variant="danger" confirm={`Delete “${s.name}”? Its page will stop working.`}>
                      Delete
                    </ConfirmButton>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </>
  )
}
