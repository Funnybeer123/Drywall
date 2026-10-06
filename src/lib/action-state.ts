export type ActionState = { ok?: boolean; error?: string; message?: string }

/** Reads a trimmed string field; empty → null. */
export function str(fd: FormData, key: string): string | null {
  const v = fd.get(key)
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t === '' ? null : t
}

export function reqStr(fd: FormData, key: string, label: string): string {
  const v = str(fd, key)
  if (!v) throw new ValidationError(`${label} is required.`)
  return v
}

export function int(fd: FormData, key: string): number | null {
  const v = str(fd, key)
  if (v == null) return null
  const n = Number(v)
  return Number.isInteger(n) ? n : null
}

export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key)
  return v === 'on' || v === 'true' || v === '1'
}

export class ValidationError extends Error {}

/** Parses the hidden `items` JSON field submitted by <LineItemsEditor>. */
export function lineItems(fd: FormData): { description: string; quantity: number; unitPriceCents: number }[] {
  let raw: unknown
  try {
    raw = JSON.parse(String(fd.get('items') ?? '[]'))
  } catch {
    throw new ValidationError('Line items could not be read.')
  }
  if (!Array.isArray(raw)) throw new ValidationError('Line items could not be read.')
  const items = raw
    .map((r) => ({
      description: String(r?.description ?? '').trim().slice(0, 500),
      quantity: Number(r?.quantity),
      unitPriceCents: Math.round(Number(r?.unitPriceCents)),
    }))
    .filter((r) => r.description)
  if (items.some((r) => !Number.isFinite(r.quantity) || !Number.isFinite(r.unitPriceCents))) {
    throw new ValidationError('Each line needs a valid quantity and price.')
  }
  if (items.length === 0) throw new ValidationError('Add at least one line item.')
  return items
}

export function taxBps(fd: FormData): number {
  const n = Number(fd.get('taxRateBps'))
  return Number.isFinite(n) && n >= 0 && n <= 5000 ? Math.round(n) : 0
}

/** Wraps a server action body so ValidationErrors become inline form messages. */
export async function guard(fn: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    return (await fn()) ?? { ok: true }
  } catch (e) {
    if (e instanceof ValidationError) return { error: e.message }
    // Let Next.js redirect()/notFound() propagate.
    throw e
  }
}
