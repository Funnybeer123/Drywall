import 'server-only'
import { notFound } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { int, ValidationError } from '@/lib/action-state'
import { filesFrom, saveUpload } from '@/lib/storage'

/** Content changes show on the public site, so refresh every page. */
export function revalidateContent() {
  revalidatePath('/', 'layout')
}

export function sortValue(fd: FormData): number {
  const n = int(fd, 'sort') ?? 0
  if (n < -10_000 || n > 10_000) throw new ValidationError('Sort order must be between -10000 and 10000.')
  return n
}

export function clip(v: string | null, max: number): string | null {
  return v == null ? null : v.slice(0, max)
}

/** Saves an optional single image upload for the public website. */
export async function websiteImage(fd: FormData, field: string): Promise<string | null> {
  const [file] = filesFrom(fd, field)
  if (!file) return null
  if (!file.type.startsWith('image/')) throw new ValidationError('Please upload a photo (JPG, PNG or WebP).')
  if (file.type === 'image/heic') {
    throw new ValidationError("HEIC photos can't be shown on most browsers. Please upload a JPG or PNG (on iPhone, choose “Most Compatible” in Camera settings).")
  }
  return saveUpload(file, 'gallery')
}

/** `[id]` route segment: "new" or a numeric id. */
export function parseIdParam(id: string): number | 'new' {
  if (id === 'new') return 'new'
  const n = Number(id)
  if (!Number.isInteger(n) || n <= 0) notFound()
  return n
}
