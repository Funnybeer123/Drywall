// All money is stored as integer cents to avoid floating-point rounding errors.

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

export function formatCents(cents: number | null | undefined): string {
  return usd.format((cents ?? 0) / 100)
}

/** "1,234.5" / "$1234.50" / "" → cents. Returns null when not a valid amount. */
export function parseDollars(input: string | null | undefined): number | null {
  if (input == null) return null
  const cleaned = String(input).replace(/[$,\s]/g, '')
  if (cleaned === '' || !/^-?\d*(\.\d*)?$/.test(cleaned)) return null
  const value = Number(cleaned)
  if (!Number.isFinite(value)) return null
  return Math.round(value * 100)
}

export function centsToInput(cents: number | null | undefined): string {
  return ((cents ?? 0) / 100).toFixed(2)
}

export type LineItem = { description: string; quantity: number; unitPriceCents: number }

export function lineTotal(item: Pick<LineItem, 'quantity' | 'unitPriceCents'>): number {
  return Math.round(item.quantity * item.unitPriceCents)
}

/** Tax rate is stored in basis points: 825 = 8.25%. */
export function computeTotals(items: Pick<LineItem, 'quantity' | 'unitPriceCents'>[], taxRateBps: number) {
  const subtotalCents = items.reduce((sum, i) => sum + lineTotal(i), 0)
  const taxCents = Math.round((subtotalCents * taxRateBps) / 10_000)
  return { subtotalCents, taxCents, totalCents: subtotalCents + taxCents }
}

export function formatPercentBps(bps: number): string {
  return `${(bps / 100).toFixed(2).replace(/\.?0+$/, '')}%`
}

/** Job profit: revenue minus materials/expenses and labor. Margin is a percentage of revenue. */
export function computeProfit(input: { revenueCents: number; expenseCents: number; laborCents: number }) {
  const costCents = input.expenseCents + input.laborCents
  const profitCents = input.revenueCents - costCents
  const marginPct = input.revenueCents > 0 ? (profitCents / input.revenueCents) * 100 : null
  return { costCents, profitCents, marginPct }
}

export function laborCost(hours: number, rateCents: number): number {
  return Math.round(hours * rateCents)
}
