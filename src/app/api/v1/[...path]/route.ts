import { NextResponse } from 'next/server'
import { ApiError, authenticate, execute, matchRoute, openApiSpec, splitToolArgs, toApiError, toolDefinitions } from '@/lib/api/framework'
import { OPERATIONS } from '@/lib/api/ops'
import { appUrl, getSettings } from '@/lib/settings'

/**
 * REST API for the AI assistant (and any other integration), all under /api/v1:
 *   GET  /api/v1/openapi.json  — OpenAPI 3.1 spec (no key needed)
 *   GET  /api/v1/tools         — tool definitions for Grok / OpenAI-style function calling
 *   POST /api/v1/tools/call    — run a tool: { "name": "...", "arguments": {...} }
 *   ...plus one REST endpoint per operation (see the spec).
 */

type Ctx = { params: Promise<{ path: string[] }> }

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } })

const errorResponse = (e: unknown) => {
  const err = toApiError(e)
  return json({ error: { code: err.code, message: err.message, details: err.details } }, err.status)
}

async function readBody(req: Request) {
  if (req.method === 'GET' || req.method === 'DELETE') return {}
  const text = await req.text()
  if (!text.trim()) return {}
  try {
    return JSON.parse(text)
  } catch {
    throw new ApiError(400, 'invalid_json', 'Request body must be JSON.')
  }
}

async function handle(req: Request, { params }: Ctx) {
  const path = '/' + (await params).path.join('/')
  const method = req.method
  try {
    // Public: the spec describes the API but grants nothing.
    if (method === 'GET' && path === '/openapi.json') {
      const s = await getSettings()
      return json(openApiSpec(OPERATIONS, appUrl('/api/v1'), s.businessName))
    }

    const ctx = await authenticate(req)

    if (method === 'GET' && path === '/tools') {
      const allowed = OPERATIONS.filter((o) => ctx.scopes.includes(o.scope))
      return json({ tools: toolDefinitions(allowed) })
    }

    if (method === 'POST' && path === '/tools/call') {
      const body = await readBody(req)
      const o = OPERATIONS.find((x) => x.id === body?.name)
      if (!o) throw new ApiError(404, 'unknown_tool', `No tool named "${body?.name}".`)
      let args = body.arguments ?? {}
      if (typeof args === 'string') {
        try {
          args = args.trim() ? JSON.parse(args) : {}
        } catch {
          throw new ApiError(400, 'invalid_json', 'Tool arguments must be a JSON object.')
        }
      }
      const result = await execute(o, ctx, splitToolArgs(o, args))
      return json({ ok: true, result })
    }

    const match = matchRoute(OPERATIONS, method, path)
    if (!match) throw new ApiError(404, 'no_route', `No endpoint ${method} /api/v1${path}. See /api/v1/openapi.json.`)
    const url = new URL(req.url)
    const query = Object.fromEntries(url.searchParams.entries())
    const result = await execute(match.op, ctx, { params: match.params, query, body: await readBody(req) })
    return json(result)
  } catch (e) {
    return errorResponse(e)
  }
}

export const GET = handle
export const POST = handle
export const PATCH = handle
export const DELETE = handle
export const dynamic = 'force-dynamic'
