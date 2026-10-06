import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  date,
  doublePrecision,
  jsonb,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core'

// ---------- Enums ----------

export const roleEnum = pgEnum('role', ['owner', 'manager', 'employee'])
export const leadStatusEnum = pgEnum('lead_status', ['new', 'contacted', 'estimate_sent', 'won', 'lost'])
export const estimateStatusEnum = pgEnum('estimate_status', ['draft', 'sent', 'accepted', 'declined'])
export const projectStatusEnum = pgEnum('project_status', [
  'pending',
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
])
export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'sent', 'partial', 'paid', 'void'])
export const invoiceKindEnum = pgEnum('invoice_kind', ['standard', 'deposit', 'progress', 'final'])
export const paymentMethodEnum = pgEnum('payment_method', ['stripe', 'cash', 'check', 'zelle', 'venmo', 'other'])
export const expenseCategoryEnum = pgEnum('expense_category', [
  'drywall_sheets',
  'joint_compound',
  'tape_bead',
  'fasteners',
  'texture_paint',
  'tools',
  'equipment_rental',
  'fuel_mileage',
  'dump_disposal',
  'subcontractor',
  'permits',
  'marketing',
  'insurance',
  'other',
])
export const photoKindEnum = pgEnum('photo_kind', ['before', 'progress', 'after'])
export const blockKindEnum = pgEnum('block_kind', ['time_off', 'blackout', 'holiday'])

