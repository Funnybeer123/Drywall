import 'server-only'
import { z } from 'zod'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { apiAuditLog, apiKeys, users } from '@/db/schema'
import type { SessionUser } from '@/lib/auth'
import { can, type Permission } from '@/lib/permissions'
import { rateLimit } from '@/lib/rate-limit'
import { ValidationError } from '@/lib/action-state'
import { hashApiKey, type ApiScope } from './keys'

/**
 * Tiny API framework: every operation is declared once (path, scope, permission,
 * zod schemas, handler). From that one list we serve the REST endpoints, the
 * OpenAPI spec, the AI tool definitions and the generic tool-call endpoint.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message)
  }
}
export const notFound = (what: string) => new ApiError(404, 'not_found', `${what} not found.`)
export const badRequest = (message: string) => new ApiError(400, 'bad_request', message)

type Shape = z.ZodRawShape
export type ApiContext = { user: SessionUser; keyId: number; scopes: string[] }

export type Operation = {
  id: string
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string // e.g. '/jobs/{id}'
  scope: ApiScope
  permission: Permission
  summary: string
  description?: string
  tag: string
  params?: z.ZodObject<Shape>
  query?: z.ZodObject<Shape>
  body?: z.ZodObject<Shape>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run: (input: { params: any; query: any; body: any; ctx: ApiContext }) => Promise<unknown>
}

/** Declare an operation with typed handler inputs. */
export function op<P extends Shape = Shape, Q extends Shape = Shape, B extends Shape = Shape>(o: {
  id: string
  method: Operation['method']
  path: string
  scope: ApiScope
  permission: Permission
  summary: string
  description?: string
  tag: string
  params?: z.ZodObject<P>
  query?: z.ZodObject<Q>
  body?: z.ZodObject<B>
  run: (input: {
    params: z.infer<z.ZodObject<P>>
    query: z.infer<z.ZodObject<Q>>
    body: z.infer<z.ZodObject<B>>
    ctx: ApiContext
  }) => Promise<unknown>
}): Operation {
  return o as unknown as Operation
}

// ---------- Auth ----------

export async function authenticate(req: Request): Promise<ApiContext> {
  const header = req.headers.get('authorization') ?? ''
  const key = header.startsWith('Bearer ') ? header.slice(7).trim() : (req.headers.get('x-api-key') ?? '').trim()
  if (!key) throw new ApiError(401, 'unauthorized', 'Missing API key. Send `Authorization: Bearer <key>`.')
  const [row] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, hashApiKey(key)), isNull(apiKeys.revokedAt)))
  if (!row) throw new ApiError(401, 'unauthorized', 'Invalid or revoked API key.')
  const [u] = await db.select().from(users).where(eq(users.id, row.userId))
  if (!u || !u.active) throw new ApiError(401, 'unauthorized', 'The user this key belongs to is inactive.')
  if (!rateLimit(`api:${row.id}`, 120, 60_000)) throw new ApiError(429, 'rate_limited', 'Too many requests — slow down (120/minute).')
  db.update(apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(apiKeys.id, row.id))
    .catch(() => {})
  return {
    keyId: row.id,
    scopes: row.scopes,
    user: { id: u.id, name: u.name, email: u.email, role: u.role, phone: u.phone },
  }
}

function authorize(o: Operation, ctx: ApiContext) {
  if (!ctx.scopes.includes(o.scope)) {
    throw new ApiError(403, 'missing_scope', `This API key doesn't have the "${o.scope}" scope needed for ${o.id}.`)
  }
  if (!can(ctx.user, o.permission)) {
    throw new ApiError(403, 'forbidden', `The key's user (${ctx.user.role}) isn't allowed to ${o.permission}.`)
  }
}

// ---------- Running an operation ----------

function parse<T>(schema: z.ZodType<T> | undefined, value: unknown, where: string): T {
  if (!schema) return {} as T
  const r = schema.safeParse(value ?? {})
  if (!r.success) {
    const msg = r.error.issues.map((i) => `${[where, ...i.path].join('.')}: ${i.message}`).join('; ')
    throw new ApiError(400, 'invalid_input', msg, r.error.issues)
  }
  return r.data
}

export async function execute(o: Operation, ctx: ApiContext, raw: { params?: unknown; query?: unknown; body?: unknown }) {
  // Everything inside try so blocked/invalid attempts show up in the activity log too.
  try {
    authorize(o, ctx)
    const input = {
      params: parse(o.params, raw.params, 'path'),
      query: parse(o.query, raw.query, 'query'),
      body: parse(o.body, raw.body, 'body'),
    }
    const result = await o.run({ ...input, ctx })
    if (o.method !== 'GET') await audit(ctx.keyId, o, 200, describe(raw))
    return result
  } catch (e) {
    const err = toApiError(e)
    await audit(ctx.keyId, o, err.status, err.message)
    throw err
  }
}

