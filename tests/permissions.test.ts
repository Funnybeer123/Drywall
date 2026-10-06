import { describe, expect, it } from 'vitest'
import { can, PERMISSIONS } from '@/lib/permissions'
import { toE164 } from '@/lib/utils'

const owner = { role: 'owner' as const }
const manager = { role: 'manager' as const }
const crew = { role: 'employee' as const }

describe('permissions', () => {
  it('owner can do everything', () => {
    for (const p of Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[]) expect(can(owner, p)).toBe(true)
  })
  it('managers run operations but not money settings or payroll', () => {
    expect(can(manager, 'leads:manage')).toBe(true)
    expect(can(manager, 'invoices:manage')).toBe(true)
    expect(can(manager, 'jobs:view_all')).toBe(true)
    expect(can(manager, 'reports:view')).toBe(false)
    expect(can(manager, 'pay_rates:view')).toBe(false)
    expect(can(manager, 'team:manage')).toBe(false)
    expect(can(manager, 'settings:manage')).toBe(false)
  })
  it('crew only sees assigned work and can add photos/receipts', () => {
    expect(can(crew, 'jobs:view_assigned')).toBe(true)
    expect(can(crew, 'jobs:add_photos')).toBe(true)
    expect(can(crew, 'expenses:add')).toBe(true)
    expect(can(crew, 'jobs:view_all')).toBe(false)
    expect(can(crew, 'invoices:manage')).toBe(false)
    expect(can(crew, 'leads:manage')).toBe(false)
    expect(can(crew, 'job_profit:view')).toBe(false)
  })
  it('nobody without a session', () => {
    expect(can(null, 'dashboard:view')).toBe(false)
  })
})

describe('toE164', () => {
  it('normalizes US numbers', () => {
    expect(toE164('(555) 555-0123')).toBe('+15555550123')
    expect(toE164('1-555-555-0123')).toBe('+15555550123')
    expect(toE164('+44 20 7946 0958')).toBe('+442079460958')
    expect(toE164('555-0123')).toBeNull()
  })
})
