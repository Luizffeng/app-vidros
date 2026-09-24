import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { LoginScreen } from '../components/LoginScreen'
import { getSupabase } from '../data/supabaseClient'

export type AccessRole = 'local' | 'admin' | 'vendedor'

export type Access = {
  role: AccessRole
  signOut: (() => Promise<void>) | null
}

const LOCAL_ACCESS: Access = { role: 'local', signOut: null }

const AccessContext = createContext<Access>(LOCAL_ACCESS)

export function useAccess(): Access {
  return useContext(AccessContext)
}

async function loadRole(userId: string): Promise<'admin' | 'vendedor'> {
  const supabase = getSupabase()
  if (!supabase) return 'vendedor'
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  if (error || data?.role !== 'admin') return 'vendedor'
  return 'admin'
}

export function AccessProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase()
  const [userId, setUserId] = useState<string | null | undefined>(supabase ? undefined : null)
  const [access, setAccess] = useState<Access>(LOCAL_ACCESS)

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

  useEffect(() => {
    if (!supabase) return
    if (userId === undefined) return
    if (userId === null) return
    let alive = true
    setAccess(LOCAL_ACCESS)
    void loadRole(userId).then((role) => {
      if (!alive) return
      setAccess({
        role,
        signOut: async () => {
          await supabase.auth.signOut()
        },
      })
    })
    return () => {
      alive = false
    }
  }, [supabase, userId])

  if (!supabase) {
    return <AccessContext.Provider value={LOCAL_ACCESS}>{children}</AccessContext.Provider>
  }

  if (userId === undefined || (userId && access.role === 'local')) {
    return (
      <div className="shell">
        <p className="muted">Carregando…</p>
      </div>
    )
  }

  if (!userId) {
    return <LoginScreen />
  }

  return <AccessContext.Provider value={access}>{children}</AccessContext.Provider>
}
