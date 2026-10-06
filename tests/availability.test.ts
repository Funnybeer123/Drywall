import { describe, expect, it } from 'vitest'
import { computeAvailability, nextAvailable, parseWorkDays } from '@/lib/availability'

// 2026-10-05 is a Monday
const base = { from: '2026-10-05', days: 7, capacity: 1, workDays: [1, 2, 3, 4, 5], jobs: [], blocks: [] }

describe('computeAvailability', () => {
  it('marks weekends closed and weekdays open when nothing is booked', () => {
    const days = computeAvailability(base)
    expect(days.map((d) => d.status)).toEqual(['open', 'open', 'open', 'open', 'open', 'closed', 'closed'])
  })

  it('books days covered by an active job (inclusive range)', () => {
    const days = computeAvailability({
      ...base,
      jobs: [{ startDate: '2026-10-06', endDate: '2026-10-07', status: 'scheduled' }],
    })
    expect(days.slice(0, 4).map((d) => d.status)).toEqual(['open', 'booked', 'booked', 'open'])
  })

  it('ignores pending/completed/cancelled jobs', () => {
    const days = computeAvailability({
      ...base,
      jobs: [
        { startDate: '2026-10-05', endDate: '2026-10-09', status: 'pending' },
        { startDate: '2026-10-05', endDate: '2026-10-09', status: 'cancelled' },
        { startDate: '2026-10-05', endDate: '2026-10-09', status: 'completed' },
      ],
    })
    expect(days[0].status).toBe('open')
  })

  it('shows limited when some but not all crews are busy', () => {
    const days = computeAvailability({
      ...base,
      capacity: 2,
      jobs: [
        { startDate: '2026-10-05', endDate: null, status: 'in_progress' },
        { startDate: '2026-10-06', endDate: '2026-10-06', status: 'scheduled' },
        { startDate: '2026-10-06', endDate: '2026-10-06', status: 'scheduled' },
      ],
    })
    expect(days[0].status).toBe('limited') // single-day job with no end date
    expect(days[1].status).toBe('booked')
  })

  it('company-wide blocks book the day; individual time off does not', () => {
    const days = computeAvailability({
      ...base,
      blocks: [
        { startDate: '2026-10-08', endDate: '2026-10-09', userId: null },
        { startDate: '2026-10-05', endDate: '2026-10-05', userId: 7 },
      ],
    })
    expect(days[0].status).toBe('open')
    expect(days[3].status).toBe('booked')
    expect(days[4].status).toBe('booked')
  })

  it('finds the next available day', () => {
    const days = computeAvailability({ ...base, jobs: [{ startDate: '2026-10-05', endDate: '2026-10-07', status: 'scheduled' }] })
    expect(nextAvailable(days)).toBe('2026-10-08')
  })
})

describe('parseWorkDays', () => {
  it('parses and filters', () => {
    expect(parseWorkDays('1, 2,3,9,x,6')).toEqual([1, 2, 3, 6])
  })
})
