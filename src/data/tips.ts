export type TipId = 'revisar' | 'excluirRevisao'

export interface Tip {
  title: string
  /** Balão com seta para o botão, que fica destacado: o texto fala do "botão destacado", nunca de "aqui". */
  pop: string
  /** Lista em Suporte › Dicas, sem o botão à vista */
  help: string
}

export const TIPS: Record<TipId, Tip> = {
  revisar: {
    title: 'Criar uma revisão de orçamento',
    pop: 'Cliente pediu mudança? Toque no botão destacado. O emitido fica guardado e a nova versão abre como rascunho.',
    help: 'Cliente pediu mudança num orçamento emitido? Abra o orçamento e toque no ícone de revisão, no topo. O emitido fica guardado e a nova versão abre como rascunho, com o mesmo número.',
  },
  excluirRevisao: {
    title: 'Excluir rascunho de orçamento',
    pop: 'Desistiu da mudança? A lixeira destacada exclui só este rascunho. O orçamento emitido continua igual.',
    help: 'Abra o rascunho e toque na lixeira, no topo. Só o rascunho é excluído. Se ele for a revisão de um orçamento emitido, o emitido continua igual.',
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

/** "Mostrar as dicas de novo" em Suporte. */
export function resetTips(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Sem storage não há o que limpar.
  }
}
