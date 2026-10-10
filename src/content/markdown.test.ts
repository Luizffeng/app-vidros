import { describe, expect, it } from 'vitest'
import privacy from './legal/politica-de-privacidade.md?raw'
import terms from './legal/termos-de-uso.md?raw'
import { parseInline, parseMarkdown } from './markdown'

describe('parseInline', () => {
  it('splits bold and links, keeps bracket placeholders as text', () => {
    expect(parseInline('Por **[RAZÃO SOCIAL]**, veja a [Política](/privacidade).')).toEqual([
      { kind: 'text', text: 'Por ' },
      { kind: 'strong', text: '[RAZÃO SOCIAL]' },
      { kind: 'text', text: ', veja a ' },
      { kind: 'link', text: 'Política', href: '/privacidade' },
      { kind: 'text', text: '.' },
    ])
    expect(parseInline('[CNPJ] sem link')).toEqual([{ kind: 'text', text: '[CNPJ] sem link' }])
  })
})

describe('parseMarkdown', () => {
  it('reads headings, quote, paragraphs, lists and tables', () => {
    const blocks = parseMarkdown(
      [
        '# Título',
        '',
        '> **Rascunho.** Revisar.',
        '',
        'Linha um',
        'continua.',
        '',
        '- a',
        '- b',
        '',
        '| A | B |',
        '| --- | --- |',
        '| 1 | 2 |',
        '## Seção',
      ].join('\n'),
    )
    expect(blocks.map((b) => b.kind)).toEqual(['heading', 'quote', 'paragraph', 'list', 'table', 'heading'])
    expect(blocks[2]).toEqual({ kind: 'paragraph', text: [{ kind: 'text', text: 'Linha um continua.' }] })
    expect(blocks[3]).toMatchObject({ kind: 'list', items: [[{ text: 'a' }], [{ text: 'b' }]] })
    expect(blocks[4]).toMatchObject({ kind: 'table', head: [[{ text: 'A' }], [{ text: 'B' }]], rows: [[[{ text: '1' }], [{ text: '2' }]]] })
    expect(blocks[5]).toMatchObject({ kind: 'heading', level: 2 })
  })

  it('parses the legal drafts with one title and no raw markdown left', () => {
    for (const source of [terms, privacy]) {
      const blocks = parseMarkdown(source)
      expect(blocks.filter((b) => b.kind === 'heading' && b.level === 1)).toHaveLength(1)
      const text = JSON.stringify(blocks.filter((b) => b.kind === 'paragraph'))
      expect(text).not.toMatch(/\*\*|\]\(/)
    }
  })
})
