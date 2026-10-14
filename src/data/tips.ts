export type TipId = 'revisar' | 'excluirRevisao'

export interface Tip {
  title: string
  /** Balão ao lado do botão, no orçamento */
  pop: string
  /** Lista em Ajuda › Dicas, sem o botão à vista */
  help: string
}

export const TIPS: Record<TipId, Tip> = {
  revisar: {
    title: 'Criar uma revisão',
    pop: 'Cliente pediu mudança? Toque aqui para criar uma revisão. O emitido fica guardado e a nova versão abre como rascunho.',
    help: 'Cliente pediu mudança num orçamento emitido? Abra o orçamento e toque no ícone de revisão, no topo. O emitido fica guardado e a nova versão abre como rascunho, com o mesmo número.',
  },
  excluirRevisao: {
    title: 'Desistir de uma revisão',
    pop: 'Desistiu da mudança? A lixeira exclui só este rascunho. O orçamento emitido continua igual.',
    help: 'Desistiu da mudança? No rascunho da revisão, toque na lixeira, no topo. Só o rascunho é excluído; o orçamento emitido continua igual.',
  },
}

const KEY = 'app-vidros:tips-seen'

function read(): TipId[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

/** Cada dica aparece uma vez por aparelho. */
export function tipSeen(id: TipId): boolean {
  return read().includes(id)
}

export function markTipSeen(id: TipId): void {
  try {
    const seen = read()
    if (!seen.includes(id)) localStorage.setItem(KEY, JSON.stringify([...seen, id]))
  } catch {
    // Sem storage: a dica volta na próxima vez.
  }
}

export function anyTipSeen(): boolean {
  return read().length > 0
}

/** "Mostrar as dicas de novo" em Ajuda. */
export function resetTips(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Sem storage não há o que limpar.
  }
}
