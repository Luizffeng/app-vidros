export const SUPPORT = {
  /** Só dígitos com DDI (ex.: 5511999999999). Vazio até a empresa ter o número: o WhatsApp pede o contato. */
  whatsapp: '',
  email: '',
  hours: 'Seg. a sex., 10h às 16h',
  reply: 'Respondemos em até 1 hora nesse horário. Fora dele, no próximo dia útil.',
}

export function supportWhatsAppUrl(text: string): string {
  return `https://wa.me/${SUPPORT.whatsapp}?text=${encodeURIComponent(text)}`
}
