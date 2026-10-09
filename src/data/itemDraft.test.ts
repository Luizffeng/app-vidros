import { describe, expect, it } from 'vitest'
import {
  clearCreateDraft,
  clearEditDraft,
  clearItemDrafts,
  pruneItemDrafts,
  readItemDraft,
  saveCreateDraft,
  saveEditDraft,
  type ItemFormState,
} from './itemDraft'

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  }
}

const state = (widthMm: string): ItemFormState => ({
  kind: 'espelho',
  spanCm: '140',
  widthMm,
  heightMm: '8',
  glassColor: 'Incolor',
  profileColor: 'Fosco',
  thicknessMm: '08',
  subtype: 'J2F',
  hasLatch: true,
  finish: 'Espelho Lapidado',
  espelhoColor: 'Prata',
  espelhoThickness: '04',
  markup: '30,00',
  extraRows: [{ description: 'Furo', amount: '1', committed: false }],
  customDesc: '',
  customAmount: '',
  note: '',
})

describe('item draft storage', () => {
  it('keeps one new item and edits per item, per quote', () => {
    const store = memoryStorage()
    saveCreateDraft('q1', state('10'), store)
    saveEditDraft('q1', 'i1', state('20'), store)
    saveCreateDraft('q2', state('30'), store)
    const q1 = readItemDraft('q1', store)
    expect(q1?.create?.widthMm).toBe('10')
    expect(q1?.edits.i1.widthMm).toBe('20')
    expect(readItemDraft('q2', store)?.create?.widthMm).toBe('30')
  })

  it('removes parts and drops the key when empty', () => {
    const store = memoryStorage()
    saveCreateDraft('q1', state('10'), store)
    saveEditDraft('q1', 'i1', state('20'), store)
    expect(clearCreateDraft('q1', store)?.create).toBeUndefined()
    expect(clearEditDraft('q1', 'i1', store)).toBeNull()
    expect(store.length).toBe(0)
  })

  it('clears everything for a quote', () => {
    const store = memoryStorage()
    saveCreateDraft('q1', state('10'), store)
    clearItemDrafts('q1', store)
    expect(readItemDraft('q1', store)).toBeNull()
  })

  it('prunes drafts of quotes that no longer exist', () => {
    const store = memoryStorage()
    saveCreateDraft('q1', state('10'), store)
    saveCreateDraft('gone', state('20'), store)
    store.setItem('other', 'x')
    pruneItemDrafts(new Set(['q1']), store)
    expect(readItemDraft('q1', store)).not.toBeNull()
    expect(readItemDraft('gone', store)).toBeNull()
    expect(store.getItem('other')).toBe('x')
  })

  it('ignores bad data and missing storage', () => {
    const store = memoryStorage()
    store.setItem('app-vidros:item-draft:q1', '{nope')
    expect(readItemDraft('q1', store)).toBeNull()
    store.setItem('app-vidros:item-draft:q1', JSON.stringify({ create: { foo: 1 }, edits: { x: null } }))
    expect(readItemDraft('q1', store)).toBeNull()
    expect(readItemDraft('q1', null)).toBeNull()
    expect(saveCreateDraft('q1', state('1'), null)?.create?.widthMm).toBe('1')
  })
})
