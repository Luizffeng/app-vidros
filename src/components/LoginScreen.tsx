import { useState, type FormEvent } from 'react'
import { getSupabase } from '../data/supabaseClient'

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const supabase = getSupabase()
    if (!supabase) return
    setBusy(true)
    setError(null)
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setBusy(false)
    if (signError) setError('E-mail ou senha inválidos.')
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <p className="brand-sm">App Vidros</p>
          <h1 className="title-sm">Entrar</h1>
        </div>
      </header>
      <form className="login-form" onSubmit={(event) => void onSubmit(event)}>
        <label>
          E-mail
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Senha
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error && <p className="banner error">{error}</p>}
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
