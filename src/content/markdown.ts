/** Subconjunto de markdown dos textos do app: títulos, parágrafos, citação, lista, tabela, negrito e links. */

export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'strong'; text: string }
  | { kind: 'link'; text: string; href: string }

export type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; text: Inline[] }
  | { kind: 'paragraph'; text: Inline[] }
  | { kind: 'quote'; text: Inline[] }
  | { kind: 'list'; items: Inline[][] }
  | { kind: 'table'; head: Inline[][]; rows: Inline[][][] }

const INLINE = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g

export function parseInline(source: string): Inline[] {
  const out: Inline[] = []
  let last = 0
  for (const match of source.matchAll(INLINE)) {
    if (match.index > last) out.push({ kind: 'text', text: source.slice(last, match.index) })
    if (match[1] !== undefined) out.push({ kind: 'strong', text: match[1] })
    else out.push({ kind: 'link', text: match[2], href: match[3] })
    last = match.index + match[0].length
  }
  if (last < source.length) out.push({ kind: 'text', text: source.slice(last) })
  return out
}

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => parseInline(cell.trim()))

const isDivider = (line: string) => /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/.test(line.trim())

export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = []
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) {
      i++
      continue
    }
    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length as 1 | 2 | 3, text: parseInline(heading[2]) })
      i++
      continue
    }
    if (line.startsWith('>')) {
      const parts: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('>')) parts.push(lines[i++].trim().replace(/^>\s?/, ''))
      blocks.push({ kind: 'quote', text: parseInline(parts.join(' ')) })
      continue
    }
    if (/^[-*]\s+/.test(line)) {
      const items: Inline[][] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(parseInline(lines[i++].trim().replace(/^[-*]\s+/, '')))
      }
      blocks.push({ kind: 'list', items })
      continue
    }
    if (line.startsWith('|') && i + 1 < lines.length && isDivider(lines[i + 1])) {
      const head = cells(line)
      const rows: Inline[][][] = []
      i += 2
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]))
      blocks.push({ kind: 'table', head, rows })
      continue
    }
    const parts: string[] = []
    while (i < lines.length) {
      const next = lines[i].trim()
      if (!next || /^(#{1,3}\s|>|[-*]\s|\|)/.test(next)) break
      parts.push(next)
      i++
    }
    blocks.push({ kind: 'paragraph', text: parseInline(parts.join(' ')) })
  }
  return blocks
}
