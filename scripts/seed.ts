/**
 * Demo data so the site and dashboard look alive on first run.
 * Everything here is SAMPLE content — Willie should replace testimonials,
 * gallery photos and service areas with real ones before launch.
 *
 * Demo logins (local development only):
 *   owner    willie@example.com   / drywall-demo-1
 *   manager  maria@example.com    / drywall-demo-1
 *   crew     tyler@example.com    / drywall-demo-1
 */
import { loadEnv } from './env'
loadEnv()

import bcrypt from 'bcryptjs'
import { writePlaceholders } from './placeholders'
import { FAQS, PRICE_ITEMS, SERVICES } from './content'

const { db } = await import('../src/db')
const s = await import('../src/db/schema')
const { computeTotals } = await import('../src/lib/money')
const { addDays, todayISO } = await import('../src/lib/dates')
const { newToken } = await import('../src/lib/utils')

const existing = await db.select({ id: s.users.id }).from(s.users).limit(1)
if (existing.length) {
  console.log('Database already has data — skipping seed. (Run `npm run db:reset` then `npm run setup` to start fresh.)')
  process.exit(0)
}

writePlaceholders()
const today = todayISO()
const password = process.env.SEED_PASSWORD || 'drywall-demo-1'
const hash = await bcrypt.hash(password, 11)

await db.insert(s.settings).values({
  id: 1,
  businessName: "Willie's Drywall",
  ownerName: 'Willie',
  phone: '(555) 555-0123',
  email: 'hello@example.com',
  city: 'Springfield',
  state: 'IL',
  licenseNumber: 'DW-000000',
  yearsInBusiness: 12,
  taxRateBps: 0,
  aboutText:
    "I've been hanging and finishing drywall for over a decade. I started out on commercial crews, learned the trade from old-school finishers, and opened my own company so I could give homeowners the same level of craftsmanship with honest pricing and clear communication. I show up when I say I will, protect your home like it's mine, and don't leave until the walls are perfect.",
  notifyEmail: 'willie@example.com',
  notifyPhone: '(555) 555-0123',
}).onConflictDoNothing()

const [willie, maria, tyler] = await db
  .insert(s.users)
  .values([
    { name: 'Willie', email: 'willie@example.com', passwordHash: hash, role: 'owner', phone: '(555) 555-0123', payRateCents: 0 },
    { name: 'Maria Lopez', email: 'maria@example.com', passwordHash: hash, role: 'manager', phone: '(555) 555-0144', payRateCents: 3200 },
    { name: 'Tyler Brooks', email: 'tyler@example.com', passwordHash: hash, role: 'employee', phone: '(555) 555-0177', payRateCents: 2400 },
  ])
  .returning()

// ---- Website content ----
await db.insert(s.services).values(SERVICES)

await db.insert(s.galleryItems).values([
  { title: 'Open-concept living room', category: 'Hang & Finish', imageUrl: '/placeholder/living-room.svg', featured: true, sort: 1 },
  { title: 'Smooth Level 5 kitchen ceiling', category: 'Ceilings', imageUrl: '/placeholder/kitchen-ceiling.svg', featured: true, sort: 2 },
  { title: 'Ceiling leak repair', category: 'Water Damage', imageUrl: '/placeholder/water-damage-after.svg', beforeImageUrl: '/placeholder/water-damage-before.svg', featured: true, sort: 3 },
  { title: 'Finished basement', category: 'Hang & Finish', imageUrl: '/placeholder/basement.svg', sort: 4 },
  { title: 'Knockdown texture', category: 'Textures', imageUrl: '/placeholder/knockdown.svg', sort: 5 },
  { title: 'Doorknob hole patch', category: 'Repairs', imageUrl: '/placeholder/patch-after.svg', beforeImageUrl: '/placeholder/patch-before.svg', featured: true, sort: 6 },
  { title: 'Office build-out', category: 'Commercial', imageUrl: '/placeholder/commercial.svg', sort: 7 },
])

await db.insert(s.testimonials).values([
  { customerName: 'Sample — Jennifer R.', location: 'Springfield', rating: 5, projectType: 'Basement finish', featured: true, sort: 1, quote: '(Sample review) Willie finished our basement and the walls are flawless. He showed up every day on time and cleaned up after himself.' },
  { customerName: 'Sample — Mark T.', location: 'Chatham', rating: 5, projectType: 'Water damage repair', featured: true, sort: 2, quote: '(Sample review) After our upstairs bathroom leaked, he had the ceiling cut out, replaced and textured in two days. You can’t even tell.' },
  { customerName: 'Sample — Danielle K.', location: 'Rochester', rating: 5, projectType: 'Popcorn removal', featured: true, sort: 3, quote: '(Sample review) Popcorn ceilings gone in the whole house. Fair price, zero mess, and the smooth finish looks amazing.' },
  { customerName: 'Sample — Hartman Builders', location: 'Springfield', rating: 5, projectType: 'New construction', sort: 4, quote: '(Sample review) Our go-to drywall sub. Reliable schedule, clean lines, and no punch-list surprises.' },
])

