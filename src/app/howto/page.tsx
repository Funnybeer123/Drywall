import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { getSettings, appUrl } from '@/lib/settings'
import { ThemeToggle } from '@/components/theme-toggle'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings()
  return {
    title: 'How-to guide',
    description: `Step-by-step guide to the ${s.businessName} team dashboard, with short videos.`,
    robots: { index: false, follow: false },
  }
}

const SECTIONS = [
  { id: 'welcome', title: 'Welcome' },
  { id: 'sign-in', title: 'Signing in' },
  { id: 'tour', title: 'A tour of the dashboard' },
  { id: 'leads', title: 'Leads' },
  { id: 'customers', title: 'Customers' },
  { id: 'estimates', title: 'Estimates' },
  { id: 'accepted', title: 'When a customer says yes' },
  { id: 'jobs', title: 'Jobs' },
  { id: 'schedule', title: 'Schedule' },
  { id: 'invoices', title: 'Invoices' },
  { id: 'expenses', title: 'Expenses' },
  { id: 'reports', title: 'Reports' },
  { id: 'price-list', title: 'Price list' },
  { id: 'website', title: 'Website content' },
  { id: 'team', title: 'Team' },
  { id: 'settings', title: 'Settings' },
  { id: 'help', title: 'Troubleshooting' },
  { id: 'cheat-sheet', title: 'Cheat sheet' },
]