export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e
  if (e instanceof ValidationError) return new ApiError(400, 'invalid_input', e.message)
  console.error('API error', e)
  return new ApiError(500, 'server_error', 'Something went wrong on the server.')
}

function describe(raw: { params?: unknown; body?: unknown }) {
  const s = JSON.stringify({ ...(raw.params as object), ...(raw.body as object) }, (k, v) =>
    k === 'dataBase64' ? `[${String(v).length} chars]` : v,
  )
  return s.length > 500 ? s.slice(0, 497) + '…' : s
}

async function audit(keyId: number, o: Operation, status: number, summary: string) {
  await db
    .insert(apiAuditLog)
    .values({ keyId, operation: o.id, method: o.method, path: o.path, status, summary })
    .catch((e) => console.error('audit log failed', e))
}

// ---------- Routing ----------

export function matchRoute(ops: Operation[], method: string, path: string) {
  for (const o of ops) {
    if (o.method !== method) continue
    const names: string[] = []
    const re = new RegExp('^' + o.path.replace(/\{(\w+)\}/g, (_, n) => (names.push(n), '([^/]+)')) + '/?$')
    const m = path.match(re)
    if (m) return { op: o, params: Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(m[i + 1])])) }
  }
  return null
}

// ---------- Tools (for Grok / any OpenAI-compatible function calling) ----------

function shapeOf(o: Operation): Shape {
  return { ...(o.params?.shape ?? {}), ...(o.query?.shape ?? {}), ...(o.body?.shape ?? {}) }
}

function jsonSchema(schema: z.ZodType) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { $schema, ...rest } = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as Record<string, unknown>
  return rest
}

export function toolDefinitions(ops: Operation[]) {
  return ops.map((o) => ({
    type: 'function' as const,
    function: {
      name: o.id,
      description: [o.summary, o.description].filter(Boolean).join(' '),
      parameters: jsonSchema(z.object(shapeOf(o))),
    },
  }))
}

/** Splits flat tool-call arguments back into path params / query / body. */
export function splitToolArgs(o: Operation, args: Record<string, unknown>) {
  const pick = (s?: z.ZodObject<Shape>) =>
    s ? Object.fromEntries(Object.keys(s.shape).filter((k) => k in args).map((k) => [k, args[k]])) : {}
  return { params: pick(o.params), query: pick(o.query), body: pick(o.body) }
}

// ---------- OpenAPI ----------

export function openApiSpec(ops: Operation[], baseUrl: string, title: string) {
  const paths: Record<string, Record<string, unknown>> = {}
  for (const o of ops) {
    const parameters = [
      ...Object.keys(o.params?.shape ?? {}).map((name) => ({
        name,
        in: 'path',
        required: true,
        schema: jsonSchema(o.params!.shape[name] as z.ZodType),
      })),
      ...Object.entries(o.query?.shape ?? {}).map(([name, s]) => ({
        name,
        in: 'query',
        required: !(s as z.ZodType).safeParse(undefined).success,
        schema: jsonSchema(s as z.ZodType),
        description: (s as z.ZodType).description,
      })),
    ]
    paths[o.path] ??= {}
    paths[o.path][o.method.toLowerCase()] = {
      operationId: o.id,
      summary: o.summary,
      description: [o.description, `Requires scope: \`${o.scope}\`.`].filter(Boolean).join('\n\n'),
      tags: [o.tag],
      parameters,
      ...(o.body ? { requestBody: { required: true, content: { 'application/json': { schema: jsonSchema(o.body) } } } } : {}),
      responses: {
        '200': { description: 'OK', content: { 'application/json': { schema: { type: 'object' } } } },
        '400': { description: 'Invalid input' },
        '401': { description: 'Missing or invalid API key' },
        '403': { description: 'Key lacks the scope or permission' },
        '404': { description: 'Not found' },
      },
    }
  }
  return {
    openapi: '3.1.0',
    info: {
      title: `${title} API`,
      version: '1.0.0',
      description:
        'API for the business dashboard, built for an AI assistant. All money amounts are US dollars (numbers). Dates are YYYY-MM-DD. ' +
        'Authenticate with `Authorization: Bearer <api key>` (create keys in Admin → Settings → API & assistant).',
    },
    servers: [{ url: baseUrl }],
    components: { securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } } },
    security: [{ bearer: [] }],
    paths,
  }
}
