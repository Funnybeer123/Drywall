import 'server-only'
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from '@react-pdf/renderer'
import type { Customer, Settings } from '@/db/schema'
import { formatCents, formatPercentBps, lineTotal } from './money'
import { formatDate } from './dates'
import { formatPhone } from './utils'

type Item = { description: string; quantity: number; unitPriceCents: number }

type DocInput = {
  kind: 'Invoice' | 'Estimate'
  number: string
  settings: Settings
  customer: Customer
  issueDate: string
  dueLabel: string
  dueDate: string | null
  title?: string | null
  items: Item[]
  subtotalCents: number
  taxRateBps: number
  taxCents: number
  totalCents: number
  paidCents?: number
  notes?: string | null
  link?: string
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#0f172a' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  brand: { fontSize: 18, fontFamily: 'Helvetica-Bold' },
  muted: { color: '#64748b' },
  docTitle: { fontSize: 22, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  row: { flexDirection: 'row' },
  th: { fontFamily: 'Helvetica-Bold', color: '#475569', fontSize: 9, textTransform: 'uppercase' },
  tableHead: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#cbd5e1', paddingBottom: 6, marginTop: 20 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 0.5, borderColor: '#e2e8f0', paddingVertical: 7 },
  cDesc: { flex: 1 },
  cQty: { width: 50, textAlign: 'right' },
  cPrice: { width: 80, textAlign: 'right' },
  cTotal: { width: 80, textAlign: 'right' },
  totals: { marginTop: 14, marginLeft: 'auto', width: 220 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  grand: { fontFamily: 'Helvetica-Bold', fontSize: 13, borderTopWidth: 1, borderColor: '#0f172a', paddingTop: 6, marginTop: 4 },
  notes: { marginTop: 28, padding: 12, backgroundColor: '#f8fafc', borderRadius: 4 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', color: '#94a3b8', fontSize: 9 },
})

function DocPdf(d: DocInput) {
  const s = d.settings
  const balance = d.totalCents - (d.paidCents ?? 0)
  return (
    <Document title={`${d.kind} ${d.number}`} author={s.businessName}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.brand, { color: s.accentColor }]}>{s.businessName}</Text>
            <Text style={styles.muted}>{formatPhone(s.phone)}</Text>
            <Text style={styles.muted}>{s.email}</Text>
            {s.address ? <Text style={styles.muted}>{s.address}</Text> : null}
            <Text style={styles.muted}>
              {s.city}, {s.state}
            </Text>
            {s.licenseNumber ? <Text style={styles.muted}>License #{s.licenseNumber}</Text> : null}
          </View>
          <View>
            <Text style={styles.docTitle}>{d.kind.toUpperCase()}</Text>
            <Text style={{ textAlign: 'right' }}>#{d.number}</Text>
            <Text style={[styles.muted, { textAlign: 'right', marginTop: 6 }]}>Date: {formatDate(d.issueDate)}</Text>
            {d.dueDate ? (
              <Text style={[styles.muted, { textAlign: 'right' }]}>
                {d.dueLabel}: {formatDate(d.dueDate)}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.th}>{d.kind === 'Invoice' ? 'Bill to' : 'Prepared for'}</Text>
            <Text style={{ marginTop: 4, fontFamily: 'Helvetica-Bold' }}>{d.customer.name}</Text>
            {d.customer.company ? <Text>{d.customer.company}</Text> : null}
            {d.customer.address ? <Text>{d.customer.address}</Text> : null}
            {d.customer.city ? (
              <Text>
                {d.customer.city}
                {d.customer.state ? `, ${d.customer.state}` : ''} {d.customer.zip ?? ''}
              </Text>
            ) : null}
            {d.customer.email ? <Text style={styles.muted}>{d.customer.email}</Text> : null}
          </View>
          {d.title ? (
            <View style={{ flex: 1 }}>
              <Text style={styles.th}>Project</Text>
              <Text style={{ marginTop: 4 }}>{d.title}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.tableHead}>
          <Text style={[styles.th, styles.cDesc]}>Description</Text>
          <Text style={[styles.th, styles.cQty]}>Qty</Text>
          <Text style={[styles.th, styles.cPrice]}>Price</Text>
          <Text style={[styles.th, styles.cTotal]}>Amount</Text>
        </View>
        {d.items.map((it, i) => (
          <View key={i} style={styles.tableRow} wrap={false}>
            <Text style={styles.cDesc}>{it.description}</Text>
            <Text style={styles.cQty}>{it.quantity}</Text>
            <Text style={styles.cPrice}>{formatCents(it.unitPriceCents)}</Text>
            <Text style={styles.cTotal}>{formatCents(lineTotal(it))}</Text>
          </View>
        ))}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{formatCents(d.subtotalCents)}</Text>
          </View>
          {d.taxRateBps > 0 ? (
            <View style={styles.totalRow}>
              <Text>Tax ({formatPercentBps(d.taxRateBps)})</Text>
              <Text>{formatCents(d.taxCents)}</Text>
            </View>
          ) : null}
          <View style={[styles.totalRow, styles.grand]}>
            <Text>Total</Text>
            <Text>{formatCents(d.totalCents)}</Text>
          </View>
          {d.paidCents ? (
            <>
              <View style={styles.totalRow}>
                <Text>Paid</Text>
                <Text>-{formatCents(d.paidCents)}</Text>
              </View>
              <View style={[styles.totalRow, { fontFamily: 'Helvetica-Bold' }]}>
                <Text>Balance due</Text>
                <Text>{formatCents(balance)}</Text>
              </View>
            </>
          ) : null}
        </View>

        {d.notes ? (
          <View style={styles.notes}>
            <Text style={styles.th}>Notes</Text>
            <Text style={{ marginTop: 4 }}>{d.notes}</Text>
          </View>
        ) : null}
        {d.link ? (
          <Text style={{ marginTop: 18, color: s.accentColor }}>
            {d.kind === 'Invoice' ? 'Pay online' : 'View & accept online'}: {d.link}
          </Text>
        ) : null}

        <Text style={styles.footer} fixed>
          {s.invoiceFooter}
        </Text>
      </Page>
    </Document>
  )
}

export function renderDocPdf(input: DocInput): Promise<Buffer> {
  return renderToBuffer(<DocPdf {...input} />)
}
