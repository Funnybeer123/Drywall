import { getCurrentUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { estimatePdfResponse } from '../../pdf-response'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  if (!can(user, 'estimates:manage')) return new Response('Forbidden', { status: 403 })
  const id = Number((await ctx.params).id)
  if (!Number.isInteger(id) || id <= 0) return new Response('Not found', { status: 404 })
  return estimatePdfResponse({ id })
}
