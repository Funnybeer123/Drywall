// Generates simple SVG placeholder photos for the demo gallery (public/placeholder/).
// Willie replaces these with real job photos from Admin → Website content.
import { mkdirSync, writeFileSync } from 'node:fs'

export const PLACEHOLDERS = [
  { file: 'living-room.svg', label: 'Living room — hang & finish', a: '#e2e8f0', b: '#cbd5e1' },
  { file: 'kitchen-ceiling.svg', label: 'Kitchen ceiling — smooth Level 5', a: '#f1f5f9', b: '#e2e8f0' },
  { file: 'basement.svg', label: 'Basement finish', a: '#e7e5e4', b: '#d6d3d1' },
  { file: 'water-damage-before.svg', label: 'Water damage — before', a: '#d6d3d1', b: '#a8a29e', stain: true },
  { file: 'water-damage-after.svg', label: 'Water damage — after', a: '#f5f5f4', b: '#e7e5e4' },
  { file: 'knockdown.svg', label: 'Knockdown texture', a: '#f1f5f9', b: '#cbd5e1', dots: true },
  { file: 'commercial.svg', label: 'Commercial office build-out', a: '#e2e8f0', b: '#94a3b8' },
  { file: 'patch-before.svg', label: 'Wall patch — before', a: '#e5e7eb', b: '#9ca3af', hole: true },
  { file: 'patch-after.svg', label: 'Wall patch — after', a: '#f3f4f6', b: '#e5e7eb' },
]

function svg(p: (typeof PLACEHOLDERS)[number]) {
  const seams = Array.from({ length: 5 }, (_, i) => `<line x1="${(i + 1) * 200}" y1="0" x2="${(i + 1) * 200}" y2="560" stroke="#0f172a" stroke-opacity=".05" stroke-width="2"/>`).join('')
  const dots = p.dots
    ? Array.from({ length: 140 }, (_, i) => `<ellipse cx="${(i * 97) % 1200}" cy="${(i * 53) % 560}" rx="${14 + (i % 5) * 4}" ry="${9 + (i % 3) * 3}" fill="#fff" fill-opacity=".55"/>`).join('')
    : ''
  const stain = p.stain ? `<ellipse cx="620" cy="140" rx="260" ry="120" fill="#78716c" fill-opacity=".35"/><ellipse cx="640" cy="130" rx="170" ry="70" fill="#57534e" fill-opacity=".3"/>` : ''
  const hole = p.hole ? `<path d="M560 230 l40 -20 l35 30 l-10 45 l-45 15 l-30 -35z" fill="#475569" fill-opacity=".75"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.a}"/><stop offset="1" stop-color="${p.b}"/></linearGradient>
<linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a16207" stop-opacity=".25"/><stop offset="1" stop-color="#713f12" stop-opacity=".35"/></linearGradient></defs>
<rect width="1200" height="800" fill="url(#g)"/>${seams}${dots}${stain}${hole}
<rect y="560" width="1200" height="240" fill="url(#f)"/><rect y="556" width="1200" height="10" fill="#fff" fill-opacity=".9"/>
<rect x="760" y="140" width="300" height="300" fill="#fff" fill-opacity=".5" stroke="#fff" stroke-width="10"/>
<text x="40" y="760" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="700" fill="#0f172a" fill-opacity=".55">${p.label.replace(/&/g, "&amp;")}</text>
<text x="40" y="60" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="#0f172a" fill-opacity=".35">SAMPLE PHOTO — replace in Admin → Website content</text>
</svg>`
}

export function writePlaceholders() {
  mkdirSync('public/placeholder', { recursive: true })
  for (const p of PLACEHOLDERS) writeFileSync(`public/placeholder/${p.file}`, svg(p))
}
