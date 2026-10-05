export const BR_UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA',
  'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
] as const

/**
 * Filtra o que foi digitado no campo UF: só letras que ainda podem formar uma
 * sigla válida. Retorna `previous` quando o novo valor não leva a nenhuma UF.
 */
export function filterUfInput(raw: string, previous = ''): string {
  const next = raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2)
  if (next === '') return ''
  return BR_UFS.some((uf) => uf.startsWith(next)) ? next : previous
}

export function isValidUf(value: string | undefined): boolean {
  return BR_UFS.includes((value ?? '') as (typeof BR_UFS)[number])
}

/** Dígitos do telefone (máx. 11), sem zero de operadora nem +55. */
export function phoneDigits(value: string): string {
  let d = value.replace(/\D/g, '')
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2)
  d = d.replace(/^0+/, '')
  return d.slice(0, 11)
}

/** `(37) 99999-9999`, `(37) 3222-1111`, `99999-9999` ou parcial durante a digitação. */
export function formatPhone(value: string | undefined): string {
  const d = phoneDigits(value ?? '')
  if (d.length >= 10) {
    const local = d.slice(2)
    const cut = local.length - 4
    return `(${d.slice(0, 2)}) ${local.slice(0, cut)}-${local.slice(cut)}`
  }
  if (d.length > 4) {
    const cut = d.length > 8 ? d.length - 4 : 4
    return `${d.slice(0, cut)}-${d.slice(cut)}`
  }
  return d
}

/** DDD do telefone, se ele tiver DDD (10 ou 11 dígitos). */
export function phoneDdd(value: string | undefined): string | undefined {
  const d = phoneDigits(value ?? '')
  return d.length >= 10 ? d.slice(0, 2) : undefined
}

/** Número local (8 ou 9 dígitos) recebe o DDD padrão; demais casos ficam como estão. */
export function withDefaultDdd(value: string | undefined, ddd: string | undefined): string {
  const d = phoneDigits(value ?? '')
  if (!ddd || (d.length !== 8 && d.length !== 9)) return d
  return `${ddd}${d}`
}
