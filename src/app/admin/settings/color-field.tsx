'use client'

import { useState } from 'react'

const HEX_RE = /^#[0-9a-fA-F]{6}$/

/** Color picker + hex text box kept in sync, with a live button preview. */
export function ColorField({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [value, setValue] = useState(defaultValue)
  const valid = HEX_RE.test(value)
  const swatch = valid ? value : '#ea580c'

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="color"
        value={swatch}
        onChange={(e) => setValue(e.target.value)}
        className="h-10 w-14 cursor-pointer rounded-lg border-0 bg-white p-1 ring-1 ring-slate-300 ring-inset"
        aria-label="Pick accent color"
      />
      <input
        name={name}
        value={value}
        onChange={(e) => {
          const v = e.target.value.trim()
          setValue(v && !v.startsWith('#') ? `#${v}` : v)
        }}
        maxLength={7}
        spellCheck={false}
        className={`block h-10 w-32 rounded-lg border-0 bg-white px-3 font-mono text-sm shadow-sm ring-1 ring-inset focus:ring-2 focus:outline-none ${
          valid ? 'ring-slate-300 focus:ring-brand' : 'ring-red-400 focus:ring-red-500'
        }`}
        aria-label="Accent color hex code"
        aria-invalid={!valid}
      />
      <span className="inline-flex h-10 items-center rounded-lg px-4 text-sm font-semibold text-white shadow-sm" style={{ background: swatch }}>
        Get a free quote
      </span>
      {!valid ? <span className="text-xs text-red-600">Use 6-digit hex, like #ea580c</span> : null}
    </div>
  )
}
