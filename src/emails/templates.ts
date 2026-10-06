import type { Settings } from '@/db/schema'
import { escapeHtml as e, formatPhone } from '@/lib/utils'

type Row = [label: string, value: string | null | undefined]

/** Shared, email-client-safe layout (tables + inline styles). */
export function layout(
  s: Settings,
  opts: { preheader?: string; heading: string; paragraphs?: string[]; rows?: Row[]; cta?: { label: string; url: string }; footerNote?: string },
): { html: string; text: string } {
  const accent = s.accentColor || '#ea580c'
  const paras = (opts.paragraphs ?? []).map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#334155">${e(p)}</p>`).join('')
  const rows = (opts.rows ?? [])
    .filter(([, v]) => v)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;color:#64748b;font-size:13px;width:140px;vertical-align:top">${e(k)}</td><td style="padding:8px 0;color:#0f172a;font-size:14px;white-space:pre-wrap">${e(v!)}</td></tr>`,
    )
    .join('')
  const cta = opts.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 8px"><tr><td style="background:${accent};border-radius:8px"><a href="${e(opts.cta.url)}" style="display:inline-block;padding:13px 22px;color:#fff;text-decoration:none;font-weight:600;font-size:15px">${e(opts.cta.label)}</a></td></tr></table>`
    : ''

  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden">${e(opts.preheader ?? '')}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0f172a;padding:18px 28px;color:#fff;font-weight:700;font-size:17px;border-bottom:4px solid ${accent}">${e(s.businessName)}</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:21px;color:#0f172a">${e(opts.heading)}</h1>
${paras}
${rows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;margin-top:8px">${rows}</table>` : ''}
${cta}
${opts.footerNote ? `<p style="margin:18px 0 0;font-size:13px;color:#64748b">${e(opts.footerNote)}</p>` : ''}
</td></tr>
<tr><td style="padding:16px 28px;background:#f8fafc;color:#64748b;font-size:12px">${e(s.businessName)} · ${e(formatPhone(s.phone))} · ${e(s.email)}${s.licenseNumber ? ` · Lic. ${e(s.licenseNumber)}` : ''}</td></tr>
</table></td></tr></table></body></html>`

  const text = [
    opts.heading,
    '',
    ...(opts.paragraphs ?? []),
    ...(opts.rows ?? []).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`),
    ...(opts.cta ? ['', `${opts.cta.label}: ${opts.cta.url}`] : []),
    ...(opts.footerNote ? ['', opts.footerNote] : []),
    '',
    `— ${s.businessName} · ${formatPhone(s.phone)}`,
  ].join('\n')

  return { html, text }
}
