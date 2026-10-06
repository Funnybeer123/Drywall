import type { Metadata } from 'next'
import { getSettings } from '@/lib/settings'
import { getGallery } from '../_lib/data'
import { BeforeAfter } from '../_components/before-after'
import { Gallery } from '../_components/gallery'
import { CtaBand, PageHero, SectionHeading } from '../_components/sections'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings()
  return {
    title: `Our Work — Drywall Projects in ${s.city}, ${s.state}`,
    description: `Photos of recent drywall installation, repair, texture and ceiling projects by ${s.businessName} in ${s.city}, ${s.state} — including before & after comparisons.`,
    alternates: { canonical: '/work' },
  }
}

export default async function WorkPage() {
  const [s, items] = await Promise.all([getSettings(), getGallery()])
  const pairs = items.filter((i) => i.beforeImageUrl)

  return (
    <>
      <PageHero
        eyebrow="Our work"
        title="Real projects. Flawless finishes."
        description={`A look at recent drywall jobs around ${s.city}. Tap any photo to see it full size.`}
      />

      {pairs.length > 0 ? (
        <section className="container-x pt-16 sm:pt-20">
          <SectionHeading eyebrow="Before & after" title="Drag to compare" description="Slide the handle to see what each space looked like before we got there." />
          <ul className="grid gap-6 md:grid-cols-2">
            {pairs.slice(0, 4).map((item) => (
              <li key={item.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
                <BeforeAfter before={item.beforeImageUrl!} after={item.imageUrl} alt={item.title} />
                <div className="p-5">
                  <p className="text-xs font-semibold tracking-wide text-brand uppercase">{item.category}</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">{item.title}</p>
                  {item.description ? <p className="mt-1 text-sm text-slate-600">{item.description}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="container-x py-16 sm:py-20">
        {pairs.length > 0 ? <SectionHeading eyebrow="Portfolio" title="All projects" /> : null}
        {items.length > 0 ? (
          <Gallery
            items={items.map(({ id, title, category, description, imageUrl, beforeImageUrl }) => ({
              id,
              title,
              category,
              description,
              imageUrl,
              beforeImageUrl,
            }))}
          />
        ) : (
          <p className="text-slate-600">New project photos are on the way. Check back soon!</p>
        )}
      </section>

      <CtaBand s={s} title="Want results like these?" />
    </>
  )
}
