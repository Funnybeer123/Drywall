'use client'

import { useState, type ChangeEvent } from 'react'
import { ImagePlus, X } from 'lucide-react'

const MAX_EDGE = 1800

/** Shrinks a phone photo (often 4–8 MB) to a ~300 KB JPEG before upload. */
async function compress(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/heic') return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.82))
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

/**
 * File input that compresses images client-side and shows thumbnails.
 * Works inside a normal <form> — the compressed files are what get submitted.
 */
export function PhotoInput({
  name,
  multiple = true,
  max = 6,
  accept = 'image/*',
  label = 'Add photos',
}: {
  name: string
  multiple?: boolean
  max?: number
  accept?: string
  label?: string
}) {
  const [previews, setPreviews] = useState<{ url: string; name: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [inputKey, setInputKey] = useState(0)

  async function onChange(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget
    const picked = Array.from(input.files ?? []).slice(0, max)
    setBusy(true)
    const files = await Promise.all(picked.map(compress))
    const dt = new DataTransfer()
    files.forEach((f) => dt.items.add(f))
    input.files = dt.files
    setPreviews(files.map((f) => ({ url: f.type.startsWith('image/') ? URL.createObjectURL(f) : '', name: f.name })))
    setBusy(false)
  }

  function clear() {
    setPreviews([])
    setInputKey((k) => k + 1)
  }

  return (
    <div>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm font-medium text-slate-600 transition hover:border-brand hover:text-brand-fg">
        <ImagePlus className="size-5" />
        {busy ? 'Preparing…' : label}
        <input key={inputKey} type="file" name={name} accept={accept} multiple={multiple} onChange={onChange} className="sr-only" />
      </label>
      {previews.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {previews.map((p, i) =>
            p.url ? (
              <img key={i} src={p.url} alt="" className="size-16 rounded-md object-cover ring-1 ring-slate-200" />
            ) : (
              <span key={i} className="rounded-md bg-slate-100 px-2 py-1 text-xs">
                {p.name}
              </span>
            ),
          )}
          <button type="button" onClick={clear} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-red-600">
            <X className="size-3" /> Clear
          </button>
        </div>
      ) : null}
    </div>
  )
}
