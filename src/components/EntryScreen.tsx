import { useEffect, useState, type FormEvent, type MouseEvent } from 'react'
import { fetchAuthOptions, getSupabase, type AuthOptions } from '../data/supabaseClient'
import { push } from '../nav/navigator'
import { Banner } from './Banner'
import { IconButton } from './IconButton'

type Step = 'start' | 'signup' | 'signin' | 'forgot'

const MIN_PASSWORD = 6

const SUBMIT_LABELS: Record<Step, [string, string]> = {
  start: ['', ''],
  signup: ['Criar conta', 'Criando…'],
  signin: ['Entrar', 'Entrando…'],
  forgot: ['Enviar link', 'Enviando…'],
}

const WEAK_PASSWORD = /at least|too short|weak/i

function signUpError(message: string): string {
  if (/not allowed|disabled/i.test(message)) return 'O cadastro ainda não está aberto.'
  if (/already registered|already exists/i.test(message)) return 'Este e-mail já tem conta. Use "Já tenho conta".'
  if (WEAK_PASSWORD.test(message)) return `A senha precisa ter ao menos ${MIN_PASSWORD} caracteres.`
  return 'Não foi possível criar a conta. Tente de novo.'
}

function newPasswordError(message: string): string {
  if (/different from the old/i.test(message)) return 'Use uma senha diferente da anterior.'
  if (WEAK_PASSWORD.test(message)) return `A senha precisa ter ao menos ${MIN_PASSWORD} caracteres.`
  return 'Não foi possível salvar a senha. Tente de novo.'
}

