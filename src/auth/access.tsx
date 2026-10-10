import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { LoginScreen } from '../components/LoginScreen'
import { createAccountService } from '../data/accountService'
import { getSupabase } from '../data/supabaseClient'
import { accountState } from '../domain/account'
import type { Account, AccountService, AccountState } from '../domain/types'

/** `vendedor` fica dormente até a spec de vários usuários por loja. */
export type AccessRole = 'local' | 'admin' | 'vendedor'

export type Access = {
  role: AccessRole
  signOut: (() => Promise<void>) | null
  account: Account | null
  accountState: AccountState
  accounts: AccountService
  refreshAccount: () => Promise<void>
}

const accountService = createAccountService()

const OPEN_STATE: AccountState = { kind: 'active', warn: false, canWrite: true }

const LOCAL_ACCESS: Access = {
  role: 'local',
  signOut: null,
  account: null,
  accountState: OPEN_STATE,
  accounts: accountService,
  refreshAccount: async () => {},
}

const AccessContext = createContext<Access>(LOCAL_ACCESS)

export function useAccess(): Access {
  return useContext(AccessContext)
}

export function AccessProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase()
  const [userId, setUserId] = useState<string | null | undefined>(supabase ? undefined : null)
  /** undefined = carregando; null = sessão sem conta */
  const [account, setAccount] = useState<Account | null | undefined>(undefined)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    let alive = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return
      setUserId(data.session?.user.id ?? null)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null)
    })
    return () => {
      alive = false
      data.subscription.unsubscribe()
    }
  }, [supabase])

  const loadAccount = useCallback(async () => {
    try {
      setLoadError(null)
      setAccount(await accountService.getMyAccount())
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Não foi possível carregar a conta.')
    }
  }, [])

  useEffect(() => {
    if (!supabase || !userId) return
    setAccount(undefined)
    void loadAccount()
  }, [supabase, userId, loadAccount])

  const access = useMemo<Access | null>(() => {
    if (!supabase || !account) return null
    return {
      role: 'admin',
      signOut: async () => {
        await supabase.auth.signOut()
      },
      account,
      accountState: accountState(account),
      accounts: accountService,
      refreshAccount: loadAccount,
    }
  }, [supabase, account, loadAccount])

  if (!supabase) {
    return <AccessContext.Provider value={LOCAL_ACCESS}>{children}</AccessContext.Provider>
  }

  if (userId === null) return <LoginScreen />

  if (loadError) {
    return (
      <div className="shell">
        <p className="muted">{loadError}</p>
        <button type="button" className="btn" onClick={() => void loadAccount()}>
          Tentar de novo
        </button>
      </div>
    )
  }

  if (userId === undefined || account === undefined) {
    return (
      <div className="shell">
        <p className="muted">Carregando…</p>
      </div>
    )
  }

  if (!access) {
    return (
      <div className="shell">
        <p className="muted">Este login ainda não tem uma vidraçaria. Fale com o suporte.</p>
        <button type="button" className="btn" onClick={() => void supabase.auth.signOut()}>
          Sair
        </button>
      </div>
    )
  }

  return <AccessContext.Provider value={access}>{children}</AccessContext.Provider>
}
