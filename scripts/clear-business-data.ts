/**
 * Wipes all business records (leads, customers, estimates, jobs, invoices, payments,
 * expenses, labor, photos, schedule blocks, logs) and their uploaded files, so the site
 * starts fresh. Keeps logins, API keys, business settings and website content
 * (services, FAQ, price list, reviews, gallery, service areas).
 *
 *   CLEAR_BUSINESS_DATA=yes-delete-everything npm run clear-business-data
 *
 * Azure: set the CLEAR_BUSINESS_DATA app setting, let the app restart, then delete the setting.
 */
import { rmSync } from 'node:fs'
import path from 'node:path'
import { loadEnv } from './env'
loadEnv()

if (process.env.CLEAR_BUSINESS_DATA !== 'yes-delete-everything') {
  console.error('Refusing: set CLEAR_BUSINESS_DATA=yes-delete-everything to confirm.')
  process.exit(1)
}

const { db } = await import('../src/db')
const s = await import('../src/db/schema')
const { getTableName, sql } = await import('drizzle-orm')

// None of the kept tables reference these, so CASCADE stays within this list.
const tables = [
  s.payments, s.invoiceItems, s.invoices, s.laborEntries, s.projectPhotos, s.projectAssignments,
  s.expenses, s.estimateItems, s.estimates, s.reviewRequests, s.projects, s.leads, s.customers,
  s.scheduleBlocks, s.notificationLog, s.apiAuditLog,
]
const names = tables.map((t) => `"${getTableName(t)}"`).join(', ')
await db.execute(sql.raw(`TRUNCATE ${names} RESTART IDENTITY CASCADE`))
console.log(`✔ Cleared ${tables.length} tables`)

// Uploaded job photos, receipts and quote-form photos (gallery and branding images are kept).
const uploads = process.env.DATA_DIR ? path.join(process.env.DATA_DIR, 'uploads') : path.join('public', 'uploads')
for (const folder of ['projects', 'receipts', 'leads']) {
  rmSync(path.join(uploads, folder), { recursive: true, force: true })
}
console.log('✔ Deleted uploaded job photos, receipts and lead photos')
process.exit(0)
