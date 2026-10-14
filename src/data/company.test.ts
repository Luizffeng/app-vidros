import { describe, expect, it } from 'vitest'
import { COMPANY, companyLine, fillCompany } from './company'

const filled = { ...COMPANY, legalName: 'App Vidros Ltda', cnpj: '00.000.000/0001-00', address: 'Rua A, 1' }

describe('company', () => {
  it('keeps placeholders while data is empty', () => {
    expect(fillCompany('[RAZÃO SOCIAL], CNPJ [CNPJ]', { ...COMPANY })).toBe('[RAZÃO SOCIAL], CNPJ [CNPJ]')
    expect(companyLine({ ...COMPANY })).toBe('')
  })

  it('fills every occurrence of the filled fields', () => {
    expect(fillCompany('[RAZÃO SOCIAL] / [RAZÃO SOCIAL] em [CIDADE/UF DA SEDE]', filled)).toBe(
      'App Vidros Ltda / App Vidros Ltda em [CIDADE/UF DA SEDE]',
    )
    expect(companyLine(filled)).toBe('App Vidros Ltda · CNPJ 00.000.000/0001-00 · Rua A, 1')
  })
})
