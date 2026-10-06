import type { Metadata } from 'next'
import Link from 'next/link'
import { asc } from 'drizzle-orm'
import { Plus, TriangleAlert } from 'lucide-react'
import { db } from '@/db'
import { testimonials } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { ConfirmButton } from '@/components/form'
import { Badge, Card, EmptyState, LinkButton, PageHeader, Stars } from '@/components/ui'
import { ContentTabs } from '../tabs'
import { SAMPLE_TESTIMONIAL_PREFIX } from '../constants'
import { deleteSampleTestimonialsAction, deleteTestimonialAction, toggleTestimonialAction } from './actions'

export const metadata: Metadata = { title: 'Reviews' }

export default async function TestimonialsAdminPage() {
  await requireUser('content:manage')
  const rows = await db.select().from(testimonials).orderBy(asc(testimonials.sort), asc(testimonials.id))
  const samples = rows.filter((r) => r.customerName.startsWith(SAMPLE_TESTIMONIAL_PREFIX)).length

  return (
    <>
      <PageHeader
        title="Website content"
        description="Customer reviews shown on your website. Featured reviews appear on the home page."
        actions={
          <LinkButton href="/admin/content/testimonials/new">
            <Plus className="size-4" /> Add review
          </LinkButton>
        }
      />
      <ContentTabs active="/admin/content/testimonials" />

      <div className="mb-6 flex flex-col gap-3 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-semibold">Only publish real reviews from real customers.</p>
            <p>
              Delete the sample reviews before launch. Copy reviews customers left you on Google or Facebook, or ask happy customers for a
              quote — fake reviews can get a business fined.
            </p>
          </div>
        </div>
        {samples > 0 ? (
          <ConfirmButton
            action={deleteSampleTestimonialsAction}
            variant="danger"
            confirm={`Delete all ${samples} sample review(s)? This can't be undone.`}
          >
            Delete {samples} sample review{samples === 1 ? '' : 's'}
          </ConfirmButton>
        ) : null}
      </div>

      <Card>
        {rows.length === 0 ? (
          <EmptyState
            title="No reviews yet"
            description="Add your best real customer reviews here. Turn on review requests in Settings to collect more automatically."
            action={<LinkButton href="/admin/content/testimonials/new">Add a review</LinkButton>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Review</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td className="min-w-40">
                      <Link href={`/admin/content/testimonials/${t.id}`} className="font-medium text-slate-900 hover:text-brand">
                        {t.customerName}
                      </Link>
                      <div className="text-xs text-slate-500">{[t.location, t.projectType].filter(Boolean).join(' · ')}</div>
                      <Stars rating={t.rating} className="text-sm" />
                    </td>
                    <td className="max-w-md min-w-64">
                      <p className="line-clamp-3 text-slate-600">&ldquo;{t.quote}&rdquo;</p>
                    </td>
                    <td>
                      <div className="flex flex-col items-start gap-1">
                        {t.published ? <Badge tone="green">Published</Badge> : <Badge>Hidden</Badge>}
                        {t.featured ? <Badge tone="brand">Featured</Badge> : null}
                        {t.customerName.startsWith(SAMPLE_TESTIMONIAL_PREFIX) ? <Badge tone="yellow">Sample</Badge> : null}
                      </div>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <ConfirmButton action={toggleTestimonialAction} hidden={{ id: t.id, field: 'featured' }}>
                          {t.featured ? 'Unfeature' : 'Feature'}
                        </ConfirmButton>
                        <ConfirmButton action={toggleTestimonialAction} hidden={{ id: t.id, field: 'published' }}>
                          {t.published ? 'Hide' : 'Publish'}
                        </ConfirmButton>
                        <ConfirmButton action={deleteTestimonialAction} hidden={{ id: t.id }} variant="danger" confirm="Delete this review?">
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
