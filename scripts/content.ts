// Starter website content shared by the demo seed and the production setup script.
// Prices are examples — Willie should set his own in Admin → Price list.

export const SERVICES = [
  { slug: 'hang-and-finish', name: 'Hang & Finish', icon: 'layers', sort: 1, summary: 'New construction, additions and remodels — hung tight, taped and finished smooth.', body: 'From a single room to a whole house, we hang, tape, mud and sand to a paint-ready finish. Level 4 standard; Level 5 available for critical lighting.' },
  { slug: 'repairs', name: 'Drywall Repair', icon: 'wrench', sort: 2, summary: 'Holes, cracks, nail pops and doorknob dents patched so you’ll never know.', body: 'Small patches to full-wall replacements. We match your existing texture so the repair disappears.' },
  { slug: 'textures', name: 'Textures', icon: 'sparkles', sort: 3, summary: 'Knockdown, orange peel, skip trowel, or a perfectly smooth finish.', body: 'Update dated popcorn ceilings or match an existing texture exactly.' },
  { slug: 'ceilings', name: 'Ceilings & Popcorn Removal', icon: 'home', sort: 4, summary: 'Popcorn removal, ceiling repairs and smooth re-finishing.', body: 'We protect your floors and furniture, remove the popcorn, and leave a clean modern ceiling.' },
  { slug: 'water-damage', name: 'Water Damage', icon: 'droplets', sort: 5, summary: 'Cut out, replace and refinish after leaks — we work with insurance claims.', body: 'Fast turnaround after a leak or flood. We document everything for your insurance adjuster.' },
  { slug: 'commercial', name: 'Commercial', icon: 'building', sort: 6, summary: 'Tenant improvements, offices and retail — on schedule, to spec.', body: 'Metal stud framing, fire-rated assemblies and finish work for general contractors and property managers.' },
]

export const FAQS = [
  { sort: 1, question: 'Do you give free estimates?', answer: 'Yes. Send photos through the quote form for a fast ballpark, or we can come out and measure for an exact price.' },
  { sort: 2, question: 'Are you licensed and insured?', answer: 'Yes — fully licensed and insured. We’re happy to send a certificate of insurance on request.' },
  { sort: 3, question: 'How long does a typical job take?', answer: 'Small repairs are usually done in 1–2 visits (mud needs time to dry). A room hang & finish is typically 3–5 days; a whole basement 1–2 weeks.' },
  { sort: 4, question: 'Do you match existing texture?', answer: 'Yes. We match knockdown, orange peel, skip trowel and hand textures so repairs blend in.' },
  { sort: 5, question: 'How messy is drywall work?', answer: 'We hang plastic, cover floors, and use dust-control sanding. We leave your space broom-clean every day.' },
  { sort: 6, question: 'How can I pay?', answer: 'Invoices can be paid online by card or bank transfer, or by check. Larger jobs typically use a deposit and a final payment.' },
]

export const PRICE_ITEMS = [
  { name: 'Hang & finish 1/2" drywall (per sheet)', unit: 'sheet', unitPriceCents: 6500 },
  { name: 'Hang & finish 5/8" fire-rated (per sheet)', unit: 'sheet', unitPriceCents: 7500 },
  { name: 'Small patch (under 6")', unit: 'each', unitPriceCents: 12500 },
  { name: 'Medium patch (6"–24")', unit: 'each', unitPriceCents: 22500 },
  { name: 'Large repair / section replacement', unit: 'each', unitPriceCents: 45000 },
  { name: 'Popcorn removal & smooth finish', unit: 'sq ft', unitPriceCents: 250 },
  { name: 'Knockdown texture', unit: 'sq ft', unitPriceCents: 85 },
  { name: 'Trip charge / minimum', unit: 'each', unitPriceCents: 15000 },
]
