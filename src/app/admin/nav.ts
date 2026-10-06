import type { Permission } from '@/lib/permissions'

export type NavItem = { href: string; label: string; icon: string; permission: Permission }

// Single source of truth for the admin sidebar. Items are hidden when the user lacks the permission.
export const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: 'Run the business',
    items: [
      { href: '/admin', label: 'Dashboard', icon: 'layout-dashboard', permission: 'dashboard:view' },
      { href: '/admin/leads', label: 'Leads', icon: 'inbox', permission: 'leads:manage' },
      { href: '/admin/estimates', label: 'Estimates', icon: 'file-text', permission: 'estimates:manage' },
      { href: '/admin/projects', label: 'Jobs', icon: 'hammer', permission: 'jobs:view_assigned' },
      { href: '/admin/schedule', label: 'Schedule', icon: 'calendar', permission: 'schedule:view' },
      { href: '/admin/customers', label: 'Customers', icon: 'users', permission: 'customers:manage' },
    ],
  },
  {
    section: 'Money',
    items: [
      { href: '/admin/invoices', label: 'Invoices', icon: 'receipt', permission: 'invoices:manage' },
      { href: '/admin/expenses', label: 'Expenses & supplies', icon: 'shopping-cart', permission: 'expenses:add' },
      { href: '/admin/reports', label: 'Reports', icon: 'bar-chart', permission: 'reports:view' },
    ],
  },
  {
    section: 'Grow',
    items: [
      { href: '/admin/content', label: 'Website content', icon: 'image', permission: 'content:manage' },
      { href: '/admin/price-list', label: 'Price list', icon: 'tag', permission: 'estimates:manage' },
      { href: '/admin/team', label: 'Team', icon: 'user-plus', permission: 'team:manage' },
      { href: '/admin/settings', label: 'Settings', icon: 'settings', permission: 'settings:manage' },
    ],
  },
]
