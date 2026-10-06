/**
 * Chat with Grok as Willy's personal assistant, right in the terminal.
 * Grok can read and update the business through the site's API (/api/v1).
 *
 *   npm run assistant
 *
 * Needs in .env.local (or your shell):
 *   XAI_API_KEY   — from console.x.ai
 *   SITE_API_KEY  — create in Admin → Settings → API & assistant
 *   SITE_URL      — e.g. https://willysdrywall.com (defaults to APP_URL / localhost:3000)
 *   XAI_MODEL     — optional, defaults to grok-4.7
 *
 * Attach a photo or PDF (receipt, job photo) with:  /attach C:\path\to\receipt.jpg
 * Grok sees the image (to read vendor, total, etc.) and can upload it with a tool call.
 *
 * This file is also a reference for wiring any Grok bot to the site:
 *   1. GET  {SITE_URL}/api/v1/tools        → pass as `tools` to Grok
 *   2. When Grok returns tool_calls, POST {SITE_URL}/api/v1/tools/call
 *      with { name, arguments } and send the JSON back as a `tool` message.
 */
import { readFileSync, existsSync } from 'node:fs'
import { basename, extname } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { stdin, stdout } from 'node:process'
import { loadEnv } from './env'
loadEnv()

const XAI_KEY = process.env.XAI_API_KEY
const SITE_KEY = process.env.SITE_API_KEY
const SITE = (process.env.SITE_URL || process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')
const MODEL = process.env.XAI_MODEL || 'grok-4.7'

if (!XAI_KEY || !SITE_KEY) {
  console.error('Set XAI_API_KEY and SITE_API_KEY (see the comment at the top of scripts/grok-assistant.ts).')
  process.exit(1)
}

type Msg =
  | { role: 'system' | 'assistant'; content: string | null; tool_calls?: ToolCall[] }
  | { role: 'user'; content: string | ({ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } })[] }
  | { role: 'tool'; tool_call_id: string; content: string }
type ToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } }

const MIME: Record<string, string> = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.pdf': 'application/pdf' }
const attachments: { filename: string; contentType: string; dataBase64: string }[] = []

async function site(path: string, init?: RequestInit) {
  const res = await fetch(`${SITE}/api/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${SITE_KEY}`, 'Content-Type': 'application/json', ...init?.headers },
  })
  return res.json()
}

/** Replace "@attachment:N" placeholders with the real file data before calling the site. */
function fillAttachments(value: unknown): unknown {
  if (typeof value === 'string') {
    const m = value.match(/^@attachment:(\d+)$/)
    return m ? (attachments[Number(m[1]) - 1]?.dataBase64 ?? value) : value
  }
  if (Array.isArray(value)) return value.map(fillAttachments)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fillAttachments(v)]))
  return value
}

async function grok(messages: Msg[], tools: unknown[]) {
  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${XAI_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages, tools, tool_choice: 'auto' }),
  })
  if (!res.ok) throw new Error(`xAI API ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as { choices: { message: { content: string | null; tool_calls?: ToolCall[] } }[] }
  return data.choices[0].message
}

const { tools, error } = (await site('/tools')) as { tools: unknown[]; error?: { message: string } }
if (error) {
  console.error('Site API error:', error.message)
  process.exit(1)
}

const messages: Msg[] = [
  {
    role: 'system',
    content: [
      "You are Willy's personal assistant for his drywall business. You manage his website and business records through tools.",
      'Start by calling get_business_overview if you need context (it includes today’s date).',
      'Money is in US dollars; dates are YYYY-MM-DD. Look things up (list_/get_ tools) before creating, to avoid duplicates.',
      'Before anything that contacts a customer (send_estimate, send_invoice), changes settings, deletes something, or records a payment, say exactly what you will do and wait for a yes.',
      'Only add real customer reviews, worded as given. Keep answers short and practical — Willy is often on a job site.',
      'When the user has attached files, pass them to tools as {"filename","contentType","dataBase64":"@attachment:N"} — the app fills in the data.',
    ].join(' '),
  },
]

console.log(`🤖 Grok assistant connected to ${SITE} with ${tools.length} tools. Type /attach <file> to add a photo/receipt, /quit to exit.\n`)
const rl = createInterface({ input: stdin, output: stdout })

while (true) {
  const line = (await rl.question('You: ')).trim()
  if (!line) continue
  if (line === '/quit' || line === '/exit') break

  if (line.startsWith('/attach ')) {
    const path = line.slice(8).trim().replace(/^"|"$/g, '')
    const contentType = MIME[extname(path).toLowerCase()]
    if (!existsSync(path) || !contentType) {
      console.log('  ↳ Couldn’t attach that (needs an existing .jpg, .png, .webp or .pdf file).\n')
      continue
    }
    const dataBase64 = readFileSync(path).toString('base64')
    attachments.push({ filename: basename(path), contentType, dataBase64 })
    const n = attachments.length
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: `Attached file @attachment:${n} (${basename(path)}, ${contentType}).` },
        ...(contentType.startsWith('image/') ? [{ type: 'image_url' as const, image_url: { url: `data:${contentType};base64,${dataBase64}` } }] : []),
      ],
    })
    console.log(`  ↳ Attached as @attachment:${n}. Now tell me what to do with it.\n`)
    continue
  }

  messages.push({ role: 'user', content: line })
  try {
    // Let Grok call tools until it has a final answer.
    for (let step = 0; step < 12; step++) {
      const reply = await grok(messages, tools)
      messages.push({ role: 'assistant', content: reply.content, tool_calls: reply.tool_calls })
      if (!reply.tool_calls?.length) {
        console.log(`\nGrok: ${reply.content}\n`)
        break
      }
      for (const call of reply.tool_calls) {
        let args: unknown = {}
        try {
          args = JSON.parse(call.function.arguments || '{}')
        } catch {}
        console.log(`  ⚙ ${call.function.name}`)
        const result = await site('/tools/call', {
          method: 'POST',
          body: JSON.stringify({ name: call.function.name, arguments: fillAttachments(args) }),
        })
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result).slice(0, 30000) })
      }
    }
  } catch (e) {
    console.error('\n⚠', e instanceof Error ? e.message : e, '\n')
  }
}
rl.close()
process.exit(0)
