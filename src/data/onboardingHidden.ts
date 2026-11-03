const KEY = 'app-vidros:onboarding-hidden'
const COLLAPSED_KEY = 'app-vidros:onboarding-collapsed'
const REPLAY_KEY = 'app-vidros:onboarding-replay'

function read(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function write(key: string, on: boolean): void {
  try {
    if (on) sessionStorage.setItem(key, '1')
    else sessionStorage.removeItem(key)
  } catch {
    // Sem storage: vale só enquanto a tela estiver aberta.
  }
}

/** "Dispensar desta vez": vale até fechar o app (sessionStorage). */
export function onboardingHiddenThisSession(): boolean {
  return read(KEY)
}

export function hideOnboardingThisSession(): void {
  write(KEY, true)
}

/** Card nasce aberto; se a pessoa recolher, fica recolhido até fechar o app. */
export function onboardingCollapsedThisSession(): boolean {
  return read(COLLAPSED_KEY)
}

export function setOnboardingCollapsed(collapsed: boolean): void {
  write(COLLAPSED_KEY, collapsed)
}

/** Modo local: o card fica fora até este pedido, e só nesta abertura do app. */
export function onboardingReplayedThisSession(): boolean {
  return read(REPLAY_KEY)
}

/** Suporte › Dicas: traz o card de volta e abre ele. */
export function replayOnboardingThisSession(): void {
  write(KEY, false)
  write(COLLAPSED_KEY, false)
  write(REPLAY_KEY, true)
}
