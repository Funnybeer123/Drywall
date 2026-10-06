import { describe, expect, it } from 'vitest'
import { computeProfit, computeTotals, formatCents, formatPercentBps, laborCost, lineTotal, parseDollars } from '@/lib/money'

describe('parseDollars', () => {
  it('parses common formats to cents', () => {
    expect(parseDollars('1,234.56')).toBe(123456)
    expect(parseDollars('$99')).toBe(9900)
    expect(parseDollars(' 0.1 ')).toBe(10)
    expect(parseDollars('12.345')).toBe(1235)
  })
  it('rejects junk', () => {
    expect(parseDollars('')).toBeNull()
    expect(parseDollars('abc')).toBeNull()
    expect(parseDollars('1.2.3')).toBeNull()
    expect(parseDollars(null)).toBeNull()
  })
})

describe('totals', () => {
  it('computes line totals with fractional quantities', () => {
    expect(lineTotal({ quantity: 2.5, unitPriceCents: 6500 })).toBe(16250)
    expect(lineTotal({ quantity: 900, unitPriceCents: 250 })).toBe(225000)
  })
  it('applies tax in basis points and rounds once', () => {
    const t = computeTotals(
      [
        { quantity: 1, unitPriceCents: 10000 },
        { quantity: 3, unitPriceCents: 333 },
      ],
      825,
    )
    expect(t.subtotalCents).toBe(10999)
    expect(t.taxCents).toBe(907) // 10999 * 0.0825 = 907.4
    expect(t.totalCents).toBe(11906)
  })
  it('handles no items', () => {
    expect(computeTotals([], 825)).toEqual({ subtotalCents: 0, taxCents: 0, totalCents: 0 })
  })
})

describe('profit', () => {
  it('subtracts materials and labor from revenue', () => {
    const p = computeProfit({ revenueCents: 840000, expenseCents: 210900, laborCents: laborCost(32, 2400) + laborCost(12, 3200) })
    expect(p.costCents).toBe(210900 + 76800 + 38400)
    expect(p.profitCents).toBe(840000 - 326100)
    expect(p.marginPct).toBeCloseTo(61.18, 1)
  })
  it('has no margin with zero revenue', () => {
    expect(computeProfit({ revenueCents: 0, expenseCents: 500, laborCents: 0 }).marginPct).toBeNull()
  })
})

describe('formatting', () => {
  it('formats cents and percents', () => {
    expect(formatCents(123456)).toBe('$1,234.56')
    expect(formatCents(-500)).toBe('-$5.00')
    expect(formatPercentBps(825)).toBe('8.25%')
    expect(formatPercentBps(700)).toBe('7%')
  })
})
