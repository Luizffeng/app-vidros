export interface ViaCepResult {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  erro?: boolean
}

export function digitsOnly(value: string, max?: number): string {
  const digits = value.replace(/\D/g, '')
  return max == null ? digits : digits.slice(0, max)
}

export function formatCep(cep: string): string {
  const d = digitsOnly(cep, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

export async function lookupCep(cep: string): Promise<ViaCepResult | null> {
  const d = digitsOnly(cep, 8)
  if (d.length !== 8) return null
  const res = await fetch(`https://viacep.com.br/ws/${d}/json/`)
  if (!res.ok) throw new Error('Falha ao consultar CEP')
  const data = (await res.json()) as ViaCepResult
  if (data.erro) return null
  return data
}
