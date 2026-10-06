import type { ExpenseCategory } from '@/db/schema'

/** Friendly labels for expense categories (keys mirror expenseCategoryEnum). */
export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  drywall_sheets: 'Drywall sheets',
  joint_compound: 'Joint compound / mud',
  tape_bead: 'Tape & corner bead',
  fasteners: 'Screws & fasteners',
  texture_paint: 'Texture & primer/paint',
  tools: 'Tools',
  equipment_rental: 'Equipment rental',
  fuel_mileage: 'Fuel & mileage',
  dump_disposal: 'Dump & disposal',
  subcontractor: 'Subcontractor',
  permits: 'Permits & fees',
  marketing: 'Marketing & advertising',
  insurance: 'Insurance',
  other: 'Other',
}

export const EXPENSE_CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]

export function isExpenseCategory(v: unknown): v is ExpenseCategory {
  return typeof v === 'string' && v in EXPENSE_CATEGORY_LABELS
}

export function expenseCategoryLabel(c: string): string {
  return isExpenseCategory(c) ? EXPENSE_CATEGORY_LABELS[c] : c
}

export const COMMON_VENDORS = ['Home Depot', "Lowe's", 'Menards', 'L&W Supply', 'ABC Supply', 'Amazon', 'Shell']
