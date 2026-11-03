export type MissingPriceUi = 'modal' | 'inline'

/** `modal` on :5173, `inline` on :5174. Unset stays modal. */
export function missingPriceUi(): MissingPriceUi {
  return import.meta.env.VITE_MISSING_PRICE_UI === 'inline' ? 'inline' : 'modal'
}
