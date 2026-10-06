import { Building, Droplets, Hammer, House, Layers, Paintbrush, Ruler, Sparkles, Wrench, type LucideIcon } from 'lucide-react'

export const GALLERY_CATEGORIES = ['Hang & Finish', 'Repairs', 'Textures', 'Ceilings', 'Water Damage', 'Commercial']

export const SERVICE_ICONS: Record<string, { label: string; Icon: LucideIcon }> = {
  layers: { label: 'Layers (hang & finish)', Icon: Layers },
  wrench: { label: 'Wrench (repairs)', Icon: Wrench },
  sparkles: { label: 'Sparkles (textures)', Icon: Sparkles },
  home: { label: 'House (ceilings / residential)', Icon: House },
  droplets: { label: 'Droplets (water damage)', Icon: Droplets },
  building: { label: 'Building (commercial)', Icon: Building },
  hammer: { label: 'Hammer (general)', Icon: Hammer },
  paintbrush: { label: 'Paintbrush (paint / finish)', Icon: Paintbrush },
  ruler: { label: 'Ruler (framing / measuring)', Icon: Ruler },
}

/** Sample service areas inserted by the demo seed — should be replaced before launch. */
export const SEED_AREA_CITIES = ['Springfield', 'Chatham', 'Rochester', 'Sherman', 'Riverton']

export const SAMPLE_TESTIMONIAL_PREFIX = 'Sample —'

export const DEFAULT_PHONE = '(555) 555-0123'
export const DEFAULT_EMAIL = 'hello@example.com'

export const CONTENT_TABS = [
  { href: '/admin/content', label: 'Overview' },
  { href: '/admin/content/gallery', label: 'Gallery' },
  { href: '/admin/content/testimonials', label: 'Reviews' },
  { href: '/admin/content/services', label: 'Services' },
  { href: '/admin/content/faqs', label: 'FAQ' },
  { href: '/admin/content/areas', label: 'Service areas' },
] as const
