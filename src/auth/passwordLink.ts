const KEY = 'app-vidros-set-password'

/** `type` do link do Supabase. A query ganha do hash, como no cliente. */
export function passwordLinkType(href: string): 'invite' | 'recovery' | null {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }
  const hash = url.hash.startsWith('#') ? url.hash.slice(1) : ''
  const type = url.searchParams.get('type') ?? new URLSearchParams(hash).get('type')
  return type === 'invite' || type === 'recovery' ? type : null
}

export function markPasswordSetup(href: string) {
  if (!passwordLinkType(href)) return
  rememberPasswordSetup()
}

export function rememberPasswordSetup() {
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    /* aba privada */
  }
}

export function passwordSetupPending(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function clearPasswordSetup() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* aba privada */
  }
}