export default async function HowToPage() {
  const s = await getSettings()
  const site = appUrl().replace(/^https?:\/\//, '')

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="truncate font-semibold text-slate-900">
            {s.businessName}
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle className="inline-flex size-9 text-slate-600 hover:bg-slate-100 hover:text-slate-900" />
            <Link href="/admin" className="shrink-0 rounded-lg bg-brand px-3.5 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
              Open dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:grid lg:grid-cols-[220px_1fr] lg:gap-12 lg:px-8">
        <nav aria-label="Guide sections" className="hidden lg:block">
          <div className="sticky top-20">
            <p className="mb-3 text-xs font-semibold tracking-wide text-slate-500 uppercase">On this page</p>
            <ul className="space-y-1 text-sm">
              {SECTIONS.map((sec) => (
                <li key={sec.id}>
                  <a href={`#${sec.id}`} className="block rounded-md px-2 py-1 text-slate-600 hover:bg-surface hover:text-brand-fg">
                    {sec.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <article className="min-w-0 space-y-14 text-[17px] leading-relaxed text-slate-700">
          <div>
            <p className="text-sm font-semibold tracking-wide text-brand-fg uppercase">How-to guide</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Using the {s.businessName} dashboard</h1>
            <p className="mt-3 text-slate-600">Step-by-step instructions and short videos for every part of the team dashboard.</p>
          </div>

          <Section id="welcome" title="Welcome">
            <p>
              The dashboard is the private back office of your website: it’s where you handle quote requests, send estimates, schedule jobs, bill
              customers and update the public site. You don’t need any computer skills beyond using a web browser. If you can send an email, you can
              run this.
            </p>
            <p>This guide is written for the business owner. Where a manager or crew member sees something different, it says so.</p>
            <SubHead>How to use this guide</SubHead>
            <ul className="list-disc space-y-1 pl-6">
              <li>Each task has numbered steps. Follow them in order, top to bottom.</li>
              <li>Most tasks have a short video above the steps. Press play, watch it once, then follow along on your own screen.</li>
              <li>
                Words in <B>bold</B> are the exact words you’ll see on a button or menu, so you know what to click.
              </li>
              <li>Nothing you do here can break the website. Anything that can’t be undone asks you “Are you sure?” first.</li>
            </ul>
            <SubHead>The big picture</SubHead>
            <p>A job moves through the dashboard in the same order every time:</p>
            <Steps>
              <li>
                A customer fills out the quote form on your website. It shows up as a <B>Lead</B>, and you get an email and a text.
              </li>
              <li>
                You build an <B>Estimate</B> and send it. The customer accepts it online with one click.
              </li>
              <li>
                Accepting creates a <B>Job</B>. You set the dates, assign the crew and it appears on the <B>Schedule</B>.
              </li>
              <li>
                When the work is done, you send an <B>Invoice</B>. The customer pays online, or you record their check or cash.
              </li>
              <li>
                <B>Reports</B> add it all up so you can see what you made on every job.
              </li>
            </Steps>
          </Section>

          <Section id="sign-in" title="Signing in">
            <p>
              You sign in at <B>{site}/login</B>. Use any web browser on a computer, tablet or phone.
            </p>
            <Video name="01-sign-in" title="Signing in to the dashboard" />
            <Steps>
              <li>
                Open your web browser and go to <B>{site}/login</B>.
              </li>
              <li>
                Type your email address in the <B>Email</B> box.
              </li>
              <li>
                Type your password in the <B>Password</B> box.
              </li>
              <li>
                Click <B>Sign in</B>. The <B>Dashboard</B> opens.
              </li>
            </Steps>
            <p>
              You stay signed in on that device for 30 days. To sign out, click the little door icon next to your name at the bottom-left of the
              screen (it says <B>Sign out</B> when you point at it).
            </p>
            <Tip>Bookmark the login page, or on a phone, use “Add to Home Screen” so it opens like an app.</Tip>
            <SubHead>If something goes wrong</SubHead>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <B>“Email or password is incorrect.”</B> Check for typos and that Caps Lock is off. Still stuck? See{' '}
                <a href="#help" className="text-brand-fg underline">
                  Troubleshooting
                </a>
                .
              </li>
              <li>
                <B>“Too many attempts. Try again in 15 minutes.”</B> This is a safety lock after 10 wrong tries. Wait 15 minutes, then try again.
              </li>
            </ul>
            <p>
              <B>Using it on a phone.</B> Everything works on a phone. The menu is hidden to save space: tap the <B>menu button</B> (three lines) at
              the top-left to open it. The calendar switches to a simple list on small screens.
            </p>
          </Section>

          <Section id="tour" title="A tour of the dashboard">
            <p>
              The screen has two parts: the <B>menu</B> down the left side, and the <B>page</B> you’re working on to the right. Click any word in the
              menu to go to that page.
            </p>
            <Video name="02-tour" title="A quick tour of the dashboard and menu" />
            <Table
              head={['Menu item', 'What it’s for']}
              rows={[
                ['Dashboard', 'Your home page: today’s numbers, new leads, upcoming jobs, recent payments'],
                ['Leads', 'Quote requests from your website. An orange number shows how many are new'],
                ['Estimates', 'Price quotes you send to customers to accept online'],
                ['Jobs', 'Every job, its dates, crew, photos, hours and costs'],
                ['Schedule', 'A month calendar of jobs, time off and days you’re closed'],
                ['Customers', 'Your address book, with each customer’s jobs and balance'],
                ['Invoices', 'Bills you send, and payments you’ve received'],
                ['Expenses & supplies', 'Receipts for materials, fuel, rentals and so on'],
                ['Reports', 'Money in, money out, and profit per job'],
                ['Website content', 'Photos, reviews, services, FAQ and towns shown on your public website'],
                ['Price list', 'Your standard prices, for building estimates fast'],
                ['Team', 'Invite managers and crew, and set pay rates'],
                ['Settings', 'Business name, phone, logo, tax rate and automatic messages'],
              ]}
              boldFirst
            />
            <p>
              At the very bottom of the menu: <B>View website</B> opens your public site in a new tab, <B>How-to guide</B> opens this page, and below
              that are your name and the <B>Sign out</B> button.
            </p>
            <p>
              <B>The Dashboard home page</B> greets you with “Hi” and today’s date, then shows:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <B>Quick buttons</B> across the top: <B>New estimate</B>, <B>New job</B>, <B>Add expense</B> and <B>New invoice</B>.
              </li>
              <li>
                <B>Four number boxes:</B> <B>Collected this month</B>, <B>Outstanding</B> (money owed to you; red if anything is late),{' '}
                <B>Avg. job margin</B> (how much of each job is profit) and <B>Active jobs</B>.
              </li>
              <li>
                <B>New leads</B>, <B>Upcoming jobs (next 14 days)</B>, <B>Recent payments</B> and <B>Estimates awaiting reply</B>. Click any item to
                open it.
              </li>
            </ul>
            <p>
              <B>Colored labels.</B> Many lists show a small colored label called a status. Green always means good or done (Won, Accepted, Paid,
              Completed). Red means it needs attention (Overdue, Declined, Expired).
            </p>
            <p>
              <B>Messages after you click.</B> When you save something, a green box confirms it. If something is missing, a red box under the form
              explains what to fix.
            </p>
            <p>
              <B>Who sees what.</B> Managers see everything except <B>Reports</B>, <B>Team</B> and <B>Settings</B>, and never see pay rates. Crew
              members see only <B>Dashboard</B>, their own <B>Jobs</B>, the <B>Schedule</B> and <B>Expenses & supplies</B>.
            </p>
          </Section>

          <Section id="leads" title="Leads: new quote requests">
            <p>
              Every time someone fills out the quote form on your website, a new <B>Lead</B> appears with the label <B>New</B>, and you get an email
              and a text. Leads is your to-do list for calling people back.
            </p>
            <Video name="03-lead" title="Working a new lead and starting an estimate" />
            <SubHead>To work a new lead</SubHead>
            <Steps>
              <li>
                Click <B>Leads</B> in the menu. The orange number next to it is how many are new.
              </li>
              <li>
                Click the person’s name to open their request. You’ll see their phone, email, address, the type of job, how soon they need it, how
                they found you, and any photos they sent. Click a photo to see it full size.
              </li>
              <li>
                Use the <B>Call</B>, <B>Text</B>, <B>Email</B> or <B>Map</B> buttons to contact them or see where the job is.
              </li>
              <li>
                After you’ve talked, type anything useful in the <B>Notes</B> box (measurements, gate codes, “call back Tuesday”) and click{' '}
                <B>Save notes</B>. Only your team sees notes.
              </li>
              <li>
                On the right, under <B>Status</B>, pick <B>Contacted</B> and click <B>Update status</B>, so you know you’ve reached them.
              </li>
              <li>
                When you’re ready to quote, click <B>Create estimate</B> under <B>Next steps</B>. The dashboard adds them as a customer for you and
                opens a new estimate with their details filled in. (See <a href="#estimates" className="text-brand-fg underline">Estimates</a>.)
              </li>
            </Steps>
            <SubHead>What the labels mean</SubHead>
            <Table
              head={['Label', 'Meaning', 'How it gets there']}
              rows={[
                ['New', 'Nobody has contacted them yet', 'Automatic, from the website'],
                ['Contacted', 'You’ve reached out', 'You set it'],
                ['Estimate Sent', 'They have a price from you', 'Automatic when you send an estimate'],
                ['Won', 'They said yes', 'Automatic when they accept the estimate'],
                ['Lost', 'They went elsewhere or never replied', 'You set it'],
              ]}
              boldFirst
            />
            <SubHead>Other handy things</SubHead>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                The tabs across the top (<B>All</B>, <B>New</B>, <B>Contacted</B> and so on) filter the list. The <B>Source</B> box shows only leads
                from, say, Google or Facebook.
              </li>
              <li>
                <B>Convert to customer</B> adds them to your Customers without making an estimate. Tick <B>Also mark lead as Won</B> if they’ve already
                said yes.
              </li>
              <li>
                <B>Delete lead</B> is only for spam or junk. It asks you to confirm, and it disappears once a lead has an estimate.
              </li>
            </ul>
          </Section>

          <Section id="customers" title="Customers: your address book">
            <p>
              <B>Customers</B> holds everyone you’ve quoted or worked for, with their jobs, estimates, invoices and what they owe. Most customers are
              added for you when you turn a lead into an estimate, so you rarely need to add one by hand.
            </p>
            <Video name="04-customers" title="Finding and adding a customer" />
            <SubHead>To find a customer</SubHead>
            <Steps>
              <li>
                Click <B>Customers</B> in the menu.
              </li>
              <li>
                Type part of their name, phone number or email in the search box and click <B>Search</B>.
              </li>
              <li>
                Click their name to open their page. The <B>Balance</B> column shows in orange if they owe you money.
              </li>
            </Steps>
            <SubHead>To add a customer yourself</SubHead>
            <p>For example, someone who called instead of using the website.</p>
            <Steps>
              <li>
                Click <B>Customers</B>, then <B>New customer</B> at the top-right.
              </li>
              <li>
                Fill in their <B>Name</B> (the only required box), plus <B>Phone</B>, <B>Email</B> and address. Add a <B>Company</B> only for builders
                or property managers.
              </li>
              <li>
                Under <B>How they found you</B>, type Google, referral, Facebook and so on. This feeds the lead-source report.
              </li>
              <li>
                Click <B>Create customer</B>.
              </li>
            </Steps>
            <p>
              <B>On a customer’s page</B> you’ll see:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <B>New estimate</B> and <B>New job</B> buttons at the top, already set up for this customer.
              </li>
              <li>
                <B>Call</B>, <B>Text</B>, <B>Email</B> and <B>Map</B> buttons.
              </li>
              <li>
                <B>Lifetime value</B> (everything they’ve paid you), <B>Total billed</B> and <B>Open balance</B>.
              </li>
              <li>Lists of their jobs, estimates, invoices and leads. Click any one to open it.</li>
              <li>
                <B>Contact info</B>, where you can fix a phone number or address. Click <B>Save changes</B> when done.
              </li>
            </ul>
            <p>To keep your records straight, a customer can only be deleted if they have no jobs, estimates or invoices.</p>
          </Section>

          <Section id="estimates" title="Estimates: sending a price">
            <p>
              An <B>Estimate</B> is your written price. The customer gets an email (and a text if you like) with a PDF and a link where they can accept
              it with one click. It starts as <B>Draft</B>, becomes <B>Sent</B> when you send it, and <B>Accepted</B> when they say yes.
            </p>
            <Video name="05-estimate" title="Building an estimate with the price list and sending it" />
            <SubHead>To build an estimate</SubHead>
            <Steps>
              <li>
                Start from a lead (<B>Create estimate</B>), a customer’s page (<B>New estimate</B>), or <B>Estimates</B> → <B>New estimate</B>.
              </li>
              <li>
                Check the <B>Customer</B> is right. If they aren’t in the list, click <B>Add a customer</B> first.
              </li>
              <li>
                Give it a <B>Title</B> the customer will understand, like “Basement hang & finish”.
              </li>
              <li>
                <B>Valid until</B> is filled in for 30 days from today. Change it if you like.
              </li>
              <li>
                Add your <B>Line items</B>, one row per piece of work:
                <ol className="mt-2 list-[lower-alpha] space-y-1 pl-6">
                  <li>
                    Click the <B>+ From price list…</B> box and pick an item. It fills in the description and price for you.
                  </li>
                  <li>
                    Or click <B>Add line</B> and type your own <B>Description</B>, <B>Qty</B> (how many) and <B>Unit price</B>.
                  </li>
                  <li>
                    The <B>Amount</B> and <B>Total</B> work themselves out. To remove a row, click its trash can.
                  </li>
                </ol>
              </li>
              <li>
                <B>Tax rate %</B> comes from your Settings. Change it here for just this estimate if needed.
              </li>
              <li>
                In <B>Notes for the customer</B>, write the scope, what’s not included and payment terms.
              </li>
              <li>
                Click <B>Save estimate</B>. It’s saved as a Draft; the customer hasn’t seen anything yet.
              </li>
            </Steps>
            <SubHead>To send it</SubHead>
            <Steps>
              <li>
                On the estimate’s page, find the <B>Send to customer</B> box.
              </li>
              <li>
                Tick <B>Also send by text message</B> if you want them to get a text too.
              </li>
              <li>
                Click <B>Send estimate</B>. The label changes to <B>Sent</B>, and the lead changes to <B>Estimate Sent</B>.
              </li>
            </Steps>
            <p>
              You can keep editing a Sent estimate. Changes show up on the customer’s link right away, and <B>Re-send estimate</B> sends it again.
            </p>
            <SubHead>Other buttons on an estimate</SubHead>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <B>PDF</B> downloads a printable copy.
              </li>
              <li>
                <B>Preview</B> shows you exactly what the customer sees.
              </li>
              <li>
                <B>Copy customer link</B> copies their link so you can paste it into your own text or email.
              </li>
              <li>
                <B>Delete estimate</B> removes it and stops the customer’s link from working.
              </li>
            </ul>
            <p>
              <B>What the customer sees.</B> Their link opens a clean page with your logo, the price breakdown and a <B>Download PDF</B> button. At
              the bottom is <B>Ready to move forward?</B>: they type their name, tick the box to agree and click <B>Accept estimate</B>. They can’t
              decline online; they’d call or email you instead.
            </p>
            <Video name="06-customer-accepts" title="What the customer sees, and accepting online" />
            <p>
              <B>Expired estimates.</B> After the <B>Valid until</B> date, a red <B>Expired</B> label appears and the customer can no longer accept. To
              revive it, change the <B>Valid until</B> date, click <B>Save changes</B>, then <B>Re-send estimate</B>.
            </p>
          </Section>

          <Section id="accepted" title="When a customer says yes">
            <p>How the job gets created depends on how the customer said yes.</p>
            <p>
              <B>They accepted online (the easy way).</B> Everything happens by itself:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                The estimate changes to <B>Accepted</B> and shows the name they signed with.
              </li>
              <li>
                A new <B>Job</B> is created with the label <B>Pending</B>, ready for you to schedule.
              </li>
              <li>
                The lead changes to <B>Won</B>.
              </li>
              <li>
                You get an email and a text. The email has an <B>Open the job</B> button.
              </li>
            </ul>
            <p>
              <B>They said yes by phone, text or in person.</B> Do these two things yourself:
            </p>
            <Steps>
              <li>
                Open the estimate and click <B>Mark accepted</B> in the <B>Customer response</B> box. Click <B>OK</B> to confirm.
              </li>
              <li>
                In the <B>Job & billing</B> box, click <B>Convert to job</B>. The new job opens, using the estimate’s title, notes and price.
              </li>
            </Steps>
            <Tip>
              <B>Mark accepted</B> on its own does not create a job. Always follow it with <B>Convert to job</B>.
            </Tip>
            <p>
              <B>They said no.</B> Click <B>Mark declined</B>. If they change their mind later, click <B>Reopen</B> so you can edit and re-send it.
            </p>
            <p>
              <B>Taking a deposit.</B> In the <B>Job & billing</B> box, click <B>Create invoice from estimate</B> to bill right away (see{' '}
              <a href="#invoices" className="text-brand-fg underline">
                Invoices
              </a>{' '}
              for deposits).
            </p>
          </Section>

          <Section id="jobs" title="Jobs: from scheduled to done">
            <p>
              A <B>Job</B> is the actual work. Each job’s page holds its dates, crew, photos, hours, costs, invoices and profit. Jobs move through these
              labels:
            </p>
            <Table
              head={['Label', 'Meaning']}
              rows={[
                ['Pending', 'Agreed, but no dates yet'],
                ['Scheduled', 'Dates are set; it shows on the calendar'],
                ['In Progress', 'The crew is working on it'],
                ['Completed', 'Finished. A review request goes to the customer automatically'],
                ['Cancelled', 'Not happening. Hidden from the calendar'],
              ]}
              boldFirst
            />
            <p>
              Click <B>Jobs</B> in the menu to see the list. It opens on <B>Active</B> (Pending, Scheduled and In Progress). Use the tabs to see the
              others.
            </p>
            <Video name="07-schedule-job" title="Scheduling a job and assigning the crew" />
            <SubHead>To schedule a job and assign the crew</SubHead>
            <Steps>
              <li>
                Open the job (from <B>Jobs</B>, the Dashboard, or the <B>Waiting to be scheduled</B> list on the Schedule).
              </li>
              <li>
                Click <B>Edit details & dates</B> to open that box.
              </li>
              <li>
                Pick a <B>Start date</B>. Add an <B>End date</B> for jobs longer than one day.
              </li>
              <li>
                Click <B>Save job</B>.
              </li>
              <li>
                On the right, under <B>Status</B>, pick <B>Scheduled</B> and click <B>Update status</B>.
              </li>
              <li>
                Under <B>Crew</B>, tick the people working this job and click <B>Save crew</B>. Each morning they get a text listing the next day’s
                jobs.
              </li>
              <li>
                Under <B>Job notes</B>, add anything the crew needs: gate code, parking, materials to bring. Click <B>Save notes</B>. The crew can read
                these on their phones.
              </li>
            </Steps>
            <p>
              <B>To add photos.</B> Under <B>Photos</B>, click <B>Take or choose photos</B> (on a phone this opens the camera). Pick <B>Before</B>,{' '}
              <B>Progress</B> or <B>After</B>, add a caption if you like, and click <B>Upload</B>. You can add up to 12 at once. Good photos help with
              marketing and settle disputes.
            </p>
            <Video name="08-labor-complete" title="Logging hours and marking a job completed" />
            <p>
              <B>To log hours worked.</B> Under <B>Labor</B>, pick the <B>Worker</B> (or <B>Other / subcontractor…</B> and type their name), the{' '}
              <B>Date</B> and the <B>Hours</B>, then click <B>Add labor</B>. The pay rate is filled in from the Team page, so the job’s labor cost works
              itself out.
            </p>
            <p>
              <B>To add a receipt to this job.</B> Under <B>Materials & expenses</B>, click <B>Add expense</B> (see{' '}
              <a href="#expenses" className="text-brand-fg underline">
                Expenses
              </a>
              ).
            </p>
            <p>
              <B>To change the label.</B> Under <B>Status</B> on the right, pick the new one and click <B>Update status</B>. When you pick{' '}
              <B>Completed</B>, the customer automatically gets a review request a day later (you can change this in Settings).
            </p>
            <p>
              <B>Job profit</B> (owners only) shows what the job brought in versus what it cost: <B>Quoted</B>, <B>Invoiced</B>, <B>Collected</B>,{' '}
              <B>Materials & expenses</B>, <B>Labor</B>, then <B>Profit</B> and <B>Margin</B>. It says <B>Projected</B> until you’ve sent an invoice,
              and <B>Actual</B> after.
            </p>
            <p>
              <B>To start a job without an estimate</B>, click <B>Jobs</B> → <B>New job</B>, choose the customer, give it a <B>Job title</B>, and
              click <B>Create job</B>.
            </p>
            <p>
              A job can only be deleted if it has no invoices. Otherwise, set it to <B>Cancelled</B>.
            </p>
          </Section>

          <Section id="schedule" title="Schedule: the calendar">
            <p>
              The <B>Schedule</B> is a month calendar of every scheduled job, plus time off and days you’re closed. Each job is a colored bar across
              the days it runs. Click a bar to open that job.
            </p>
            <Video name="09-schedule" title="Using the calendar and blocking off a holiday" />
            <ul className="list-disc space-y-1 pl-6">
              <li>
                Use <B>‹</B> and <B>›</B> at the top-right to go back or forward a month, and <B>Today</B> to jump back to now.
              </li>
              <li>
                <B>List view</B> shows the month as a simple list. On a phone it always shows the list.
              </li>
              <li>Finished jobs appear gray and crossed out. Cancelled jobs are hidden.</li>
              <li>
                <B>Waiting to be scheduled</B>, at the bottom, lists Pending jobs with no dates. Click <B>Set dates</B> to schedule one.
              </li>
            </ul>
            <SubHead>To block off a holiday, vacation or day off</SubHead>
            <Steps>
              <li>
                Scroll down to the <B>Time off & blackout days</B> box.
              </li>
              <li>
                Type a <B>Title</B>, like “Thanksgiving” or “Family vacation”.
              </li>
              <li>
                Pick the <B>Type</B>: <B>Blackout</B>, <B>Holiday</B> or <B>Time Off</B>.
              </li>
              <li>
                Under <B>Who</B>, pick <B>Whole company</B>, or one person if only they are off.
              </li>
              <li>
                Pick the <B>Start</B> date, and an <B>End</B> date if it’s more than one day.
              </li>
              <li>
                Click <B>Add to schedule</B>. A gray striped bar appears on the calendar.
              </li>
            </Steps>
            <Tip>
              Your public website has an availability calendar. Days blocked for the <B>Whole company</B> show as <B>Booked</B> there, so customers
              don’t ask for those days. One person’s time off doesn’t affect it.
            </Tip>
            <p>
              To remove a block, click <B>Remove</B> next to it in the list.
            </p>
          </Section>

          <Section id="invoices" title="Invoices: getting paid">
            <p>
              An <B>Invoice</B> is your bill. The customer gets an email (and a text if you like) with a PDF and a link where they can pay by card or
              bank transfer. Invoice numbers start at 1001.
            </p>
            <Table
              head={['Label', 'Meaning']}
              rows={[
                ['Draft', 'Created but not sent. The customer hasn’t seen it'],
                ['Sent', 'Sent and waiting for payment'],
                ['Partial', 'Part of it has been paid'],
                ['Paid', 'Paid in full'],
                ['Overdue', 'Past the due date with money still owed'],
                ['Void', 'Cancelled for good'],
              ]}
              boldFirst
            />
            <p>
              The <B>Invoices</B> page shows <B>Outstanding</B> (owed to you), <B>Overdue</B> and <B>Collected this month</B> at the top. The{' '}
              <B>Unpaid</B> and <B>Overdue</B> tabs are your collection list.
            </p>
            <Video name="10-invoice" title="Creating an invoice from a job and sending it" />
            <SubHead>To create an invoice</SubHead>
            <Steps>
              <li>
                The easiest way: open the job and click <B>New invoice</B> at the top. (You can also use <B>Create invoice from estimate</B> on an
                estimate, which copies every line, or <B>Invoices</B> → <B>New invoice</B>.)
              </li>
              <li>
                Check the <B>Customer</B> and <B>Job</B>.
              </li>
              <li>
                Pick the <B>Invoice type</B>: <B>Standard</B> for most jobs, or <B>Deposit</B>, <B>Progress</B> or <B>Final</B> when you bill in
                stages.
              </li>
              <li>
                The <B>Issue date</B> is today, and the <B>Due date</B> is set from your payment terms in Settings. Change them if needed.
              </li>
              <li>
                Add or check the <B>Line items</B>, the same way as on an estimate.
              </li>
              <li>
                Add any <B>Notes</B>, like “Thank you! Checks payable to…”.
              </li>
              <li>
                Click <B>Create invoice</B>. It’s saved as a <B>Draft</B>.
              </li>
            </Steps>
            <p>
              <B>To take a deposit.</B> Pick <B>Deposit</B> as the <B>Invoice type</B>. A helper appears: type the percentage (it starts at 50), check
              the dollar amount it works out, and click <B>Use this amount</B>. Later, make a <B>Final</B> invoice for the rest.
            </p>
            <p>
              <B>To send it.</B> On the invoice’s page, in the <B>Send to customer</B> box, tick <B>Also text the customer</B> if you like, and click{' '}
              <B>Send invoice</B>. The label changes to <B>Sent</B>.
            </p>
            <p>
              <B>When the customer pays online</B>, the invoice updates to <B>Paid</B> (or <B>Partial</B>) by itself, and you get an email and a text
              saying “Payment received”.
            </p>
            <Video name="11-payment" title="Recording a check payment" />
            <SubHead>To record a check, cash, Zelle or Venmo payment</SubHead>
            <Steps>
              <li>Open the invoice.</li>
              <li>
                In the <B>Record payment</B> box, the <B>Amount</B> is filled in with what’s owed. Change it if they paid part.
              </li>
              <li>
                Check the <B>Date</B> and pick the <B>Method</B>: <B>Check</B>, <B>Cash</B>, <B>Zelle</B>, <B>Venmo</B> or <B>Other</B>.
              </li>
              <li>
                Optionally, type the check number or confirmation in <B>Reference</B>.
              </li>
              <li>
                Click <B>Record payment</B>. The balance and label update right away.
              </li>
            </Steps>
            <p>
              Typed a payment wrong? Click <B>Remove</B> next to it under <B>Payments</B>, then record it again. Online payments can’t be removed.
            </p>
            <p>
              <B>Chasing late payments.</B> Once an invoice is sent and still unpaid, a <B>Send reminder</B> button appears. The system also sends a
              friendly reminder once a week on overdue invoices by itself (you can turn this off in Settings).
            </p>
            <SubHead>Other buttons</SubHead>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <B>Edit</B> changes the lines, dates or notes. You can’t change the customer or job; make a new invoice instead.
              </li>
              <li>
                <B>PDF</B> downloads a printable copy.
              </li>
              <li>
                The <B>Customer link</B> box has a <B>Copy</B> button to paste the pay link into your own message, and <B>Preview customer view</B>{' '}
                shows what they see.
              </li>
              <li>
                <B>Void invoice</B> cancels an invoice that was a mistake. It only works if no payments are recorded, and it can’t be undone.
              </li>
            </ul>
          </Section>

          <Section id="expenses" title="Expenses: logging receipts">
            <p>
              <B>Expenses & supplies</B> keeps every receipt in one place, so you know what each job really cost and have everything ready at tax
              time. The best habit: snap the receipt on your phone right after you buy materials. It takes 20 seconds.
            </p>
            <Video name="12-expense" title="Adding an expense with a receipt photo" />
            <SubHead>To add an expense</SubHead>
            <Steps>
              <li>
                Click <B>Add expense</B> (on the Dashboard, the <B>Expenses & supplies</B> page, or a job’s page).
              </li>
              <li>
                Type the <B>Amount</B> and check the <B>Date</B>.
              </li>
              <li>
                Pick a <B>Category</B>, such as <B>Drywall sheets</B>, <B>Joint compound / mud</B> or <B>Fuel & mileage</B>.
              </li>
              <li>
                Under <B>Job</B>, pick the job it was for. For things like insurance or advertising, leave it on <B>Overhead / not tied to a job</B>.
              </li>
              <li>
                Type or pick the <B>Vendor</B> (Home Depot, Lowe’s and so on) and a short <B>Description</B>, like “20 sheets 1/2″ 4x8”.
              </li>
              <li>
                Under <B>Receipt</B>, click <B>Snap or upload receipt</B>. On a phone this opens the camera.
              </li>
              <li>
                Click <B>Save expense</B>.
              </li>
            </Steps>
            <p>
              <B>Finding expenses later.</B> The list shows one month at a time; use the arrows to change months, or <B>All time</B> to see
              everything. Narrow it by <B>Category</B> or <B>Job</B> and click <B>Apply</B>. The <B>By category</B> box shows where the money went.
              Click the paperclip to see a receipt, or <B>Edit</B> to fix one.
            </p>
            <p>
              <B>For your bookkeeper.</B> Click <B>Export CSV</B> to download the list as a spreadsheet file. It uses whatever filters you have on, so
              pick the month or <B>All time</B> first.
            </p>
            <p>Crew members can add receipts for jobs they’re assigned to. They can only see their own, and can only change them for 24 hours.</p>
          </Section>

          <Section id="reports" title="Reports: how the business is doing">
            <p>
              <B>Reports</B> (owners only) answers “am I making money, and on which jobs?” It adds up payments, expenses and crew hours by itself; you
              don’t enter anything here.
            </p>
            <Video name="13-reports" title="A walk through the Reports page" />
            <p>
              <B>Pick a time period</B> with the tabs at the top: <B>This month</B>, <B>Last month</B>, <B>Year to date</B> or <B>Last 12 months</B>.
              For any other dates, fill in <B>From</B> and <B>To</B> and click <B>Apply</B>.
            </p>
            <Table
              head={['Part of the page', 'What it tells you']}
              rows={[
                ['Revenue collected', 'Money actually received in the period'],
                ['Expenses', 'Materials and overhead from your receipts'],
                ['Labor', 'Crew hours times their pay rate'],
                ['Net profit', 'Revenue minus expenses and labor, and what share of revenue you kept'],
                ['Last 12 months chart', 'Money in versus money out, month by month. Point at a bar to see the numbers'],
                ['Expenses by category', 'Where the money went'],
                [
                  'Profit per job',
                  'Each job’s revenue, materials, labor, profit and margin. Margins under 20% show in orange. “Est.” means it’s using the quote because nothing has been invoiced yet',
                ],
                [
                  'Lead sources & conversion',
                  'Where leads came from (Google, Facebook…) and how many you won from each. Spend your marketing where the win rate is best',
                ],
                ['Accounts receivable aging', 'Money owed to you, grouped by how late it is'],
              ]}
              boldFirst
            />
            <p>
              The <B>CSV</B> button on <B>Profit per job</B> downloads it as a spreadsheet file.
            </p>
          </Section>

          <Section id="price-list" title="Price list: your standard prices">
            <p>
              The <B>Price list</B> holds the prices you charge most often. They appear in the <B>+ From price list…</B> box on every estimate and
              invoice, so building a quote takes a few clicks. You can still change the price on any one job.
            </p>
            <Video name="14-price-list" title="Adding and changing items on the price list" />
            <SubHead>To add an item</SubHead>
            <Steps>
              <li>
                Click <B>Price list</B> in the menu.
              </li>
              <li>
                In <B>Add an item</B>, type the <B>Name</B> (for example “Popcorn ceiling removal”), the <B>Unit</B> (sheet, sq ft, each) and the{' '}
                <B>Price</B>.
              </li>
              <li>
                Click <B>Add</B>.
              </li>
            </Steps>
            <p>
              <B>To change a price</B>, edit the number in the list and click <B>Save</B> on that row. Estimates and invoices you’ve already sent don’t
              change.
            </p>
            <p>
              <B>To stop using an item</B> without losing it, untick <B>Active</B> and click <B>Save</B>. It disappears from the estimate and invoice
              boxes. <B>Delete</B> removes it for good.
            </p>
          </Section>

          <Section id="website" title="Website content: updating your public site">
            <p>
              <B>Website content</B> is where you change what customers see on your website: photos of your work, reviews, the services you offer,
              common questions, and the towns you serve. Changes go live the moment you click save. The tabs across the top are <B>Overview</B>,{' '}
              <B>Gallery</B>, <B>Reviews</B>, <B>Services</B>, <B>FAQ</B> and <B>Service areas</B>.
            </p>
            <Video name="15-website" title="The launch checklist, adding a review and the gallery" />
            <p>
              <B>Start with the Launch checklist.</B> The <B>Overview</B> tab shows five things to fix before the site goes live, with a link to fix
              each one:
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <B>Sample reviews removed.</B> The site comes with made-up reviews marked “Sample”. Delete them before customers see the site.
              </li>
              <li>
                <B>Real photos in the gallery.</B> Replace the sample pictures with your own before-and-after photos.
              </li>
              <li>
                <B>Service areas updated.</B> List the real towns you work in.
              </li>
              <li>
                <B>Google review link set.</B> Paste it in <B>Settings</B> so review requests send customers to Google.
              </li>
              <li>
                <B>Real phone & email.</B> Set these in <B>Settings</B>.
              </li>
            </ul>
            <SubHead>To add a review</SubHead>
            <Steps>
              <li>
                Click the <B>Reviews</B> tab, then <B>Add review</B>.
              </li>
              <li>
                Type the <B>Customer name</B>. First name and last initial (“Jennifer R.”) is fine.
              </li>
              <li>
                Pick the star <B>Rating</B> and paste their words into <B>Review</B>. Only use real reviews from real customers.
              </li>
              <li>
                Tick <B>Featured on home page</B> to show it on the front page. Leave <B>Published</B> ticked.
              </li>
              <li>
                Click <B>Add review</B>.
              </li>
            </Steps>
            <p>
              To get rid of the made-up ones in one go, click <B>Delete 4 sample reviews</B> (the number may differ).
            </p>
            <SubHead>To add a photo of your work</SubHead>
            <Steps>
              <li>
                Click the <B>Gallery</B> tab, then <B>Add photo</B>.
              </li>
              <li>
                Give it a short <B>Title</B>, like “Basement finish in Chatham”, and pick a <B>Category</B>.
              </li>
              <li>
                Under <B>After photo</B>, choose the finished picture. Optionally add a <B>Before photo</B>: the website then shows a slider customers
                can drag to compare.
              </li>
              <li>
                Tick <B>Featured on home page</B> for your best work, and click <B>Add photo</B>.
              </li>
            </Steps>
            <p>
              Photos must be JPG, PNG or WebP. If an iPhone photo is refused, change the iPhone’s camera setting to <B>Most Compatible</B> (Settings →
              Camera → Formats) and take it again.
            </p>
            <p>
              <B>The other tabs</B> work the same way: click <B>Add</B>, fill in the boxes, and save.
            </p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <B>Services:</B> what you offer. A clear name and a detailed description help you show up on Google.
              </li>
              <li>
                <B>FAQ:</B> a <B>Question</B> and its <B>Answer</B>.
              </li>
              <li>
                <B>Service areas:</B> each town you add gets its own page on your website, which helps local customers find you on Google.
              </li>
            </ul>
            <p>
              On any item, <B>Hide</B> takes it off the website without deleting it, and <B>Publish</B> puts it back. <B>Sort order</B> controls the
              order: lower numbers show first.
            </p>
          </Section>

          <Section id="team" title="Team: adding your crew">
            <p>
              <B>Team</B> (owners only) is where you give people their own login, choose what they can see, and set their pay rate. Each person signs
              in with their own email and password; never share yours.
            </p>
            <Video name="16-team" title="Inviting a new crew member" />
            <SubHead>To invite someone</SubHead>
            <Steps>
              <li>
                Click <B>Team</B> in the menu and scroll to <B>Invite someone</B>.
              </li>
              <li>
                Type their <B>Name</B> and <B>Email</B>. Add their <B>Mobile phone</B> too, and they’ll also get the invite by text.
              </li>
              <li>
                Pick their <B>Role</B> (see the table below). Most hires are <B>Crew member</B>.
              </li>
              <li>
                Type their <B>Hourly pay rate</B>. This is used to work out labor cost on jobs, and only owners can see it.
              </li>
              <li>
                Click <B>Send invite</B>.
              </li>
            </Steps>
            <p>
              They get a link to choose their own password. The link works for 7 days. If they can’t find the email, click <B>Copy</B> next to the
              link and text it to them yourself.
            </p>
            <Table
              head={['', 'Owner', 'Manager', 'Crew member']}
              rows={[
                ['Leads, estimates, customers, jobs, schedule', 'Yes', 'Yes', 'Only their own jobs'],
                ['Invoices and payments', 'Yes', 'Yes', 'No'],
                ['Expenses', 'Yes', 'Yes', 'Add receipts for their jobs'],
                ['Reports, job profit, pay rates', 'Yes', 'No', 'No'],
                ['Team and Settings', 'Yes', 'No', 'No'],
              ]}
            />
            <p>
              Only make someone an <B>Owner</B> if you trust them completely: owners can see and change everything.
            </p>
            <p>
              <B>Waiting invites</B> show under <B>Pending invites & password resets</B>. Use <B>Resend</B> if a link expired, or <B>Revoke</B> to
              cancel it.
            </p>
            <p>
              <B>When someone forgets their password</B>, click <B>Edit</B> next to their name in <B>Team members</B>, then{' '}
              <B>Send password reset link</B>. They choose a new password from the link.
            </p>
            <p>
              <B>When someone leaves</B>, click <B>Edit</B> next to their name, untick <B>Active — can sign in</B> and click <B>Save changes</B>.
              They’re signed out right away, but their past jobs, hours and receipts stay on record.
            </p>
          </Section>

          <Section id="settings" title="Settings: your business details">
            <p>
              <B>Settings</B> (owners only) controls the business name, phone and logo shown everywhere, plus your tax rate, payment terms and automatic
              messages. Each box has its own <B>Save</B> button, so change one box, click its <B>Save</B>, then move to the next.
            </p>
            <Video name="17-settings" title="A tour of the Settings page" />
            <Table
              head={['Box', 'What to set there']}
              rows={[
                [
                  'Business info',
                  'Business name, your name, tagline, phone, email, address, license number, years in business, the “Fully insured” badge, and the About Us text',
                ],
                ['Branding', 'Your accent color, your logo, and the big headline on the home page'],
                [
                  'Invoices & payments',
                  'Sales tax rate (use 0 if you don’t charge tax on labor), Payment due in days (0 means due on receipt) and the footer printed on every invoice',
                ],
                [
                  'Notifications',
                  'The email and mobile number where new quote requests and alerts go. Send test email and Send test text check they arrive',
                ],
                [
                  'Scheduling',
                  'Your work days, and how many jobs you can run at the same time. This controls the availability calendar on your website',
                ],
                [
                  'Marketing & reviews',
                  'Your Google review link, Facebook and Instagram, whether to ask customers for a review after a job (and how many days after), and weekly reminders for overdue invoices',
                ],
                ['Integrations', 'Read-only. A check mark for each connected service: email, texts, online payments, photo storage'],
              ]}
              boldFirst
            />
            <p>
              <B>Growing the crew?</B> When you have a second crew, raise <B>Jobs you can run at the same time</B> under <B>Scheduling</B>. The
              website calendar will then show “Limited” instead of “Booked” when one crew is still free.
            </p>
            <p>Two buttons at the top of Settings are for less common jobs:</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>
                <B>Notification log</B> lists the last 100 emails and texts the system sent, and whether each one went through. Check here if a
                customer says they never got an estimate or invoice.
              </li>
              <li>
                <B>API & assistant</B> connects outside tools, like an AI assistant. You won’t need it day to day; ask whoever set up your website
                before changing anything there.
              </li>
            </ul>
          </Section>

          <Section id="help" title="Troubleshooting and questions">
            <Faq q="I forgot my password.">
              Another owner can send you a reset link from <B>Team</B>. If you’re the only owner, contact whoever set up your website. For your
              safety, there’s no “email me a new password” button.
            </Faq>
            <Faq q="A crew member forgot their password.">
              Go to <B>Team</B>, click <B>Edit</B> next to their name, and click <B>Send password reset link</B>.
            </Faq>
            <Faq q="“This link can’t be used” on an invite.">
              Invite links last 7 days and work once. Go to <B>Team</B> and click <B>Resend</B> next to their invite.
            </Faq>
            <Faq q="A customer says they never got the estimate or invoice.">
              <ol className="list-decimal space-y-1 pl-6">
                <li>Open it and check the email address on the customer’s page is right.</li>
                <li>
                  Look in <B>Settings</B> → <B>Notification log</B> to see if it says <B>Sent</B> or <B>Failed</B>.
                </li>
                <li>Ask them to check their spam folder.</li>
                <li>
                  As a backup, use <B>Copy customer link</B> (estimates) or <B>Copy</B> in the <B>Customer link</B> box (invoices), and text the link
                  yourself.
                </li>
              </ol>
            </Faq>
            <Faq q="The customer can’t accept the estimate.">
              It has probably expired. Change <B>Valid until</B> to a later date, click <B>Save changes</B>, then <B>Re-send estimate</B>.
            </Faq>
            <Faq q="The customer said yes on the phone, but there’s no job.">
              Open the estimate, click <B>Mark accepted</B>, then <B>Convert to job</B>. Only online acceptance creates a job by itself.
            </Faq>
            <Faq q="I can’t change the customer on an invoice.">
              That’s on purpose. <B>Void invoice</B> the wrong one (only possible before any payment) and create a new one.
            </Faq>
            <Faq q="I recorded a payment wrong.">
              Open the invoice, click <B>Remove</B> next to the payment under <B>Payments</B>, and record it again.
            </Faq>
            <Faq q="I can’t delete a customer, job or estimate.">
              Anything with invoices attached is kept for your records. Set a job to <B>Cancelled</B> instead.
            </Faq>
            <Faq q="A page says “You don’t have access to that page.”">
              Your login is a manager or crew account. Ask the owner if you need more access.
            </Faq>
            <Faq q="My phone photo won’t upload.">
              On iPhone, go to Settings → Camera → Formats and choose <B>Most Compatible</B>, then retake the photo. Receipts can be up to 8 MB.
            </Faq>
            <Faq q="The “Pay now” button doesn’t show on invoices.">
              Online card payments haven’t been switched on yet. Customers will see instructions to pay by check instead. Check <B>Settings</B> →{' '}
              <B>Integrations</B>.
            </Faq>
            <Faq q="I’m locked out for 15 minutes.">
              After 10 wrong passwords, sign-in pauses for safety. Wait 15 minutes and try again.
            </Faq>
          </Section>

          <Section id="cheat-sheet" title="Cheat sheet">
            <p>Print this section and keep it by the computer.</p>
            <Table
              head={['I want to…', 'Go to', 'Then click']}
              rows={[
                ['Call back a new quote request', 'Leads → their name', 'Call, then set Status to Contacted'],
                ['Send a price', 'The lead → Create estimate', 'Add lines → Save estimate → Send estimate'],
                ['Record a yes by phone', 'The estimate', 'Mark accepted → Convert to job'],
                ['Schedule a job', 'Jobs → the job → Edit details & dates', 'Set dates → Save job → Status Scheduled'],
                ['Assign the crew', 'The job → Crew', 'Tick names → Save crew'],
                ['Log hours', 'The job → Labor', 'Worker, hours → Add labor'],
                ['Finish a job', 'The job → Status', 'Completed → Update status'],
                ['Bill a customer', 'The job → New invoice', 'Create invoice → Send invoice'],
                ['Take a deposit', 'New invoice, type Deposit', 'Percentage → Use this amount'],
                ['Record a check or cash', 'The invoice → Record payment', 'Method → Record payment'],
                ['Chase a late payment', 'Invoices → Overdue tab → the invoice', 'Send reminder'],
                ['Add a receipt', 'Add expense', 'Amount, category, job, photo → Save expense'],
                ['Block off a holiday', 'Schedule → Time off & blackout days', 'Add to schedule'],
                ['See what I made', 'Reports', 'Pick the period'],
                ['Add a review or photo to the website', 'Website content → Reviews or Gallery', 'Add review / Add photo'],
                ['Hire someone', 'Team → Invite someone', 'Send invite'],
                ['Change my phone, logo or tax rate', 'Settings', 'The Save button in that box'],
              ]}
            />
          </Section>
        </article>
      </div>
    </div>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4">
      <h2 className="border-b border-slate-200 pb-2 text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
      {children}
    </section>
  )
}

function SubHead({ children }: { children: ReactNode }) {
  return <h3 className="pt-2 text-lg font-semibold text-slate-900">{children}</h3>
}

function B({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-slate-900">{children}</strong>
}

function Steps({ children }: { children: ReactNode }) {
  return <ol className="list-decimal space-y-2 pl-6 marker:font-semibold marker:text-brand-fg">{children}</ol>
}

function Tip({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-brand/30 bg-brand-soft px-4 py-3">
      <span className="font-semibold text-slate-900">Tip: </span>
      {children}
    </div>
  )
}

function Video({ name, title }: { name: string; title: string }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-slate-200 bg-surface shadow-sm">
      <video
        controls
        playsInline
        muted
        preload="none"
        poster={`/howto/${name}.jpg`}
        className="aspect-[8/5] w-full bg-slate-100"
        aria-label={`Video: ${title}`}
      >
        <source src={`/howto/${name}.mp4`} type="video/mp4" />
      </video>
      <figcaption className="border-t border-slate-200 px-4 py-2 text-sm text-slate-500">Video: {title}</figcaption>
    </figure>
  )
}

function Table({ head, rows, boldFirst }: { head: string[]; rows: string[][]; boldFirst?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-surface">
      <table className={head.length > 2 ? 'w-full min-w-[520px] text-left text-[15px]' : 'w-full text-left text-[15px]'}>
        <thead className="bg-slate-50 text-sm text-slate-600">
          <tr>
            {head.map((h, i) => (
              <th key={i} className="px-4 py-2.5 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={j === 0 && boldFirst ? 'px-4 py-2.5 font-semibold text-slate-900' : 'px-4 py-2.5'}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-surface px-4 py-3">
      <summary className="cursor-pointer font-semibold text-slate-900 marker:text-brand-fg">{q}</summary>
      <div className="mt-2">{children}</div>
    </details>
  )
}
