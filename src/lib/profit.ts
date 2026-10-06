import 'server-only'
import { and, inArray, isNotNull, sql } from 'drizzle-orm'
import { db } from '@/db'
import { expenses, invoices, laborEntries, projects } from '@/db/schema'
import { computeProfit } from './money'

export type ProjectFinancials = {
  projectId: number
  quotedCents: number
  invoicedCents: number // pre-tax, excludes draft & void invoices
  collectedCents: number
  expenseCents: number
  laborCents: number
  costCents: number
  profitCents: number // based on invoiced revenue, or the quote if nothing invoiced yet
  marginPct: number | null
  projected: boolean // true when profit is based on the quote
}

/** Revenue, costs and profit per job. Pass ids to limit, or omit for all jobs. */
export async function getProjectFinancials(projectIds?: number[]): Promise<Map<number, ProjectFinancials>> {
  if (projectIds && projectIds.length === 0) return new Map()
  const projFilter = projectIds ? inArray(projects.id, projectIds) : undefined

  const [projRows, invRows, expRows, labRows] = await Promise.all([
    db.select({ id: projects.id, quotedCents: projects.quotedCents }).from(projects).where(projFilter),
    db
      .select({
        projectId: invoices.projectId,
        // pre-tax share of what's invoiced; collected is capped at the invoice total
        invoiced: sql<number>`coalesce(sum(${invoices.subtotalCents}), 0)::int`,
        collected: sql<number>`coalesce(sum(least(${invoices.paidCents}, ${invoices.totalCents})), 0)::int`,
      })
      .from(invoices)
      .where(
        and(
          inArray(invoices.status, ['sent', 'partial', 'paid']),
          projectIds ? inArray(invoices.projectId, projectIds) : undefined,
        ),
      )
      .groupBy(invoices.projectId),
    db
      .select({ projectId: expenses.projectId, total: sql<number>`coalesce(sum(${expenses.amountCents}), 0)::int` })
      .from(expenses)
      .where(projectIds ? inArray(expenses.projectId, projectIds) : isNotNull(expenses.projectId))
      .groupBy(expenses.projectId),
    db
      .select({
        projectId: laborEntries.projectId,
        total: sql<number>`coalesce(sum(round(${laborEntries.hours} * ${laborEntries.rateCents})), 0)::int`,
      })
      .from(laborEntries)
      .where(projectIds ? inArray(laborEntries.projectId, projectIds) : undefined)
      .groupBy(laborEntries.projectId),
  ])

  const inv = new Map(invRows.map((r) => [r.projectId, r]))
  const exp = new Map(expRows.map((r) => [r.projectId, r.total]))
  const lab = new Map(labRows.map((r) => [r.projectId, r.total]))

  const out = new Map<number, ProjectFinancials>()
  for (const p of projRows) {
    const invoicedCents = inv.get(p.id)?.invoiced ?? 0
    const collectedCents = inv.get(p.id)?.collected ?? 0
    const expenseCents = exp.get(p.id) ?? 0
    const laborCents = lab.get(p.id) ?? 0
    const projected = invoicedCents === 0
    const revenueCents = projected ? p.quotedCents : invoicedCents
    const { costCents, profitCents, marginPct } = computeProfit({ revenueCents, expenseCents, laborCents })
    out.set(p.id, {
      projectId: p.id,
      quotedCents: p.quotedCents,
      invoicedCents,
      collectedCents,
      expenseCents,
      laborCents,
      costCents,
      profitCents,
      marginPct,
      projected,
    })
  }
  return out
}
