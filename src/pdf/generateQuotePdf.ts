import { jsPDF } from 'jspdf'
import type { Quote } from '../domain/types'
import { formatBrl } from '../domain/quote'

export async function generateQuotePdf(quote: Quote): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 16
  let y = margin

  const line = (text: string, size = 11, style: 'normal' | 'bold' = 'normal') => {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    const lines = doc.splitTextToSize(text, 210 - margin * 2)
    doc.text(lines, margin, y)
    y += lines.length * (size * 0.45) + 2
    if (y > 280) {
      doc.addPage()
      y = margin
    }
  }

  line('FORTE VIDROS', 18, 'bold')
  line('Orçamento de Vidraçaria', 12)
  y += 2
  line(
    `${quote.number}  ·  Revisão R${quote.revision}  ·  ${quote.status === 'emitted' ? 'Emitido' : 'Rascunho'}`,
    10,
  )
  line(
    `Data: ${new Date(quote.emittedAt ?? quote.updatedAt).toLocaleString('pt-BR')}`,
    10,
  )
  line(`Tabela de preços: ${quote.pricingVersion}`, 9)
  y += 4

  if (quote.customer.name || quote.customer.phone || quote.customer.address) {
    line('Cliente', 12, 'bold')
    if (quote.customer.name) line(`Nome: ${quote.customer.name}`)
    if (quote.customer.phone) line(`Telefone: ${quote.customer.phone}`)
    if (quote.customer.address) line(`Endereço: ${quote.customer.address}`)
    if (quote.customer.notes) line(`Obs.: ${quote.customer.notes}`)
    y += 3
  }

  line('Itens', 12, 'bold')
  quote.items.forEach((item, idx) => {
    line(
      `${idx + 1}. ${item.result.label}`,
      11,
      'bold',
    )
    line(`   ${formatBrl(item.result.breakdown.finalPrice)}`, 11)
    const b = item.result.breakdown
    line(
      `   Custo ${formatBrl(b.totalCost)} · Mark-up ${(b.markup * 100).toFixed(0)}% · Margem ${formatBrl(b.marginAmount)}`,
      8,
    )
    y += 1
  })

  if (quote.additionalCosts.length > 0) {
    y += 2
    line('Custos adicionais', 12, 'bold')
    for (const c of quote.additionalCosts) {
      line(`${c.label}: ${formatBrl(c.amount)}`)
    }
  }

  y += 4
  doc.setDrawColor(40, 40, 40)
  doc.line(margin, y, 210 - margin, y)
  y += 8
  line(`Subtotal itens: ${formatBrl(quote.itemsTotal)}`, 11)
  line(`Adicionais: ${formatBrl(quote.additionalTotal)}`, 11)
  line(`TOTAL: ${formatBrl(quote.grandTotal)}`, 14, 'bold')

  y += 8
  line(
    'Valores calculados pelo motor Forte Vidros. Orçamento sujeito a confirmação de medidas no local.',
    8,
  )

  return doc.output('blob')
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
