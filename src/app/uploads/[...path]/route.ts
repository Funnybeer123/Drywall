import { readFile } from 'node:fs/promises'
import path from 'node:path'

const TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  pdf: 'application/pdf',
}

/** Serves uploads saved under DATA_DIR/uploads (self-hosted only; see lib/storage.ts). */
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const dataDir = process.env.DATA_DIR
  if (!dataDir) return new Response('Not found', { status: 404 })

  const root = path.resolve(dataDir, 'uploads')
  const file = path.resolve(root, ...(await ctx.params).path)
  const type = TYPES[path.extname(file).slice(1).toLowerCase()]
  if (!file.startsWith(root + path.sep) || !type) return new Response('Not found', { status: 404 })

  try {
    const body = await readFile(file)
    return new Response(body, {
      headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable' },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
