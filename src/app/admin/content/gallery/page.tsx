import type { Metadata } from 'next'
import Link from 'next/link'
import { asc } from 'drizzle-orm'
import { Plus } from 'lucide-react'
import { db } from '@/db'
import { galleryItems } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { ConfirmButton } from '@/components/form'
import { Badge, Card, EmptyState, LinkButton, PageHeader } from '@/components/ui'
import { ContentTabs } from '../tabs'
import { deleteGalleryAction, toggleGalleryAction } from './actions'

export const metadata: Metadata = { title: 'Gallery' }

export default async function GalleryAdminPage() {
  await requireUser('content:manage')
  const items = await db.select().from(galleryItems).orderBy(asc(galleryItems.sort), asc(galleryItems.id))

  return (
    <>
      <PageHeader
        title="Website content"
        description="Photos of your work. Featured photos appear on the home page; all published photos appear on the Our Work page."
        actions={
          <LinkButton href="/admin/content/gallery/new">
            <Plus className="size-4" /> Add photo
          </LinkButton>
        }
      />
      <ContentTabs active="/admin/content/gallery" />

      {items.length === 0 ? (
        <Card>
          <EmptyState
            title="No photos yet"
            description="Before-and-after photos are the best way to win jobs. Snap one at the end of every job."
            action={<LinkButton href="/admin/content/gallery/new">Add your first photo</LinkButton>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((g) => (
            <Card key={g.id} className={`overflow-hidden ${g.published ? '' : 'opacity-70'}`}>
              <Link href={`/admin/content/gallery/${g.id}`} className="relative block aspect-[4/3] bg-slate-100">
                <img src={g.imageUrl} alt={g.title} className="size-full object-cover" loading="lazy" />
                {g.beforeImageUrl ? (
                  <img
                    src={g.beforeImageUrl}
                    alt=""
                    className="absolute bottom-2 left-2 size-16 rounded-md object-cover shadow ring-2 ring-surface"
                    loading="lazy"
                  />
                ) : null}
                <div className="absolute top-2 left-2 flex gap-1">
                  {g.featured ? <Badge tone="brand">Featured</Badge> : null}
                  {!g.published ? <Badge>Hidden</Badge> : null}
                  {g.imageUrl.startsWith('/placeholder/') ? <Badge tone="yellow">Sample</Badge> : null}
                </div>
              </Link>
              <div className="p-4">
                <Link href={`/admin/content/gallery/${g.id}`} className="font-medium text-slate-900 hover:text-brand-fg">
                  {g.title}
                </Link>
                <p className="text-xs text-slate-500">
                  {g.category} · sort {g.sort}
                  {g.beforeImageUrl ? ' · before & after' : ''}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <ConfirmButton action={toggleGalleryAction} hidden={{ id: g.id, field: 'featured' }}>
                    {g.featured ? 'Unfeature' : 'Feature'}
                  </ConfirmButton>
                  <ConfirmButton action={toggleGalleryAction} hidden={{ id: g.id, field: 'published' }}>
                    {g.published ? 'Hide' : 'Publish'}
                  </ConfirmButton>
                  <ConfirmButton action={deleteGalleryAction} hidden={{ id: g.id }} variant="danger" confirm={`Delete “${g.title}”?`}>
                    Delete
                  </ConfirmButton>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
