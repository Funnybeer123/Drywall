type Cell = string | number | null | undefined

function cell(v: Cell): string {
  if (v == null) return ''
  let s = String(v)
  // Neutralize spreadsheet formula injection in free-text fields (numbers are left alone).
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** RFC 4180 CSV with a BOM so Excel opens UTF-8 (e.g. "Lowe's", "—") correctly. */
export function toCsv(header: string[], rows: Cell[][]): string {
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n'
}
