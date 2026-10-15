import { supportMessage } from '../domain/account'
import type { Account, AccountState } from '../domain/types'
import { supportWhatsAppUrl } from '../data/support'
import { Modal } from './Modal'

const dateBr = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '')

/** Aberto no lugar de qualquer gravação quando a conta está em modo consulta. */
export function ExpiredNotice({
  account,
  state,
  onClose,
  onTalk,
}: {
  account: Account
  state: AccountState
  onClose: () => void
  /** Abre /suporte */
  onTalk: () => void
}) {
  const disabled = state.kind === 'disabled'
  const subscription = state.reason === 'subscription'
  const title = disabled ? 'Conta suspensa' : subscription ? 'Sua assinatura venceu' : 'Seu teste grátis terminou'

  return (
    <Modal className="modal--notice" title={title} onClose={onClose}>
      <p>
        {disabled ? (
          'Sua conta está suspensa.'
        ) : (
          <>
            {subscription ? 'Venceu' : 'Terminou'} em <strong>{dateBr(state.endsAt)}</strong>.
          </>
        )}{' '}
        Você ainda pode ver, baixar e reenviar seus orçamentos. Para criar novos,{' '}
        {disabled ? 'fale com a gente.' : 'assine o App Vidros.'}
      </p>
      <div className="modal__actions">
        {!disabled && (
          <a
            className="btn primary"
            href={supportWhatsAppUrl(supportMessage(subscription ? 'renew' : 'subscribe', account))}
            target="_blank"
            rel="noreferrer"
          >
            {subscription ? 'Renovar' : 'Quero assinar'}
          </a>
        )}
        <button type="button" className={disabled ? 'btn primary' : 'btn'} onClick={onTalk}>
          Falar com a gente
        </button>
      </div>
    </Modal>
  )
}
