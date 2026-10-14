/**
 * Empresa dona do App Vidros. Vazio até abrir o CNPJ: o rodapé mostra só o que estiver
 * preenchido e os textos legais mantêm o marcador entre colchetes.
 */
export const COMPANY = {
  legalName: '',
  cnpj: '',
  address: '',
  cityUf: '',
  dpo: '',
}

const PLACEHOLDERS: [string, keyof typeof COMPANY][] = [
  ['[RAZÃO SOCIAL]', 'legalName'],
  ['[CNPJ]', 'cnpj'],
  ['[ENDEREÇO COMPLETO]', 'address'],
  ['[CIDADE/UF DA SEDE]', 'cityUf'],
  ['[NOME DO ENCARREGADO]', 'dpo'],
]

/** Troca os marcadores dos textos legais pelos dados já preenchidos. */
export function fillCompany(markdown: string, company: typeof COMPANY = COMPANY): string {
  return PLACEHOLDERS.reduce(
    (text, [mark, key]) => (company[key] ? text.replaceAll(mark, company[key]) : text),
    markdown,
  )
}

/** "Razão · CNPJ … · Endereço"; vazio enquanto não houver dados. */
export function companyLine(company: typeof COMPANY = COMPANY): string {
  return [company.legalName, company.cnpj && `CNPJ ${company.cnpj}`, company.address].filter(Boolean).join(' · ')
}
