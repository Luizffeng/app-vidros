import { useState } from 'react'
import type { OnboardingTask } from '../domain/onboarding'

/**
 * Faixa abaixo do cabeçalho com o próximo passo. Some na tela da própria tarefa; logo depois
 * de concluir uma, mostra "Feito" até a pessoa mudar de tela ou de aba.
 */
export function NextStep({
  tasks,
  place,
  isHere,
  onOpen,
  onHome,
}: {
  /** Vazio quando o card foi dispensado ou a pessoa não é admin */
  tasks: readonly OnboardingTask[]
  /** Tela e aba atuais; mudar limpa o "Feito" */
  place: string
  isHere: (task: OnboardingTask) => boolean
  onOpen: (task: OnboardingTask) => void
  onHome: () => void
}) {
  const doneIds = tasks
    .filter((t) => t.done)
    .map((t) => t.id)
    .join()
  const [seenDone, setSeenDone] = useState(doneIds)
  const [seenPlace, setSeenPlace] = useState(place)
  const [justDone, setJustDone] = useState<string | null>(null)
  if (seenDone !== doneIds) {
    const was = seenDone.split(',')
    const fresh = tasks.filter((t) => t.done && !was.includes(t.id)).at(-1)
    setSeenDone(doneIds)
    if (fresh) setJustDone(fresh.label)
  }
  if (seenPlace !== place) {
    setSeenPlace(place)
    setJustDone(null)
  }

  const next = tasks.find((t) => !t.done)
  if (tasks.length === 0 || (!next && !justDone) || (next && isHere(next))) return null
  const done = tasks.filter((t) => t.done).length
  return (
    <button
      type="button"
      className={`next-step${justDone ? ' next-step--fresh' : ''}${next ? '' : ' next-step--done'}`}
      onClick={() => (next ? onOpen(next) : onHome())}
    >
      <span className="next-step__text">
        {justDone && (
          <span className="next-step__done">
            <CheckIcon /> Feito: {justDone}
          </span>
        )}
        <span className="next-step__label">
          {next ? (
            <>
              <span className="next-step__kicker">Próximo:</span> {next.label}
            </>
          ) : (
            'Tudo pronto! Ver no Início'
          )}
        </span>
      </span>
      <span className="pill">{`${done} de ${tasks.length}`}</span>
      <svg className="next-step__chevron" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M9 6l6 6-6 6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 12.5l4.2 4.2L19 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