export function PasswordField({
  value,
  onChange,
  autoComplete,
}: {
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
}) {
  const [show, setShow] = useState(false)
  return (
    <span className="password-field">
      <input
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        minLength={autoComplete === 'new-password' ? MIN_PASSWORD : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
      <IconButton
        size="sm"
        className="password-field__toggle"
        label={show ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={show}
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => setShow((v) => !v)}
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </IconButton>
    </span>
  )
}

export function LegalLinks() {
  const open = (e: MouseEvent<HTMLAnchorElement>, page: 'terms' | 'privacy') => {
    e.preventDefault()
    push({ screen: 'page', page })
  }
  return (
    <p className="entry__links">
      <a href="/termos" onClick={(e) => open(e, 'terms')}>
        Termos de uso
      </a>
      {' · '}
      <a href="/privacidade" onClick={(e) => open(e, 'privacy')}>
        Política de privacidade
      </a>
    </p>
  )
}

export function EntryScreen() {
  const [options, setOptions] = useState<AuthOptions | null>(null)
  const [step, setStep] = useState<Step>('start')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    void fetchAuthOptions().then((next) => {
      if (!alive) return
      setOptions(next)
      if (!next.signup) setStep('signin')
    })
    return () => {
      alive = false
    }
  }, [])

  const go = (next: Step) => {
    setError(null)
    setNotice(null)
    setStep(next)
  }

  const onGoogle = async () => {
    const supabase = getSupabase()
    if (!supabase) return
    setError(null)
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (oauthError) setError('Não foi possível abrir o Google. Tente de novo.')
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const supabase = getSupabase()
    if (!supabase) return
    setBusy(true)
    setError(null)
    setNotice(null)
    const address = email.trim()
    if (step === 'signup') {
      const { data, error: signError } = await supabase.auth.signUp({ email: address, password })
      if (signError) setError(signUpError(signError.message))
      else if (!data.session) setNotice('Enviamos um link para o seu e-mail. Abra o link para entrar.')
    } else if (step === 'forgot') {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(address, {
        redirectTo: window.location.origin,
      })
      if (resetError) setError('Não foi possível enviar o e-mail. Tente de novo.')
      else setNotice('Se houver conta com este e-mail, enviamos um link para criar uma nova senha.')
    } else {
      const { error: signError } = await supabase.auth.signInWithPassword({ email: address, password })
      if (signError) setError('E-mail ou senha inválidos.')
    }
    setBusy(false)
  }

  if (!options) {
    return (
      <div className="shell">
        <p className="muted">Carregando…</p>
      </div>
    )
  }

  const title = { start: 'Boas-vindas', signup: 'Criar conta grátis', signin: 'Entrar', forgot: 'Nova senha' }[
    step
  ]

  return (
    <div className="shell entry">
      <header className="topbar">
        <div>
          <p className="brand-sm">App Vidros</p>
          <h1 className="title-sm">{title}</h1>
        </div>
      </header>

      {step === 'start' ? (
        <div className="entry__start">
          <p className="lede">Orçamentos de vidraçaria prontos no celular, em minutos.</p>
          <button type="button" className="btn primary" onClick={() => go('signup')}>
            Criar conta grátis
          </button>
          <button type="button" className="btn" onClick={() => go('signin')}>
            Já tenho conta
          </button>
        </div>
      ) : (
        <>
          {step !== 'forgot' && options.google && (
            <div className="entry__methods">
              <button type="button" className="btn with-icon" onClick={() => void onGoogle()}>
                <GoogleIcon />
                <span>Continuar com Google</span>
              </button>
              <p className="entry__or">ou com e-mail</p>
            </div>
          )}
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
            {step !== 'forgot' && (
              <label>
                Senha
                <PasswordField
                  value={password}
                  onChange={setPassword}
                  autoComplete={step === 'signup' ? 'new-password' : 'current-password'}
                />
              </label>
            )}
            {error && <Banner tone="error">{error}</Banner>}
            {notice && <Banner tone="ok">{notice}</Banner>}
            <button type="submit" className="btn primary" disabled={busy}>
              {SUBMIT_LABELS[step][busy ? 1 : 0]}
            </button>
          </form>
          <div className="entry__switch">
            {step === 'signin' && (
              <button type="button" className="btn ghost" onClick={() => go('forgot')}>
                Esqueci a senha
              </button>
            )}
            {step === 'signin' && options.signup && (
              <button type="button" className="btn ghost" onClick={() => go('signup')}>
                Criar conta grátis
              </button>
            )}
            {step === 'signup' && (
              <button type="button" className="btn ghost" onClick={() => go('signin')}>
                Já tenho conta
              </button>
            )}
            {step === 'forgot' && (
              <button type="button" className="btn ghost" onClick={() => go('signin')}>
                Voltar para entrar
              </button>
            )}
          </div>
        </>
      )}

      <LegalLinks />
    </div>
  )
}

/** Volta do link "Esqueci a senha": a sessão já existe, falta a senha nova. */
export function NewPasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const supabase = getSupabase()
    if (!supabase) return
    setBusy(true)
    setError(null)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (updateError) setError(newPasswordError(updateError.message))
    else onDone()
  }

  return (
    <div className="shell entry">
      <header className="topbar">
        <div>
          <p className="brand-sm">App Vidros</p>
          <h1 className="title-sm">Nova senha</h1>
        </div>
      </header>
      <form className="login-form" onSubmit={(event) => void onSubmit(event)}>
        <label>
          Nova senha
          <PasswordField value={password} onChange={setPassword} autoComplete="new-password" />
        </label>
        {error && <Banner tone="error">{error}</Banner>}
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? 'Salvando…' : 'Salvar senha'}
        </button>
      </form>
    </div>
  )
}

const EYE_ICON = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const

function EyeIcon() {
  return (
    <svg {...EYE_ICON}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg {...EYE_ICON}>
      <path d="M9.9 5.7A9.8 9.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.7 3.5M6.6 6.6C3.9 8.3 2.5 12 2.5 12S6 18.5 12 18.5a9.4 9.4 0 0 0 5.4-1.7" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M3 3l18 18" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.5 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.8h3.6c2-1.9 3.2-4.7 3.2-8.1z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.9A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7H2.1a11 11 0 0 0 0 10l3.7-2.9z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4z" />
    </svg>
  )
}
