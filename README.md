# Willy's Drywall — Website & Business Dashboard

One app with two halves:

- **Public website.** Services, a portfolio with before/after photos, customer reviews, a live availability calendar, a request-a-quote form that emails and texts Willy, and local SEO pages for each town he serves.
- **Team dashboard** (`/admin`). Leads, estimates customers accept online, jobs, schedule, invoices customers pay online, expenses with receipt photos, profit per job, reports, team accounts (owner / manager / crew), and website content editing.

The business name, colors, phone number and everything else are set in **Admin → Settings**. Nothing is hard-coded, so renaming the business later is one change.

---

## 1. Run it on your computer

Requirements: [Node.js 20+](https://nodejs.org).

```bash
npm install
npm run setup      # creates the local database and fills it with demo data
npm run dev        # http://localhost:3000
```

Sign in at <http://localhost:3000/login>:

| Role | Email | Password |
|---|---|---|
| Owner | willy@example.com | drywall-demo-1 |
| Manager | maria@example.com | drywall-demo-1 |
| Crew member | tyler@example.com | drywall-demo-1 |

No accounts or API keys are needed locally. Emails and text messages are **printed in the terminal** instead of being sent, and uploaded photos are saved to `public/uploads/`. The local database lives in `.data/`.

Useful commands:

```bash
npm run db:reset   # wipe the local database (stop `npm run dev` first)
npm test           # unit tests (money math, permissions, availability)
npm run typecheck
npm run lint
```

> The local database can only be opened by one program at a time. Stop `npm run dev` before running `db:` scripts.

---

## 2. Before launch checklist

The dashboard has a **Launch checklist** under **Admin → Website content**. In short:

1. **Settings.** Set the real business name, phone, email, license #, city, logo and accent color, and where quote alerts go.
2. **Delete the sample reviews.** Only publish real reviews from real customers.
3. **Replace the sample gallery photos** with real before/after job photos.
4. **Service areas.** List the real towns Willy serves. Each one becomes its own Google-friendly page.
5. **Price list.** Set real prices so estimates are quick to build.
6. **Google review link.** Paste it in Settings so the automatic review requests point to Google.

---

## 3. Put it on the internet (about an hour, mostly sign-ups)

Every service below has a free tier that's enough to start.

| Service | What it's for | Cost to start |
|---|---|---|
| [GitHub](https://github.com) | Stores the code | Free |
| [Vercel](https://vercel.com) | Hosts the website | Free (Hobby); Pro $20/mo once it's a business-critical site |
| [Neon](https://neon.tech) | Database | Free tier |
| [Resend](https://resend.com) | Sends email | Free up to 3,000/mo |
| [Twilio](https://twilio.com) | Sends texts | About $1.15/mo per number + ~$0.01/text, plus one-time registration fees |
| [Stripe](https://stripe.com) | Online invoice payments | 2.9% + 30¢ per card payment; 0.8% for bank (ACH), capped at $5 |
| A domain (e.g. Cloudflare, Namecheap) | `willysdrywall.com` | ~$10–15/yr |

### Steps

1. **Push the code to GitHub** (a private repo is fine).
2. **Neon.** Create a project and copy the connection string (`postgres://...`).
3. **Vercel → Add New Project →** import the repo. Under **Environment Variables**, add everything from `.env.example`:
   - `DATABASE_URL`: the Neon string
   - `AUTH_SECRET`: a long random string. Generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - `APP_URL`: `https://yourdomain.com`
   - `CRON_SECRET`: another random string
   - `BUSINESS_TIMEZONE`: e.g. `America/Chicago`

   Deploy. Database tables are created automatically on each deploy.
4. **Storage.** In Vercel → Storage, create a **Blob** store and connect it to the project. This adds `BLOB_READ_WRITE_TOKEN` for photo uploads.
5. **Create Willy's login.** On your computer, put the Neon `DATABASE_URL` in a `.env.local` file, then run:
   ```bash
   npm run create-owner
   ```
   This creates his owner account plus the starter services, FAQ and price list, with no demo data. Then remove `DATABASE_URL` from `.env.local` again so local development keeps using the local database.
6. **Email (Resend).** Add and verify the domain, then set `RESEND_API_KEY` and `EMAIL_FROM` (e.g. `Willy's Drywall <hello@willysdrywall.com>`).
7. **Texts (Twilio).** Buy a local number. Then set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_FROM_NUMBER`.
   > ⚠️ **Start this early.** US carriers require **A2P 10DLC registration** (brand + campaign) before business texts are delivered. Approval can take from a few days to a few weeks. Until then, quote alerts still arrive by email.
8. **Payments (Stripe).**
   1. Set `STRIPE_SECRET_KEY`.
   2. In Stripe → Developers → Webhooks, add the endpoint `https://yourdomain.com/api/stripe/webhook`.
   3. Select the events `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
   4. Copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
   5. In Stripe → Settings → Payment methods, turn on **ACH Direct Debit** so customers can pay large invoices by bank transfer for a much lower fee.
9. **Spam protection (optional).** Create a free Cloudflare Turnstile widget and set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.
10. **Domain.** In Vercel → Settings → Domains, add the domain and follow the DNS instructions.
11. **Redeploy** so the new variables take effect. Then check **Admin → Settings → Integrations**, which shows a ✓ for each service that's connected, and use the "send test email/text" buttons.

The daily automation (review requests, overdue-invoice reminders, "tomorrow's jobs" texts) runs from `vercel.json` every morning.

### Azure demo (temporary)

A demo copy runs on a free Azure App Service (`willys-drywall-demo-zgwef` in resource group `willys-drywall-demo`). It uses the built-in database stored in `DATA_DIR=/home/data` on the app's persistent disk, so there's no database server to pay for. To push code changes to it:

```bash
az login
npm run deploy:azure
```

Redeploying keeps the existing data, and new migrations run on startup. The first boot creates the owner from the `OWNER_NAME` / `OWNER_EMAIL` / `OWNER_PASSWORD` app settings. To add another owner login, set `EXTRA_OWNER_NAME` / `EXTRA_OWNER_EMAIL` / `EXTRA_OWNER_PASSWORD`, wait for the restart, then delete those settings. The daily automation doesn't run on a schedule there. Delete the resource group when the demo is over.

---

## 4. Growing the business

### Hiring
Use **Admin → Team → Invite**. Each person gets an email link to set their own password.

| | Owner | Manager | Crew member |
|---|---|---|---|
| Leads, estimates, customers, jobs, schedule | ✓ | ✓ | Only their assigned jobs |
| Invoices & payments | ✓ | ✓ | — |
| Expenses | ✓ | ✓ | Add receipts on their own jobs |
| Reports, job profit, pay rates | ✓ | — | — |
| Team & settings | ✓ | — | — |

As crews are added, raise **Settings → Scheduling → jobs at once** so the public calendar shows "Limited" instead of "Booked" when one crew is still free.

### Free marketing that pays off most (do these first)
1. **Google Business Profile.** This is the #1 source of local contractor leads, and it's free. Add photos weekly and answer every review. Paste its review link into Settings.
2. **Ask every happy customer for a review.** The app does this automatically one day after a job is marked Completed.
3. **Nextdoor Business page and a Facebook page.** Post before/after photos from the portfolio.
4. **Truck magnets / yard signs** with a QR code to `/quote`.
5. **Realtors, property managers, painters and general contractors** are steady repeat work. Offer them fast-turnaround repair pricing.

### Ideas for later
- Referral reward (e.g. $50 off or a gift card for each referral that books). The quote form already records "Referred by".
- Customer financing (e.g. Wisetack) for big basement and new-construction jobs.
- Crew time clock with GPS check-in.
- QuickBooks sync (expenses already export to CSV for the bookkeeper).
- Warranty follow-up texts at 6 and 12 months, which bring repeat work and referrals.

---

## AI assistant API (Grok)

An API lets an AI assistant run the business for Willy: log leads and expenses, build estimates and invoices, schedule jobs, record payments, update the website and pull reports.

1. **Create a key.** Go to **Admin → Settings → API & assistant** and choose what the key can do:
   - `read`: look things up.
   - `write`: enter and update records.
   - `content`: edit the website.
   - `send`: email or text customers.
   - `settings`: change business settings.

   Leave `send` and `settings` off unless you really want the bot doing those.
2. **Connect the bot.** Use whichever fits how the bot is built:
   - **Function calling (xAI API):** `GET /api/v1/tools` returns ready-made tool definitions. Pass them to Grok, then send each tool call to `POST /api/v1/tools/call` with `{ "name": "...", "arguments": {...} }`.
   - **OpenAPI:** import `/api/v1/openapi.json`.
   - **Plain REST:** every operation also has its own endpoint (see the spec), using the header `Authorization: Bearer <key>`.
3. **Try it in the terminal.** Set `XAI_API_KEY`, `SITE_API_KEY` and `SITE_URL` in `.env.local`, then run `npm run assistant`.
   - Type `/attach receipt.jpg` to add a photo. Grok reads it (vendor, total) and can log it as an expense with the receipt attached.

**Safety rules built in:**
- The assistant is told to confirm before contacting customers, changing settings, deleting anything or recording payments.
- Every change, and every blocked attempt, is listed under **Assistant activity** on the API page.
- Keys can be revoked instantly, and each key is limited to 120 requests a minute.
- Money is in dollars, and dates are `YYYY-MM-DD`.

To add or change an operation, edit `src/lib/api/ops/*.ts`. The REST endpoints, the OpenAPI spec and the tool list are all generated from those files.

## Home page video

The home page header crossfades between four close-up clips stored in `public/videos/`. Clip order, labels, crop position, speed (`PLAYBACK_RATE`) and how long each clip shows (`SEGMENT_MS`) are set at the top of `src/app/(site)/_components/hero-video.tsx`.

- **Footage:** Tima Miroshnichenko on [Pexels](https://www.pexels.com/@tima-miroshnichenko/). The Pexels license is free for commercial use and doesn't require credit. Once Willy has his own close-ups, drop them in `public/videos/` and update `CLIPS`.
- **Smoothness:**
  - Clips are 25 fps and play at 0.8× speed. Going much slower makes them look choppy.
  - For true slow motion, re-encode with frame interpolation (needs [ffmpeg](https://ffmpeg.org)):
    `ffmpeg -i in.mp4 -an -vf "setpts=2*PTS,minterpolate=fps=50:mi_mode=mci:mc_mode=aobmc:vsbmc=1" -c:v libx264 -crf 22 -preset slow -movflags +faststart out.mp4`
  - Then set `PLAYBACK_RATE` to 1.
- **Page weight:** one full rotation loads about 37 MB. Only the clip on screen (plus the next one) is fetched. Playback pauses when the tab is hidden or the visitor scrolls away. People with "reduce motion" or data-saver turned on get a still frame.

## Tech notes (for whoever maintains this)

- Next.js 16 (App Router), React 19, Tailwind CSS 4, Drizzle ORM. Production uses Postgres (Neon); local development uses embedded PGlite.
- Money is stored in integer cents. Job and invoice dates are `YYYY-MM-DD` strings so they never shift between time zones.
- Permissions are defined in `src/lib/permissions.ts`. Every admin page and server action calls `requireUser(permission)`.
- Integrations (`src/lib/email.ts`, `sms.ts`, `stripe.ts`, `storage.ts`) fall back to safe local behavior when keys are missing. Every email and text is logged in Admin → Settings → Notification log.
- To change the database schema, edit `src/db/schema.ts`, run `npm run db:generate`, then `npm run db:migrate`.
