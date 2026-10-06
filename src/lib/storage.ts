import 'server-only'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { put } from '@vercel/blob'
import { newToken } from './utils'
import { ValidationError } from './action-state'

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
const ALLOWED = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/heic', 'heic'],
  ['application/pdf', 'pdf'],
])

export class UploadError extends ValidationError {}

/**
 * Saves an uploaded photo/receipt and returns its public URL.
 * Uses Vercel Blob in production, or public/uploads/ locally.
 */
export async function saveUpload(file: File, folder: 'leads' | 'gallery' | 'projects' | 'receipts' | 'branding') {
  const ext = ALLOWED.get(file.type)
  if (!ext) throw new UploadError('Only JPG, PNG, WebP, HEIC images or PDF files are allowed.')
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError('File is too large (8 MB max).')

  const name = `${folder}/${Date.now()}-${newToken().slice(0, 10)}.${ext}`

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(name, file, { access: 'public', contentType: file.type })
    return blob.url
  }
  if (process.env.VERCEL) {
    throw new UploadError('File storage is not configured (set BLOB_READ_WRITE_TOKEN).')
  }
  const dest = path.join(process.cwd(), 'public', 'uploads', name)
  await mkdir(path.dirname(dest), { recursive: true })
  await writeFile(dest, Buffer.from(await file.arrayBuffer()))
  return `/uploads/${name}`
}

/** Pulls non-empty File entries out of a form field. */
export function filesFrom(formData: FormData, field: string): File[] {
  return formData.getAll(field).filter((f): f is File => f instanceof File && f.size > 0)
}
