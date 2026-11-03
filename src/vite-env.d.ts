/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  /** Compare missing-price editors: `modal` (default) or `inline`. */
  readonly VITE_MISSING_PRICE_UI?: 'modal' | 'inline'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** Build date, plus the short commit on Cloudflare Pages (vite.config.ts) */
declare const __APP_VERSION__: string
