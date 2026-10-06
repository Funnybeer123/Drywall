import type { Role } from '@/db/schema'

/**
 * What each role may do. Owner can do everything; managers run day-to-day
 * operations but not money settings/payroll; employees see their own jobs.
 */
export const PERMISSIONS = {
  'dashboard:view': ['owner', 'manager', 'employee'],
  'jobs:view_assigned': ['owner', 'manager', 'employee'],
  'jobs:view_all': ['owner', 'manager'],
  'jobs:manage': ['owner', 'manager'],
  'jobs:add_photos': ['owner', 'manager', 'employee'],
  'leads:manage': ['owner', 'manager'],
  'customers:manage': ['owner', 'manager'],
  'estimates:manage': ['owner', 'manager'],
  'schedule:view': ['owner', 'manager', 'employee'],
  'schedule:manage': ['owner', 'manager'],
  'expenses:add': ['owner', 'manager', 'employee'],
  'expenses:manage': ['owner', 'manager'],
  'labor:manage': ['owner', 'manager'],
  'invoices:manage': ['owner', 'manager'],
  'payments:record': ['owner', 'manager'],
  'reports:view': ['owner'],
  'job_profit:view': ['owner'],
  'content:manage': ['owner', 'manager'],
  'team:manage': ['owner'],
  'pay_rates:view': ['owner'],
  'settings:manage': ['owner'],
} as const satisfies Record<string, readonly Role[]>

export type Permission = keyof typeof PERMISSIONS

export function can(user: { role: Role } | null | undefined, permission: Permission): boolean {
  if (!user) return false
  return (PERMISSIONS[permission] as readonly Role[]).includes(user.role)
}

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  manager: 'Manager',
  employee: 'Crew member',
}
