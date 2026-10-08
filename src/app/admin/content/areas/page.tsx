import type { Metadata } from 'next'
import Link from 'next/link'
import { asc } from 'drizzle-orm'
import { ExternalLink, Plus } from 'lucide-react'
import { db } from '@/db'
import { serviceAreas } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { ConfirmButton } from '@/components/form'
import { Badge, Card, EmptyState, LinkButton, PageHeader } from '@/components/ui'
import { ContentTabs } from '../tabs'
import { SEED_AREA_CITIES } from '../constants'
import { deleteAreaAction, toggleAreaAction } from './actions'

export const metadata: Metadata = { title: 'Service areas' }

export default async function AreasAdminPage() {
  await requireUser('content:manage')
  const rows = await db.select().from(serviceAreas).orderBy(asc(serviceAreas.state), asc(serviceAreas.city))

  return (
    <>
      <PageHeader
        title="Website content"
        description="Towns you work in. Each published area gets its own page at /areas/<town> so people searching “drywall repair in <town>” can find you."
        actions={
          <LinkButton href="/admin/content/areas/new">
            <Plus className="size-4" /> Add area
          </LinkButton>
        }
      />
      <ContentTabs active="/admin/content/areas" />

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title="No service areas yet"
            description="Add your home town and the towns around it that you're happy to drive to."
            action={<LinkButton href="/admin/content/areas/new">Add an area</LinkButton>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Area</th>
                  <th>Page</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id}>
                    <td className="min-w-40">
                      <Link href={`/admin/content/areas/${a.id}`} className="font-medium text-slate-900 hover:text-brand-fg">
                        {a.city}, {a.state}
                      </Link>
                      {a.blurb ? <p className="line-clamp-1 max-w-xs text-xs text-slate-500">{a.blurb}</p> : null}
                    </td>
                    <td>
                      {a.published ? (
                        <a href={`/areas/${a.slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-slate-600 hover:text-brand-fg">
                          /areas/{a.slug} <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        <span className="font-mono text-xs text-slate-400">/areas/{a.slug}</span>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-col items-start gap-1">
                        {a.published ? <Badge tone="green">Published</Badge> : <Badge>Hidden</Badge>}
                        {SEED_AREA_CITIES.includes(a.city) ? <Badge tone="yellow">Sample</Badge> : null}
                      </div>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <LinkButton href={`/admin/content/areas/${a.id}`} variant="secondary" size="sm">
                          Edit
                        </LinkButton>
                        <ConfirmButton action={toggleAreaAction} hidden={{ id: a.id }}>
                          {a.published ? 'Hide' : 'Publish'}
                        </ConfirmButton>
                        <ConfirmButton action={deleteAreaAction} hidden={{ id: a.id }} variant="danger" confirm={`Remove ${a.city}, ${a.state}?`}>
                          Delete
                        </ConfirmButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
