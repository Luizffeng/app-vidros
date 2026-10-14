const KEY = 'app-vidros:onboarding-hidden'

/** "Dispensar desta vez": vale até fechar o app (sessionStorage). */
export function onboardingHiddenThisSession(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function hideOnboardingThisSession(): void {
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    // Sem storage: some só enquanto a tela estiver aberta.
  }
}
