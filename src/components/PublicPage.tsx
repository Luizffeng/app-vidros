import { useMemo, type MouseEvent } from 'react'
import { parseMarkdown, type Block, type Inline } from '../content/markdown'
import { PAGE_SOURCES } from '../content/pages'
import { push, up } from '../nav/navigator'
import { parseRoute, type PublicPage as Page } from '../nav/routes'
import { BackArrowIcon } from './AppHeader'
import { IconButton } from './IconButton'

function openInternal(e: MouseEvent<HTMLAnchorElement>, href: string) {
  e.preventDefault()
  push(parseRoute(href))
}

function InlineText({ parts }: { parts: Inline[] }) {
  return parts.map((part, i) => {
    if (part.kind === 'strong') return <strong key={i}>{part.text}</strong>
    if (part.kind === 'link') {
      return part.href.startsWith('/') ? (
        <a key={i} href={part.href} onClick={(e) => openInternal(e, part.href)}>
          {part.text}
        </a>
      ) : (
        <a key={i} href={part.href} target="_blank" rel="noreferrer">
          {part.text}
        </a>
      )
    }
    return part.text
  })
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case 'heading':
      return block.level === 2 ? (
        <h2>
          <InlineText parts={block.text} />
        </h2>
      ) : (
        <h3>
          <InlineText parts={block.text} />
        </h3>
      )
    case 'quote':
      return (
        <blockquote>
          <InlineText parts={block.text} />
        </blockquote>
      )
    case 'list':
      return (
        <ul>
          {block.items.map((item, i) => (
            <li key={i}>
              <InlineText parts={item} />
            </li>
          ))}
        </ul>
      )
    case 'table':
      return (
        <div className="doc__table">
          <table>
            <thead>
              <tr>
                {block.head.map((cell, i) => (
                  <th key={i}>
                    <InlineText parts={cell} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, i) => (
                    <td key={i}>
                      <InlineText parts={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    default:
      return (
        <p>
          <InlineText parts={block.text} />
        </p>
      )
  }
}

const TITLES: Record<Page, string> = {
  terms: 'Termos de uso',
  privacy: 'Privacidade',
  news: 'Novidades',
}

/** Termos, privacidade e novidades: abrem com ou sem login. */
export function PublicPage({ page }: { page: Page }) {
  const blocks = useMemo(() => parseMarkdown(PAGE_SOURCES[page]), [page])
  const body = blocks.filter((b) => b.kind !== 'heading' || b.level !== 1)
  const title = TITLES[page]

  return (
    <div className="shell doc">
      <div className="sticky-head">
        <header className="topbar app-header">
          <IconButton label="Voltar" className="app-header__back" onClick={up}>
            <BackArrowIcon />
          </IconButton>
          <div className="app-header__titles">
            <p className="brand-sm">App Vidros</p>
            <h1 className="title-sm">{title}</h1>
          </div>
        </header>
      </div>
      <article className="doc__body">
        {body.map((block, i) => (
          <BlockView key={i} block={block} />
        ))}
      </article>
    </div>
  )
}
