import { describe, expect, it } from 'vitest'
import { filterUfInput, formatPhone, isValidUf, phoneDdd, phoneDigits, withDefaultDdd } from './brazil'

describe('filterUfInput', () => {
  it('aceita UF válida e prefixos dela', () => {
    expect(filterUfInput('m')).toBe('M')
    expect(filterUfInput('mg')).toBe('MG')
    expect(filterUfInput('M1g')).toBe('MG')
  })

  it('recusa combinações que não são UF', () => {
    expect(filterUfInput('X', '')).toBe('')
    expect(filterUfInput('MX', 'M')).toBe('M')
    expect(filterUfInput('ZZ', 'SP')).toBe('SP')
  })

  it('isValidUf exige sigla completa', () => {
    expect(isValidUf('MG')).toBe(true)
    expect(isValidUf('M')).toBe(false)
    expect(isValidUf(undefined)).toBe(false)
  })
})

describe('telefone', () => {
  it('phoneDigits remove máscara, +55 e zero inicial', () => {
    expect(phoneDigits('(37) 99999-9999')).toBe('37999999999')
    expect(phoneDigits('+55 37 99999-9999')).toBe('37999999999')
    expect(phoneDigits('037 3222-1111')).toBe('3732221111')
    expect(phoneDigits('379999999991234')).toBe('37999999999')
  })

  it('formatPhone formata com e sem DDD', () => {
    expect(formatPhone('37999999999')).toBe('(37) 99999-9999')
    expect(formatPhone('3732221111')).toBe('(37) 3222-1111')
    expect(formatPhone('999999999')).toBe('99999-9999')
    expect(formatPhone('32221111')).toBe('3222-1111')
    expect(formatPhone('99999')).toBe('9999-9')
    expect(formatPhone('999')).toBe('999')
    expect(formatPhone(undefined)).toBe('')
  })

  it('phoneDdd só existe com 10 ou 11 dígitos', () => {
    expect(phoneDdd('(37) 3222-1111')).toBe('37')
    expect(phoneDdd('99999-9999')).toBeUndefined()
  })

  it('withDefaultDdd completa número local com o DDD da loja', () => {
    expect(withDefaultDdd('999999999', '37')).toBe('37999999999')
    expect(withDefaultDdd('32221111', '37')).toBe('3732221111')
    expect(withDefaultDdd('11988887777', '37')).toBe('11988887777')
    expect(withDefaultDdd('9999', '37')).toBe('9999')
    expect(withDefaultDdd('999999999', undefined)).toBe('999999999')
  })
})
