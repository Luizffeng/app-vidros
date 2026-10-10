import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !key) return null
  if (!client) client = createClient(url, key)
  return client
}

export type AuthOptions = { signup: boolean; google: boolean }

/** Métodos ligados no painel do Supabase; na falha, só e-mail e sem cadastro. */
export async function fetchAuthOptions(): Promise<AuthOptions> {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key ?? '' } })
    if (!res.ok) throw new Error(String(res.status))
    const body = (await res.json()) as { disable_signup?: boolean; external?: Record<string, boolean> }
    return { signup: !body.disable_signup, google: Boolean(body.external?.google) }
  } catch {
    return { signup: false, google: false }
  }
}
