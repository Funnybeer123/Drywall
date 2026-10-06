import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { galleryItems } from '@/db/schema'
import { requireUser } from '@/lib/auth'
import { ActionForm, ConfirmButton, SubmitButton } from '@/components/form'
import { Card, Checkbox, Field, Input, PageHeader, Textarea } from '@/components/ui'
import { PhotoInput } from '@/components/photo-input'
import { GALLERY_CATEGORIES } from '../../constants'
import { parseIdParam } from '../../lib'
import { deleteGalleryAction, saveGalleryAction } from '../actions'

export const metadata: Metadata = { title: 'Gallery photo' }

export default async function GalleryItemPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser('content:manage')
  const id = parseIdParam((await params).id)
  const [item] = id === 'new' ? [] : await db.select().from(galleryItems).where(eq(galleryItems.id, id))
  if (id !== 'new' && !item) notFound()

  const existing = await db.selectDistinct({ category: galleryItems.category }).from(galleryItems)
  const categories = [...new Set([...GALLERY_CATEGORIES, ...existing.map((c) => c.category)])].sort()

  return (
    <>
      <PageHeader
        back={{ href: '/admin/content/gallery', label: 'Gallery' }}
        title={item ? 'Edit photo' : 'Add photo'}
        actions={
          item ? (
            <ConfirmButton action={deleteGalleryAction} hidden={{ id: item.id }} variant="danger" confirm="Delete this photo from the website?">
              Delete
            </ConfirmButton>
          ) : null
        }
      />
      <Card className="max-w-3xl">
        <ActionForm action={saveGalleryAction.bind(null, item?.id ?? null)} className="space-y-5 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="title" hint="Short and descriptive, e.g. “Basement finish in Chatham”.">
              <Input id="title" name="title" defaultValue={item?.title} required maxLength={160} />
            </Field>
            <Field label="Category" htmlFor="category" hint="Pick one or type a new category.">
              <Input id="category" name="category" list="gallery-categories" defaultValue={item?.category} required maxLength={60} autoComplete="off" />
              <datalist id="gallery-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
          </div>
          <Field label="Description (optional)" htmlFor="description">
            <Textarea id="description" name="description" defaultValue={item?.description ?? ''} rows={3} maxLength={2000} />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-700">After photo {item ? '' : <span className="text-red-600">*</span>}</p>
              {item ? (
                <img src={item.imageUrl} alt="Current after photo" className="mb-2 aspect-[4/3] w-full rounded-lg object-cover ring-1 ring-slate-200" />
              ) : null}
              <PhotoInput name="image" multiple={false} max={1} accept="image/jpeg,image/png,image/webp" label={item ? 'Replace after photo' : 'Choose after photo'} />
              <p className="mt-1 text-xs text-slate-500">The finished result — the main photo.</p>
            </div>
            <div>
              <p className="mb-1.5 text-sm font-medium text-slate-700">Before photo (optional)</p>
              {item?.beforeImageUrl ? (
                <img src={item.beforeImageUrl} alt="Current before photo" className="mb-2 aspect-[4/3] w-full rounded-lg object-cover ring-1 ring-slate-200" />
              ) : null}
              <PhotoInput
                name="beforeImage"
                multiple={false}
                max={1}
                accept="image/jpeg,image/png,image/webp"
                label={item?.beforeImageUrl ? 'Replace before photo' : 'Choose before photo'}
              />
              <p className="mt-1 text-xs text-slate-500">Adds a before/after slider on the website.</p>
              {item?.beforeImageUrl ? (
                <div className="mt-2">
                  <Checkbox name="removeBefore" label="Remove before photo" />
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-6">
            <Checkbox name="featured" defaultChecked={item?.featured ?? false} label="Featured on home page" />
            <Checkbox name="published" defaultChecked={item?.published ?? true} label="Published" />
            <Field label="Sort order" htmlFor="sort" hint="Lower numbers show first.">
              <Input id="sort" name="sort" type="number" defaultValue={item?.sort ?? 0} className="w-24" />
            </Field>
          </div>

          <SubmitButton pendingText="Uploading…">{item ? 'Save changes' : 'Add photo'}</SubmitButton>
        </ActionForm>
      </Card>
    </>
  )
}
