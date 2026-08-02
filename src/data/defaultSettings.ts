import type { AppSettings, EstablishmentInfo } from '../domain/types'

export const DEFAULT_VALIDITY_DAYS = 15

export function defaultEstablishment(): EstablishmentInfo {
  return {
    name: 'Forte Vidros',
    tradeName: '',
    document: '',
    phone: '',
    email: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  }
}

export function defaultSettings(): AppSettings {
  return {
    quoteValidityDays: DEFAULT_VALIDITY_DAYS,
    establishment: defaultEstablishment(),
    logoDataUrl: undefined,
  }
}

export function normalizeSettings(raw: Partial<AppSettings> | null | undefined): AppSettings {
  const base = defaultSettings()
  if (!raw) return base
  const days = Number(raw.quoteValidityDays)
  const est: Partial<EstablishmentInfo> = raw.establishment ?? {}
  const logo =
    typeof raw.logoDataUrl === 'string' && raw.logoDataUrl.startsWith('data:image/')
      ? raw.logoDataUrl
      : undefined
  return {
    quoteValidityDays:
      Number.isFinite(days) && days >= 1 ? Math.min(Math.round(days), 3650) : DEFAULT_VALIDITY_DAYS,
    establishment: {
      ...base.establishment,
      ...est,
      name: (est.name ?? base.establishment.name).trim() || base.establishment.name,
      state: (est.state ?? '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2),
    },
    logoDataUrl: logo,
  }
}

export function formatEstablishmentAddress(est: EstablishmentInfo): string {
  const line1 = [est.street, est.number].filter(Boolean).join(', ')
  const parts = [
    line1,
    est.complement,
    est.neighborhood,
    [est.city, est.state].filter(Boolean).join(' - '),
    est.cep
      ? `CEP ${est.cep.replace(/\D/g, '').replace(/^(\d{5})(\d{3})$/, '$1-$2')}`
      : '',
  ].filter(Boolean)
  return parts.join(' · ')
}
