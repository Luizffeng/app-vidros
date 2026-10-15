import { useState } from 'react'
import type { OnboardingTask, OnboardingTaskId } from '../domain/onboarding'
import { onboardingCollapsedThisSession, setOnboardingCollapsed } from '../data/onboardingHidden'
import { CollapsibleSection } from './CollapsibleSection'
import { IconButton } from './IconButton'
import { Modal } from './Modal'

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
  const next = tasks.find((t) => !t.done)
  return (
    <ul className="onboarding__list">
      {tasks.map((task) => (
        <li key={task.id}>
          <button
            type="button"
            className={`onboarding__task${task.done ? ' onboarding__task--done' : ''}${task === next ? ' onboarding__task--next' : ''}`}
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
  /** `forever`: grava no cadastro; senão só esconde até abrir o app de novo */
  onDismiss: (forever: boolean) => void
}) {
  const [confirming, setConfirming] = useState(false)
  const done = tasks.filter((t) => t.done).length
  const next = tasks.find((t) => !t.done)
  return (
    <>
      <CollapsibleSection
        className={next ? 'onboarding onboarding--attention' : 'onboarding onboarding--done'}
        defaultOpen={next != null && !onboardingCollapsedThisSession()}
        onToggle={(open) => setOnboardingCollapsed(!open)}
        title={
          <span className="onboarding__title">
            <span>{next ? 'Primeiros passos' : 'Tudo pronto!'}</span>
            <span className="onboarding__next">
              {next ? `Próximo: ${next.label}` : 'Sua loja está pronta para orçar.'}
            </span>
            <span className="onboarding__bar" aria-hidden="true">
              {tasks.map((task) => (
                <span key={task.id} className={task.done ? 'onboarding__step--done' : undefined} />
              ))}
            </span>
          </span>
        }
        count={`${done} de ${tasks.length}`}
        actions={
          <IconButton
            label="Fechar primeiros passos"
            size="sm"
            onClick={() => (next ? setConfirming(true) : onDismiss(true))}
          >
            <CloseIcon />
          </IconButton>
        }
      >
        <OnboardingTaskList tasks={tasks} onOpen={onOpen} />
      </CollapsibleSection>
      {confirming && (
        <Modal className="modal--notice" title="Fechar primeiros passos?" onClose={() => setConfirming(false)}>
          <p>
            <strong>Desta vez:</strong> o card volta quando você abrir o app de novo.
          </p>
          <p>
            <strong>Para sempre:</strong> o card sai do Início, e o que faltar fica em {'Configurações\u00a0›\u00a0Conta'}.
          </p>
          <div className="modal__actions">
            <button type="button" className="btn primary" onClick={() => onDismiss(false)}>
              Dispensar desta vez
            </button>
            <button type="button" className="btn" onClick={() => onDismiss(true)}>
              Dispensar para sempre
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
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