await db.insert(s.faqs).values(FAQS)

await db.insert(s.serviceAreas).values(
  [
    ['Springfield', 'IL'],
    ['Chatham', 'IL'],
    ['Rochester', 'IL'],
    ['Sherman', 'IL'],
    ['Riverton', 'IL'],
  ].map(([city, state]) => ({ city, state, slug: `${city.toLowerCase()}-${state.toLowerCase()}` })),
)

await db.insert(s.priceItems).values(PRICE_ITEMS)

// ---- Customers, leads, jobs ----
const cust = await db
  .insert(s.customers)
  .values([
    { name: 'Jennifer Rhodes', email: 'jennifer@example.com', phone: '(555) 555-0101', address: '412 Oak St', city: 'Springfield', state: 'IL', source: 'Google' },
    { name: 'Mark Thompson', email: 'mark@example.com', phone: '(555) 555-0102', address: '88 Lakeview Dr', city: 'Chatham', state: 'IL', source: 'Referral' },
    { name: 'Danielle King', email: 'danielle@example.com', phone: '(555) 555-0103', address: '19 Maple Ct', city: 'Rochester', state: 'IL', source: 'Facebook' },
    { name: 'Hartman Builders', company: 'Hartman Builders LLC', email: 'office@example.com', phone: '(555) 555-0104', address: '1200 Commerce Pkwy', city: 'Springfield', state: 'IL', source: 'Repeat customer' },
  ])
  .returning()

await db.insert(s.leads).values([
  { name: 'Chris Patel', phone: '(555) 555-0111', email: 'chris@example.com', city: 'Sherman', jobType: 'Drywall repair', description: 'Two holes in hallway from door handles, plus a crack above the bedroom door.', timeframe: 'Within 2 weeks', source: 'Google', status: 'new' },
  { name: 'Amy Nguyen', phone: '(555) 555-0112', email: 'amy@example.com', city: 'Springfield', jobType: 'Popcorn ceiling removal', description: 'Living room + 3 bedrooms, about 900 sq ft total.', timeframe: 'Flexible', source: 'Nextdoor', status: 'contacted' },
])

const projectRows = await db
  .insert(s.projects)
  .values([
    { customerId: cust[0].id, title: 'Basement finish', address: '412 Oak St', city: 'Springfield', status: 'completed', startDate: addDays(today, -40), endDate: addDays(today, -30), quotedCents: 840000, completedAt: new Date(Date.now() - 30 * 864e5) },
    { customerId: cust[1].id, title: 'Bathroom ceiling water damage', address: '88 Lakeview Dr', city: 'Chatham', status: 'in_progress', startDate: addDays(today, -1), endDate: addDays(today, 1), quotedCents: 165000 },
    { customerId: cust[2].id, title: 'Whole-house popcorn removal', address: '19 Maple Ct', city: 'Rochester', status: 'scheduled', startDate: addDays(today, 6), endDate: addDays(today, 10), quotedCents: 425000 },
    { customerId: cust[3].id, title: 'Lot 14 new construction — hang & finish', address: 'Lot 14, Prairie Meadows', city: 'Springfield', status: 'scheduled', startDate: addDays(today, 14), endDate: addDays(today, 24), quotedCents: 1280000 },
  ])
  .returning()
const [pDone, pActive, pPopcorn, pBuilder] = projectRows

await db.insert(s.projectAssignments).values([
  { projectId: pActive.id, userId: tyler.id },
  { projectId: pPopcorn.id, userId: tyler.id },
  { projectId: pBuilder.id, userId: maria.id },
  { projectId: pBuilder.id, userId: tyler.id },
])

await db.insert(s.scheduleBlocks).values([
  { title: 'Family vacation', kind: 'time_off', startDate: addDays(today, 30), endDate: addDays(today, 34) },
])

