import type { Role } from '@/db/schema'
import type { ActionState } from '@/lib/action-state'
import type { BadgeTone } from '@/components/ui'

export type LinkActionState = ActionState & { link?: string }

export const INVITE_DAYS = 7

export const ROLE_TONES: Record<Role, BadgeTone> = { owner: 'brand', manager: 'blue', employee: 'gray' }

export const ROLE_HELP: { role: Role; text: string }[] = [
  {
    role: 'owner',
    text: 'Everything — including money, reports, pay rates, team and settings. Only add a co-owner you fully trust.',
  },
  {
    role: 'manager',
    text: 'Leads, customers, estimates, jobs, schedule, invoices, expenses and website content. No reports, pay rates or settings.',
  },
  {
    role: 'employee',
    text: 'Only the jobs they are assigned to and the schedule. Can add job photos and upload receipts.',
  },
]
