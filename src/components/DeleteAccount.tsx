import { useState } from 'react'
import { useAccess } from '../auth/access'
import { Banner } from './Banner'
import { Modal } from './Modal'

const CONFIRM_WORD = 'EXCLUIR'

/** Fim de Configurações › Conta. Só o administrador de uma conta na nuvem (o banco recusa os demais). */
export function DeleteAccount() {
  const access = useAccess()
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (access.role !== 'admin' || !access.signOut) return null

  const close = () => {
    setConfirming(false)
    setTyped('')
    setError(null)
  }

  const deleteAll = async () => {
    try {
      setBusy(true)
      setError(null)
      await access.accounts.deleteMyAccount()
    } catch {
      setError('Não foi possível excluir agora. Nada foi apagado; tente de novo ou fale com a gente.')
      setBusy(false)
    }
  }

  return (
    <div className="delete-account">
      <button type="button" className="btn link delete-account__link" onClick={() => setConfirming(true)}>
        Excluir minha conta e dados
      </button>
      {confirming && (
        <Modal className="modal--notice modal--danger" title="Excluir conta e dados?" onClose={close}>
          <p>
            Apaga a conta, os orçamentos, o catálogo, o logo e o seu login. <strong>Não dá para desfazer.</strong>
          </p>
          <p>Se quiser guardar algum orçamento, baixe o PDF antes.</p>
          <label className="delete-account__confirm">
            <span>
              Digite <strong>{CONFIRM_WORD}</strong> para confirmar
            </span>
            <input
              value={typed}
              autoCapitalize="characters"
              autoComplete="off"
              onChange={(e) => setTyped(e.target.value)}
            />
          </label>
          {error && <Banner tone="error">{error}</Banner>}
          <div className="modal__actions">
            <button
              type="button"
              className="btn danger-solid"
              disabled={busy || typed.trim().toUpperCase() !== CONFIRM_WORD}
              onClick={() => void deleteAll()}
            >
              {busy ? 'Excluindo…' : 'Excluir tudo'}
            </button>
            <button type="button" className="btn" disabled={busy} onClick={close}>
              Cancelar
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
