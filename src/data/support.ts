export const SUPPORT = {
  /** Só dígitos com DDI. Provisório (celular do dono) até a empresa ter CNPJ e número próprio. */
  whatsapp: '5537999170088',
  email: '',
  hours: 'Seg. a sex., 10h às 16h',
  reply: 'Respondemos em até 1 hora nesse horário. Fora dele, no próximo dia útil.',
}

export function supportWhatsAppUrl(text: string): string {
  return `https://wa.me/${SUPPORT.whatsapp}?text=${encodeURIComponent(text)}`
}
