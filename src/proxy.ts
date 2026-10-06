import { NextResponse, type NextRequest } from 'next/server'

/**
 * When the site is shared from this PC through a public tunnel (ADMIN_LOCAL_ONLY=true),
 * the team dashboard and login are reachable only from this computer (localhost).
 * Everyone else gets the public website and the key-protected API.
 * Leave ADMIN_LOCAL_ONLY unset on a real deployment so the team can sign in from anywhere.
 */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

export function proxy(request: NextRequest) {
  if (process.env.ADMIN_LOCAL_ONLY !== 'true') return NextResponse.next()
  const host = (request.headers.get('host') ?? '').replace(/:\d+$/, '')
  const viaTunnel = request.headers.has('cf-connecting-ip') || !LOCAL_HOSTS.has(host)
  if (!viaTunnel) return NextResponse.next()
  return new NextResponse('Not found', { status: 404 })
}

export const config = {
  matcher: ['/admin/:path*', '/login', '/invite/:path*'],
}
