import type { OnboardingTask, OnboardingTaskId } from '../domain/onboarding'
import { Section } from './Section'

const HINTS: Record<OnboardingTaskId, string> = {
  loja: 'Nome, telefone e logo no orçamento',
  vidros: 'Preço do m² de cada vidro',
  ferragens: 'Kits, acessórios e alumínios',
  maoDeObra: 'Quanto você cobra pelo serviço',
  primeiroOrcamento: 'Monte e envie para um cliente',
}

export function OnboardingTaskList({
  tasks,
  onOpen,
}: {
  tasks: readonly OnboardingTask[]
  onOpen: (task: OnboardingTask) => void
}) {
  return (
    <ul className="onboarding__list">
      {tasks.map((task) => (
        <li key={task.id}>
          <button
            type="button"
            className={`onboarding__task${task.done ? ' onboarding__task--done' : ''}`}
            onClick={() => onOpen(task)}
          >
            <span className="onboarding__mark" aria-hidden="true">
              {task.done ? <CheckIcon /> : null}
            </span>
            <span className="onboarding__text">
              <span className="onboarding__label">{task.label}</span>
              <span className="onboarding__hint">{task.done ? 'Feito' : HINTS[task.id]}</span>
            </span>
            <ChevronRightIcon />
          </button>
        </li>
      ))}
    </ul>
  )
}

export function OnboardingCard({
  tasks,
  onOpen,
  onDismiss,
}: {
  tasks: readonly OnboardingTask[]
  onOpen: (task: OnboardingTask) => void
  onDismiss: () => void
}) {
  const done = tasks.filter((t) => t.done).length
  return (
    <Section
      className="onboarding"
      title="Primeiros passos"
      count={`${done} de ${tasks.length}`}
      actions={
        <button type="button" className="btn link" onClick={onDismiss}>
          Dispensar
        </button>
      }
    >
      <OnboardingTaskList tasks={tasks} onOpen={onOpen} />
    </Section>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24">
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

function ChevronRightIcon() {
  return (
    <svg className="onboarding__chevron" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M9 6l6 6-6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
