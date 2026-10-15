import { describe, expect, it } from 'vitest'
import privacy from './legal/politica-de-privacidade.md?raw'
import terms from './legal/termos-de-uso.md?raw'
import news from './novidades.md?raw'
import { parseInline, parseMarkdown, splitChapters } from './markdown'

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

describe('splitChapters', () => {
  it('drops the title, keeps the intro and groups blocks under each ##', () => {
    const { intro, chapters } = splitChapters(
      parseMarkdown(['# Novidades', 'Intro.', '## Novembro', '- a', '- b', '## Outubro', '- c'].join('\n')),
    )
    expect(intro).toMatchObject([{ kind: 'paragraph' }])
    expect(chapters.map((c) => c.title[0])).toEqual([
      { kind: 'text', text: 'Novembro' },
      { kind: 'text', text: 'Outubro' },
    ])
    expect(chapters[0].blocks).toMatchObject([{ kind: 'list', items: [[{ text: 'a' }], [{ text: 'b' }]] }])
  })

  it('novidades.md: one ## per month ("Mês de AAAA"), newest first, at most 6, only lists', () => {
    const { chapters } = splitChapters(parseMarkdown(news))
    const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
    const keys = chapters.map((c) => {
      const title = c.title.map((part) => part.text).join('')
      const match = /^(\p{Lu}\p{Ll}+) de (\d{4})$/u.exec(title)
      expect(match, title).not.toBeNull()
      const month = MONTHS.indexOf(match![1].toLowerCase())
      expect(month, title).toBeGreaterThanOrEqual(0)
      return Number(match![2]) * 12 + month
    })
    expect(chapters.length).toBeGreaterThan(0)
    expect(chapters.length).toBeLessThanOrEqual(6)
    expect(keys).toEqual([...keys].sort((a, b) => b - a))
    expect(new Set(keys).size).toBe(keys.length)
    for (const chapter of chapters) expect(chapter.blocks.map((b) => b.kind)).toEqual(['list'])
  })
})
