import { describe, expect, it } from 'vitest'
import { describeItem } from './itemDescription'
import type { CorrerSubtype, ItemInput } from './types'

const base = { markup: 0.3, extras: [] }

describe('describeItem', () => {
  it('espelho: acabamento, cor e espessura, medida', () => {
    expect(
      describeItem({
        ...base,
        kind: 'espelho',
        finish: 'Espelho Lapidado',
        widthMm: 3445,
        heightMm: 745,
        glassColor: 'Bronze',
        thicknessMm: '04',
      }),
    ).toEqual({ title: 'Espelho Lapidado', spec: 'Bronze 04mm', size: '3445 × 745 mm' })
  })

  it('espelho bisotado', () => {
    expect(
      describeItem({
        ...base,
        kind: 'espelho',
        finish: 'Espelho Bisotado',
        widthMm: 501,
        heightMm: 2620,
        glassColor: 'Prata',
        thicknessMm: '04',
      }).title,
    ).toBe('Espelho Bisotado')
  })

  it('fixo', () => {
    expect(
      describeItem({
        ...base,
        kind: 'fixo',
        widthMm: 1000,
        heightMm: 2000,
        glassColor: 'Incolor',
        thicknessMm: '08',
      }),
    ).toEqual({
      title: 'Vidro fixo temperado',
      spec: 'Vidro Incolor 08mm',
      size: '1000 × 2000 mm',
    })
  })

  it.each<[CorrerSubtype, string]>([
    ['J2F', 'Janela de correr 2 folhas'],
    ['J4F', 'Janela de correr 4 folhas'],
    ['P2F', 'Porta de correr 2 folhas'],
    ['P4F', 'Porta de correr 4 folhas'],
  ])('correr %s', (subtype, title) => {
    expect(
      describeItem({
        ...base,
        kind: 'correr',
        subtype,
        widthMm: 1500,
        heightMm: 1200,
        glassColor: 'Incolor',
        thicknessMm: '08',
        profileColor: 'Fosco',
      }),
    ).toEqual({
      title,
      spec: 'Alumínio Fosco · Vidro Incolor 08mm',
      size: '1500 × 1200 mm',
    })
  })

  it('pivotante sem trinco', () => {
    expect(
      describeItem({
        ...base,
        kind: 'pivotante',
        widthMm: 900,
        heightMm: 2100,
        glassColor: 'Fume',
        thicknessMm: '10',
        profileColor: 'Preto',
        hasLatch: false,
      }),
    ).toEqual({
      title: 'Porta pivotante',
      spec: 'Alumínio Preto · Vidro Fume 10mm',
      size: '900 × 2100 mm',
    })
  })

  it('pivotante com trinco', () => {
    expect(
      describeItem({
        ...base,
        kind: 'pivotante',
        widthMm: 900,
        heightMm: 2100,
        glassColor: 'Incolor',
        thicknessMm: '10',
        profileColor: 'Fosco',
        hasLatch: true,
      }).title,
    ).toBe('Porta pivotante com trinco')
  })

  it('maxiar', () => {
    expect(
      describeItem({
        ...base,
        kind: 'maxiar',
        widthMm: 600,
        heightMm: 400,
        glassColor: 'Verde',
        thicknessMm: '06',
        profileColor: 'Branco',
      }),
    ).toEqual({
      title: 'Janela maxim-ar',
      spec: 'Alumínio Branco · Vidro Verde 06mm',
      size: '600 × 400 mm',
    })
  })

  it('box: sem espessura no input, medida é o vão', () => {
    expect(
      describeItem({
        ...base,
        kind: 'box',
        spanCm: 120,
        glassColor: 'Incolor',
        profileColor: 'Fosco',
      }),
    ).toEqual({
      title: 'Box frontal 2 folhas',
      spec: 'Alumínio Fosco · Vidro Incolor',
      size: 'Vão 120 cm',
    })
  })

  it('custom com descrição', () => {
    expect(describeItem({ kind: 'custom', description: ' Instalação ', amount: 100 })).toEqual({
      title: 'Instalação',
    })
  })

  it('custom sem descrição', () => {
    expect(describeItem({ kind: 'custom', description: '', amount: 100 })).toEqual({
      title: 'Item avulso',
    })
  })

  it('tolera campos faltando em orçamentos antigos', () => {
    const legacy = {
      ...base,
      kind: 'correr',
      subtype: 'J2F',
      widthMm: 0,
      heightMm: 1200,
      glassColor: 'Incolor',
      profileColor: '',
    } as unknown as ItemInput
    expect(describeItem(legacy)).toEqual({
      title: 'Janela de correr 2 folhas',
      spec: 'Vidro Incolor',
      size: undefined,
    })
  })

  it('não duplica "mm" na espessura', () => {
    expect(
      describeItem({
        ...base,
        kind: 'fixo',
        widthMm: 1000,
        heightMm: 1000,
        glassColor: 'Incolor',
        thicknessMm: '08mm',
      }).spec,
    ).toBe('Vidro Incolor 08mm')
  })
})