// ---- Money ----
async function invoice(opts: {
  customerId: number
  projectId: number
  number: number
  kind: 'standard' | 'deposit' | 'final'
  issueDaysAgo: number
  items: { description: string; quantity: number; unitPriceCents: number }[]
  paid?: 'full' | 'none'
  status: 'draft' | 'sent' | 'paid'
}) {
  const totals = computeTotals(opts.items, 0)
  const issueDate = addDays(today, -opts.issueDaysAgo)
  const [inv] = await db
    .insert(s.invoices)
    .values({
      number: opts.number,
      customerId: opts.customerId,
      projectId: opts.projectId,
      kind: opts.kind,
      status: opts.status,
      token: newToken(),
      issueDate,
      dueDate: addDays(issueDate, 14),
      ...totals,
      paidCents: opts.paid === 'full' ? totals.totalCents : 0,
      sentAt: opts.status === 'draft' ? null : new Date(),
      paidAt: opts.paid === 'full' ? new Date() : null,
    })
    .returning()
  await db.insert(s.invoiceItems).values(opts.items.map((it, i) => ({ ...it, invoiceId: inv.id, sort: i })))
  if (opts.paid === 'full') {
    await db.insert(s.payments).values({ invoiceId: inv.id, amountCents: totals.totalCents, method: 'check', reference: 'Check #1042', recordedBy: willie.id })
  }
}

await invoice({ customerId: cust[0].id, projectId: pDone.id, number: 1001, kind: 'deposit', issueDaysAgo: 45, status: 'paid', paid: 'full', items: [{ description: 'Deposit — basement finish (50%)', quantity: 1, unitPriceCents: 420000 }] })
await invoice({ customerId: cust[0].id, projectId: pDone.id, number: 1002, kind: 'final', issueDaysAgo: 29, status: 'paid', paid: 'full', items: [{ description: 'Balance — basement finish', quantity: 1, unitPriceCents: 420000 }] })
await invoice({ customerId: cust[1].id, projectId: pActive.id, number: 1003, kind: 'deposit', issueDaysAgo: 20, status: 'sent', items: [{ description: 'Deposit — bathroom ceiling repair', quantity: 1, unitPriceCents: 82500 }] })
await invoice({ customerId: cust[3].id, projectId: pBuilder.id, number: 1004, kind: 'standard', issueDaysAgo: 1, status: 'draft', items: [{ description: 'Hang & finish 1/2" drywall', quantity: 180, unitPriceCents: 6500 }, { description: 'Hang & finish 5/8" fire-rated (garage)', quantity: 24, unitPriceCents: 7500 }] })

const estTotals = computeTotals([{ quantity: 900, unitPriceCents: 250 }], 0)
await db.insert(s.estimates).values({
  customerId: cust[2].id,
  projectId: pPopcorn.id,
  title: 'Whole-house popcorn removal',
  status: 'accepted',
  token: newToken(),
  ...estTotals,
  acceptedAt: new Date(Date.now() - 7 * 864e5),
  acceptedName: 'Danielle King',
  sentAt: new Date(Date.now() - 9 * 864e5),
})

await db.insert(s.expenses).values([
  { projectId: pDone.id, date: addDays(today, -41), category: 'drywall_sheets', vendor: 'Menards', description: '96 sheets 1/2" 4x8', amountCents: 158400, createdBy: willie.id },
  { projectId: pDone.id, date: addDays(today, -41), category: 'joint_compound', vendor: 'Menards', description: '12 boxes all-purpose, 6 bags Easy Sand 45', amountCents: 31200, createdBy: willie.id },
  { projectId: pDone.id, date: addDays(today, -40), category: 'tape_bead', vendor: 'Menards', description: 'Paper tape, corner bead, screws', amountCents: 14800, createdBy: willie.id },
  { projectId: pDone.id, date: addDays(today, -31), category: 'dump_disposal', vendor: 'City transfer station', description: 'Scrap disposal', amountCents: 6500, createdBy: willie.id },
  { projectId: pActive.id, date: addDays(today, -1), category: 'drywall_sheets', vendor: 'Home Depot', description: '6 sheets 1/2" moisture-resistant', amountCents: 11400, createdBy: tyler.id },
  { projectId: null, date: addDays(today, -15), category: 'tools', vendor: 'Amazon', description: 'New 12" mud pan & knives', amountCents: 8900, createdBy: willie.id },
  { projectId: null, date: addDays(today, -10), category: 'fuel_mileage', vendor: 'Shell', description: 'Truck fuel', amountCents: 7200, createdBy: willie.id },
])

await db.insert(s.laborEntries).values([
  { projectId: pDone.id, userId: tyler.id, workerName: 'Tyler Brooks', date: addDays(today, -38), hours: 32, rateCents: 2400, createdBy: willie.id },
  { projectId: pDone.id, userId: maria.id, workerName: 'Maria Lopez', date: addDays(today, -35), hours: 12, rateCents: 3200, createdBy: willie.id },
])

await db.insert(s.reviewRequests).values({ projectId: pDone.id, customerId: cust[0].id, dueAt: new Date(Date.now() - 29 * 864e5), sentAt: new Date(Date.now() - 29 * 864e5), status: 'sent' })

console.log(`✔ Seeded demo data. Sign in at /login with willie@example.com / ${password}`)
process.exit(0)
