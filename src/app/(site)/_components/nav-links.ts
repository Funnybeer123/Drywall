// Plain module (not 'use client') so both server and client components can import it.
export const NAV_LINKS = [
  { href: '/services', label: 'Services' },
  { href: '/work', label: 'Our Work' },
  { href: '/reviews', label: 'Reviews' },
  { href: '/availability', label: 'Availability' },
  { href: '/about', label: 'About' },
  { href: '/faq', label: 'FAQ' },
] as const