// ---------- People ----------

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  passwordHash: text('password_hash'),
  role: roleEnum('role').notNull().default('employee'),
  payRateCents: integer('pay_rate_cents').notNull().default(0), // hourly
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const invites = pgTable('invites', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  role: roleEnum('role').notNull(),
  payRateCents: integer('pay_rate_cents').notNull().default(0),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  acceptedAt: timestamp('accepted_at'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// Single-row business settings (id = 1). Everything brand-related lives here.
export const settings = pgTable('settings', {
  id: integer('id').primaryKey().default(1),
  businessName: text('business_name').notNull().default("Willy's Drywall"),
  tagline: text('tagline').notNull().default('Smooth walls. Straight lines. Done right.'),
  ownerName: text('owner_name').notNull().default('Willy'),
  phone: text('phone').notNull().default('(555) 555-0123'),
  email: text('email').notNull().default('hello@example.com'),
  address: text('address').notNull().default(''),
  city: text('city').notNull().default('Your City'),
  state: text('state').notNull().default('ST'),
  licenseNumber: text('license_number').notNull().default(''),
  insured: boolean('insured').notNull().default(true),
  yearsInBusiness: integer('years_in_business').notNull().default(10),
  accentColor: text('accent_color').notNull().default('#ea580c'),
  logoUrl: text('logo_url'),
  heroHeadline: text('hero_headline').notNull().default('Flawless drywall, finished on schedule.'),
  heroSubhead: text('hero_subhead')
    .notNull()
    .default('Hanging, taping, finishing, texture and repairs for homeowners, builders and businesses.'),
  aboutText: text('about_text').notNull().default(''),
  taxRateBps: integer('tax_rate_bps').notNull().default(0), // 825 = 8.25%
  paymentTermsDays: integer('payment_terms_days').notNull().default(14),
  invoiceFooter: text('invoice_footer').notNull().default('Thank you for your business!'),
  googleReviewUrl: text('google_review_url').notNull().default(''),
  facebookUrl: text('facebook_url').notNull().default(''),
  instagramUrl: text('instagram_url').notNull().default(''),
  notifyEmail: text('notify_email').notNull().default(''),
  notifyPhone: text('notify_phone').notNull().default(''),
  reviewRequestsEnabled: boolean('review_requests_enabled').notNull().default(true),
  reviewDelayDays: integer('review_delay_days').notNull().default(1),
  overdueRemindersEnabled: boolean('overdue_reminders_enabled').notNull().default(true),
  dailyCapacity: integer('daily_capacity').notNull().default(1), // jobs per day the company can run
  workDays: text('work_days').notNull().default('1,2,3,4,5'), // 0 = Sunday
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  address: text('address'),
  city: text('city'),
  state: text('state'),
  zip: text('zip'),
  company: text('company'),
  source: text('source'),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ---------- Sales ----------

export const leads = pgTable(
  'leads',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email'),
    phone: text('phone').notNull(),
    address: text('address'),
    city: text('city'),
    jobType: text('job_type').notNull(),
    description: text('description').notNull().default(''),
    timeframe: text('timeframe'),
    source: text('source'),
    referredBy: text('referred_by'),
    photoUrls: jsonb('photo_urls').$type<string[]>().notNull().default([]),
    status: leadStatusEnum('status').notNull().default('new'),
    notes: text('notes'),
    customerId: integer('customer_id').references(() => customers.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('leads_status_idx').on(t.status)],
)

export const priceItems = pgTable('price_items', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  unit: text('unit').notNull().default('each'),
  unitPriceCents: integer('unit_price_cents').notNull(),
  active: boolean('active').notNull().default(true),
})

export const projects = pgTable(
  'projects',
  {
    id: serial('id').primaryKey(),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id),
    title: text('title').notNull(),
    description: text('description'),
    address: text('address'),
    city: text('city'),
    status: projectStatusEnum('status').notNull().default('pending'),
    startDate: date('start_date', { mode: 'string' }),
    endDate: date('end_date', { mode: 'string' }),
    quotedCents: integer('quoted_cents').notNull().default(0),
    notes: text('notes'),
    completedAt: timestamp('completed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('projects_dates_idx').on(t.startDate, t.endDate)],
)

export const estimates = pgTable('estimates', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id')
    .notNull()
    .references(() => customers.id),
  leadId: integer('lead_id').references(() => leads.id),
  projectId: integer('project_id').references(() => projects.id),
  title: text('title').notNull(),
  status: estimateStatusEnum('status').notNull().default('draft'),
  token: text('token').notNull().unique(),
  notes: text('notes'),
  taxRateBps: integer('tax_rate_bps').notNull().default(0),
  subtotalCents: integer('subtotal_cents').notNull().default(0),
  taxCents: integer('tax_cents').notNull().default(0),
  totalCents: integer('total_cents').notNull().default(0),
  validUntil: date('valid_until', { mode: 'string' }),
  sentAt: timestamp('sent_at'),
  acceptedAt: timestamp('accepted_at'),
  acceptedName: text('accepted_name'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const estimateItems = pgTable('estimate_items', {
  id: serial('id').primaryKey(),
  estimateId: integer('estimate_id')
    .notNull()
    .references(() => estimates.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: doublePrecision('quantity').notNull().default(1),
  unitPriceCents: integer('unit_price_cents').notNull(),
  sort: integer('sort').notNull().default(0),
})

// ---------- Jobs ----------

export const projectAssignments = pgTable(
  'project_assignments',
  {
    projectId: integer('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] })],
)

export const projectPhotos = pgTable('project_photos', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  caption: text('caption'),
  kind: photoKindEnum('kind').notNull().default('progress'),
  uploadedBy: integer('uploaded_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const scheduleBlocks = pgTable('schedule_blocks', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  kind: blockKindEnum('kind').notNull().default('blackout'),
  startDate: date('start_date', { mode: 'string' }).notNull(),
  endDate: date('end_date', { mode: 'string' }).notNull(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }), // null = whole company
  note: text('note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ---------- Billing ----------

export const invoices = pgTable(
  'invoices',
  {
    id: serial('id').primaryKey(),
    number: integer('number').notNull().unique(),
    customerId: integer('customer_id')
      .notNull()
      .references(() => customers.id),
    projectId: integer('project_id').references(() => projects.id),
    estimateId: integer('estimate_id').references(() => estimates.id),
    kind: invoiceKindEnum('kind').notNull().default('standard'),
    status: invoiceStatusEnum('status').notNull().default('draft'),
    token: text('token').notNull().unique(),
    issueDate: date('issue_date', { mode: 'string' }).notNull(),
    dueDate: date('due_date', { mode: 'string' }).notNull(),
    taxRateBps: integer('tax_rate_bps').notNull().default(0),
    subtotalCents: integer('subtotal_cents').notNull().default(0),
    taxCents: integer('tax_cents').notNull().default(0),
    totalCents: integer('total_cents').notNull().default(0),
    paidCents: integer('paid_cents').notNull().default(0),
    notes: text('notes'),
    sentAt: timestamp('sent_at'),
    paidAt: timestamp('paid_at'),
    lastReminderAt: timestamp('last_reminder_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('invoices_status_idx').on(t.status)],
)

export const invoiceItems = pgTable('invoice_items', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: doublePrecision('quantity').notNull().default(1),
  unitPriceCents: integer('unit_price_cents').notNull(),
  sort: integer('sort').notNull().default(0),
})

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  amountCents: integer('amount_cents').notNull(),
  method: paymentMethodEnum('method').notNull(),
  reference: text('reference'),
  stripeRef: text('stripe_ref').unique(), // checkout session id — makes the webhook idempotent
  receivedAt: timestamp('received_at').notNull().defaultNow(),
  recordedBy: integer('recorded_by').references(() => users.id),
})

// ---------- Costs ----------

export const expenses = pgTable(
  'expenses',
  {
    id: serial('id').primaryKey(),
    projectId: integer('project_id').references(() => projects.id, { onDelete: 'set null' }), // null = overhead
    date: date('date', { mode: 'string' }).notNull(),
    category: expenseCategoryEnum('category').notNull(),
    vendor: text('vendor'),
    description: text('description'),
    amountCents: integer('amount_cents').notNull(),
    receiptUrl: text('receipt_url'),
    createdBy: integer('created_by').references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('expenses_project_idx').on(t.projectId), index('expenses_date_idx').on(t.date)],
)

export const laborEntries = pgTable('labor_entries', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id),
  workerName: text('worker_name').notNull(),
  date: date('date', { mode: 'string' }).notNull(),
  hours: doublePrecision('hours').notNull(),
  rateCents: integer('rate_cents').notNull(),
  note: text('note'),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ---------- Website content ----------

export const testimonials = pgTable('testimonials', {
  id: serial('id').primaryKey(),
  customerName: text('customer_name').notNull(),
  location: text('location'),
  rating: integer('rating').notNull().default(5),
  quote: text('quote').notNull(),
  projectType: text('project_type'),
  featured: boolean('featured').notNull().default(false),
  published: boolean('published').notNull().default(true),
  sort: integer('sort').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const galleryItems = pgTable('gallery_items', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  description: text('description'),
  imageUrl: text('image_url').notNull(),
  beforeImageUrl: text('before_image_url'),
  featured: boolean('featured').notNull().default(false),
  published: boolean('published').notNull().default(true),
  sort: integer('sort').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const services = pgTable('services', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  summary: text('summary').notNull(),
  body: text('body').notNull().default(''),
  icon: text('icon').notNull().default('hammer'),
  sort: integer('sort').notNull().default(0),
  published: boolean('published').notNull().default(true),
})

export const faqs = pgTable('faqs', {
  id: serial('id').primaryKey(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  sort: integer('sort').notNull().default(0),
})

export const serviceAreas = pgTable('service_areas', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  blurb: text('blurb'),
  published: boolean('published').notNull().default(true),
})

// ---------- Automation ----------

export const reviewRequests = pgTable('review_requests', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id')
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: 'cascade' }),
  customerId: integer('customer_id')
    .notNull()
    .references(() => customers.id),
  dueAt: timestamp('due_at').notNull(),
  sentAt: timestamp('sent_at'),
  status: text('status').$type<'pending' | 'sent' | 'skipped'>().notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const notificationLog = pgTable('notification_log', {
  id: serial('id').primaryKey(),
  channel: text('channel').$type<'email' | 'sms'>().notNull(),
  to: text('to').notNull(),
  subject: text('subject'),
  body: text('body').notNull(),
  status: text('status').$type<'sent' | 'logged' | 'failed'>().notNull(),
  error: text('error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type User = typeof users.$inferSelect
export type Role = (typeof roleEnum.enumValues)[number]
export type Settings = typeof settings.$inferSelect
export type Customer = typeof customers.$inferSelect
export type Lead = typeof leads.$inferSelect
export type Project = typeof projects.$inferSelect
export type Estimate = typeof estimates.$inferSelect
export type Invoice = typeof invoices.$inferSelect
export type Expense = typeof expenses.$inferSelect
export type ExpenseCategory = (typeof expenseCategoryEnum.enumValues)[number]
export type ScheduleBlock = typeof scheduleBlocks.$inferSelect
