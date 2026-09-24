import type { AppSettings, EstablishmentInfo } from '../domain/types'
import { DEFAULT_SHARE_CTA, formatAddressLines } from '../domain/quote'
import { DEFAULT_LOGO_DATA_URL, resolveStoredLogo } from './defaultLogo'

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
    logoDataUrl: DEFAULT_LOGO_DATA_URL,
    shareCta: DEFAULT_SHARE_CTA,
  }
}

export function normalizeSettings(raw: Partial<AppSettings> | null | undefined): AppSettings {
  const base = defaultSettings()
  if (!raw) return base
  const days = Number(raw.quoteValidityDays)
  const est: Partial<EstablishmentInfo> = raw.establishment ?? {}
  const logo = resolveStoredLogo(
    typeof raw.logoDataUrl === 'string' ? raw.logoDataUrl : undefined,
  )
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
    shareCta: typeof raw.shareCta === 'string' ? raw.shareCta.trim() : DEFAULT_SHARE_CTA,
  }
}

export function formatEstablishmentAddress(est: EstablishmentInfo): string {
  return formatAddressLines(est)
}
