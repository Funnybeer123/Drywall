import type { Metadata } from 'next'
import { Award, Clock, HandHeart, ShieldCheck, Sparkles, Star } from 'lucide-react'
import { getSettings } from '@/lib/settings'
import { getGallery, getRating } from '../_lib/data'
import { paragraphs } from '../_lib/format'
import { ContactButtons, CtaBand, SectionHeading } from '../_components/sections'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings()
  return {
    title: `About Us — ${s.city}, ${s.state} Drywall Contractor`,
    description: `Meet ${s.ownerName}, owner of ${s.businessName}. ${s.yearsInBusiness}+ years hanging and finishing drywall in ${s.city}, ${s.state}. Licensed & insured.`,
    alternates: { canonical: '/about' },
  }
}

const VALUES = [
  { Icon: Clock, title: 'Show up when we say', body: 'You get a real start date and a crew that arrives on time, every day of the job.' },
  { Icon: HandHeart, title: 'Treat your home like ours', body: 'Floors covered, furniture protected, and the space left broom-clean each evening.' },
  { Icon: Sparkles, title: 'Sweat the finish', body: 'Tight seams, crisp corners and texture that matches. We don’t leave until it’s right.' },
  { Icon: ShieldCheck, title: 'Honest, upfront pricing', body: 'Clear, itemized estimates — no surprise add-ons once the work starts.' },
]

export default async function AboutPage() {
  const [s, rating, gallery] = await Promise.all([getSettings(), getRating(), getGallery()])
  const story = paragraphs(s.aboutText)
  const photo = gallery.find((g) => g.featured && !g.beforeImageUrl) ?? gallery[0]

  const stats = [
    { value: `${s.yearsInBusiness}+`, label: 'Years in business' },
    rating.count > 0 ? { value: rating.average.toFixed(1), label: `Average rating (${rating.count} reviews)` } : null,
  ].filter(Boolean) as { value: string; label: string }[]

  return (
    <>
      <section className="bg-drywall border-b border-slate-200">
        <div className="container-x grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-2">
          <div>
            <p className="eyebrow">About us</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-balance text-slate-900 sm:text-5xl">
              Craftsmanship you can see. A contractor you can trust.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600">
              {s.businessName} is a {s.city}-based drywall company led by {s.ownerName}. {s.tagline}
            </p>
            <ContactButtons s={s} className="mt-8" />
          </div>
          {photo ? (
            <div className="overflow-hidden rounded-3xl bg-slate-200 shadow-xl ring-1 ring-slate-900/5">
              <img src={photo.imageUrl} alt={photo.title} className="aspect-[4/3] w-full object-cover" />
            </div>
          ) : null}
        </div>
      </section>

      <section className="container-x py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <p className="eyebrow">Our story</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">A note from {s.ownerName}</h2>
            <div className="mt-6 space-y-5 text-lg leading-relaxed text-slate-700">
              {story.length > 0 ? (
                story.map((p, i) => <p key={i}>{p}</p>)
              ) : (
                <p>
                  We’re a local, owner-led drywall company serving {s.city} and the surrounding area. We started this business to give
                  homeowners and builders the kind of careful, communicative service we’d want in our own homes.
                </p>
              )}
            </div>
            <p className="mt-6 font-semibold text-slate-900">— {s.ownerName}, owner</p>
          </div>

          <div className="space-y-4">
            {stats.map((st) => (
              <div key={st.label} className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
                <p className="text-4xl font-bold tracking-tight text-slate-900">{st.value}</p>
                <p className="mt-1 text-sm text-slate-500">{st.label}</p>
              </div>
            ))}
            <div className="rounded-2xl bg-slate-900 p-6 text-white">
              <p className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="size-5 text-emerald-400" aria-hidden="true" />
                {s.insured ? 'Licensed & insured' : 'Licensed contractor'}
              </p>
              {s.licenseNumber ? <p className="mt-1 text-sm text-slate-400">License #{s.licenseNumber}</p> : null}
              <p className="mt-4 flex items-center gap-2 text-sm text-slate-300">
                <Award className="size-4 text-brand" aria-hidden="true" /> {s.yearsInBusiness}+ years in the trade
              </p>
              {rating.count > 0 ? (
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                  <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" /> {rating.average.toFixed(1)}-star average rating
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-16 sm:py-20">
        <div className="container-x">
          <SectionHeading eyebrow="What we stand for" title="The way we work" align="center" />
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(({ Icon, title, body }) => (
              <li key={title} className="rounded-2xl bg-white p-6 ring-1 ring-slate-200">
                <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBand s={s} title={`Let’s talk about your project`} />
    </>
  )
}
