import { jsPDF } from 'jspdf'
import type { AppSettings, Quote } from '../domain/types'
import { formatEstablishmentAddress } from '../data/defaultSettings'
import { loadImageSize, logoFormatForPdf } from '../data/logo'
import {
  computeValidUntil,
  customerFacingItemLabel,
  formatBrl,
  formatCustomerAddress,
  formatQuoteCode,
} from '../domain/quote'

export async function generateQuotePdf(
  quote: Quote,
  options?: { validityDays?: number; settings?: AppSettings },
): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 16
  const pageW = 210
  let y = margin

  const est = options?.settings?.establishment
  const brandName = (est?.tradeName || est?.name || 'FORTE VIDROS').toUpperCase()
  const logoDataUrl = options?.settings?.logoDataUrl

  let logoW = 0
  let logoH = 0
  if (logoDataUrl) {
    try {
      const size = await loadImageSize(logoDataUrl)
      const maxH = 20
      const maxW = 42
      logoH = maxH
      logoW = (size.width / size.height) * logoH
      if (logoW > maxW) {
        logoW = maxW
        logoH = (size.height / size.width) * logoW
      }
    } catch {
      logoW = 0
      logoH = 0
    }
  }

  const headerH = Math.max(32, logoH > 0 ? logoH + 12 : 32)

  const line = (text: string, size = 11, style: 'normal' | 'bold' = 'normal') => {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(30, 30, 30)
    const lines = doc.splitTextToSize(text, pageW - margin * 2)
    doc.text(lines, margin, y)
    y += lines.length * (size * 0.45) + 2
    if (y > 280) {
      doc.addPage()
      y = margin
    }
  }

  const labeled = (label: string, value: string, valueBold = false) => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(30, 30, 30)
    const prefix = `${label}: `
    doc.text(prefix, margin, y)
    const w = doc.getTextWidth(prefix)
    doc.setFont('helvetica', valueBold ? 'bold' : 'normal')
    const valueLines = doc.splitTextToSize(value, pageW - margin * 2 - w)
    doc.text(valueLines, margin + w, y)
    y += valueLines.length * (11 * 0.45) + 2
    if (y > 280) {
      doc.addPage()
      y = margin
    }
  }

  // Cabeçalho marca
  doc.setFillColor(15, 28, 26)
  doc.rect(0, 0, pageW, headerH, 'F')
  doc.setFillColor(212, 160, 23)
  doc.rect(0, headerH, pageW, 1.2, 'F')

  if (logoDataUrl && logoW > 0) {
    try {
      doc.addImage(
        logoDataUrl,
        logoFormatForPdf(logoDataUrl),
        pageW - margin - logoW,
        (headerH - logoH) / 2,
        logoW,
        logoH,
      )
    } catch {
      // segue só com texto
    }
  }

  const textMaxW = logoW > 0 ? pageW - margin * 2 - logoW - 6 : pageW - margin * 2
  doc.setTextColor(212, 160, 23)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text(brandName, margin, 12, { maxWidth: textMaxW })
  doc.setTextColor(243, 239, 228)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Orçamento de Vidraçaria', margin, 18, { maxWidth: textMaxW })

  const headerBits: string[] = []
  if (est?.document) headerBits.push(`CNPJ/CPF ${est.document}`)
  if (est?.phone) headerBits.push(est.phone)
  if (est?.email) headerBits.push(est.email)
  if (headerBits.length > 0) {
    doc.setFontSize(8)
    doc.text(headerBits.join('  ·  '), margin, 25, { maxWidth: textMaxW })
  }
  y = headerH + 8

  const code = formatQuoteCode(quote.number, quote.revision)
  const status = quote.status === 'emitted' ? 'Emitido' : 'Rascunho'
  const issuedAt = new Date(quote.emittedAt ?? quote.updatedAt)
  const validUntilIso =
    quote.validUntil ??
    computeValidUntil(
      issuedAt,
      options?.validityDays ?? options?.settings?.quoteValidityDays ?? 15,
    )

  line(`${code}  ·  ${status}`, 11, 'bold')
  line(`Data: ${issuedAt.toLocaleString('pt-BR')}`, 10)
  line(`Validade: ${new Date(validUntilIso).toLocaleDateString('pt-BR')}`, 10)
  y += 3

  const addressLine = formatCustomerAddress(quote.customer)
  if (quote.customer.name || quote.customer.phone || addressLine) {
    line('Cliente', 12, 'bold')
    if (quote.customer.name) labeled('Nome', quote.customer.name, true)
    if (quote.customer.phone) labeled('Telefone', quote.customer.phone)
    if (addressLine) labeled('Endereço', addressLine)
    if (quote.customer.notes) labeled('Obs.', quote.customer.notes)
    y += 3
  }

  line('Itens', 12, 'bold')
  quote.items.forEach((item, idx) => {
    line(`${idx + 1}. ${customerFacingItemLabel(item.input)}`, 11, 'bold')
    line(formatBrl(item.result.breakdown.finalPrice), 11)
    y += 1
  })

  const billedExtras = quote.additionalCosts.filter((c) => c.amount > 0)
  if (billedExtras.length > 0) {
    y += 2
    line('Custos adicionais', 12, 'bold')
    for (const c of billedExtras) {
      line(`${c.label}: ${formatBrl(c.amount)}`)
    }
  }

  y += 4
  doc.setDrawColor(212, 160, 23)
  doc.setLineWidth(0.4)
  doc.line(margin, y, pageW - margin, y)
  y += 8
  line(`Subtotal itens: ${formatBrl(quote.itemsTotal)}`, 11)
  line(`Adicionais: ${formatBrl(quote.additionalTotal)}`, 11)
  line(`TOTAL: ${formatBrl(quote.grandTotal)}`, 14, 'bold')

  y += 8
  line(
    'Orçamento válido até a data indicada, sujeito a confirmação de medidas no local.',
    8,
  )

  const estAddress = est ? formatEstablishmentAddress(est) : ''
  if (est && (estAddress || est.phone || est.email || est.name)) {
    y += 6
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, y, pageW - margin, y)
    y += 6
    line(est.tradeName || est.name, 9, 'bold')
    if (estAddress) line(estAddress, 8)
    const contact = [est.phone, est.email].filter(Boolean).join('  ·  ')
    if (contact) line(contact, 8)
  }

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

/** Web Share API quando disponível; senão download */
export async function shareOrDownloadPdf(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: 'application/pdf' })
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean
  }
  if (typeof nav.share === 'function' && (!nav.canShare || nav.canShare({ files: [file] }))) {
    try {
      await nav.share({
        title: 'Forte Vidros — Orçamento',
        text: filename.replace(/\.pdf$/i, ''),
        files: [file],
      })
      return
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
    }
  }
  downloadBlob(blob, filename)
}
