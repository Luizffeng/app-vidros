// Prova no servidor (RLS) que uma conta não lê nem grava dados de outra, e que conta vencida só lê.
// Requer Supabase local: `npm run db:start`. Nunca rodar contra produção.
// Uso: node scripts/tenant-isolation.mjs
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const status = JSON.parse(execFileSync('npx', ['supabase', 'status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))
const URL = status.API_URL
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(URL)) throw new Error(`Recusado: ${URL} não é local.`)

const admin = createClient(URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const results = []

function check(name, ok, detail = '') {
  results.push({ name, ok })
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : ` — ${detail}`}`)
}

async function user(label) {
  const email = `${label}-${Date.now()}@teste.local`
  const password = 'teste-123456'
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (created.error) throw created.error
  const client = createClient(URL, status.ANON_KEY, { auth: { persistSession: false } })
  const signed = await client.auth.signInWithPassword({ email, password })
  if (signed.error) throw signed.error
  return { client, userId: created.data.user.id }
}

const year = new Date().getUTCFullYear()
const quoteId = () => crypto.randomUUID()
const quotePayload = (id, number) => ({ id, number, status: 'draft', grandTotal: 100 })
const png = new Blob([Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' })

const A = await user('conta-a')
const B = await user('conta-b')

{
  const { data } = await A.client.from('accounts').select('*').maybeSingle()
  check('sessão sem conta não vê conta nenhuma', data === null)
}

const accA = (await A.client.rpc('create_account', { p_name: 'Vidraçaria A', p_whatsapp: '(11) 98888-0001', p_marketing_opt_in: true })).data
const accB = (await B.client.rpc('create_account', { p_name: 'Vidraçaria B', p_whatsapp: '11988880002', p_marketing_opt_in: false })).data
check('create_account cria conta em teste de 30 dias', accA?.plan === 'trial' && Math.round((new Date(accA.trial_ends_at) - Date.now()) / 864e5) === 30)
check('create_account guarda WhatsApp só com dígitos e opt-in', accA?.whatsapp === '11988880001' && !!accA?.marketing_opt_in_at && !accB?.marketing_opt_in_at)
{
  const again = await A.client.rpc('create_account', { p_name: 'Outra', p_whatsapp: '11988880003' })
  check('segunda conta para o mesmo login é recusada', !!again.error)
  const bad = await (await user('conta-c')).client.rpc('create_account', { p_name: 'C', p_whatsapp: '123' })
  check('WhatsApp inválido é recusado', !!bad.error)
}

// Conta A grava
const qa = quoteId()
check('A grava orçamento', !(await A.client.from('quotes').upsert({ id: qa, updated_at: new Date().toISOString(), payload: quotePayload(qa, 'ORC-A') })).error)
check('A grava catálogo', !(await A.client.from('catalog').upsert({ payload: { marca: 'A' }, updated_at: new Date().toISOString() }, { onConflict: 'account_id' })).error)
check('A regrava catálogo (upsert por conta)', !(await A.client.from('catalog').upsert({ payload: { marca: 'A2' }, updated_at: new Date().toISOString() }, { onConflict: 'account_id' })).error)
check('A grava configurações', !(await A.client.from('settings').upsert({ payload: { marca: 'A' }, logo_path: null }, { onConflict: 'account_id' })).error)
check('A envia logo na própria pasta', !(await A.client.storage.from('logos').upload(`${accA.id}/logo.png`, png, { upsert: true, contentType: 'image/png' })).error)
check('A envia sugestão', !(await A.client.from('suggestions').insert({ body: 'Sugestão da A' })).error)
{
  const forged = await A.client.from('suggestions').insert({ body: 'Respondida por mim', status: 'feita', reply: 'ok' })
  check('A não marca a própria sugestão como respondida', !!forged.error)
}

// Conta B tenta ler e mexer nos dados de A
{
  const { data } = await B.client.from('quotes').select('id')
  check('B não lista orçamentos de A', Array.isArray(data) && data.length === 0)
  const one = await B.client.from('quotes').select('payload').eq('id', qa).maybeSingle()
  check('B não abre orçamento de A pelo id', one.data === null)
  await B.client.from('quotes').update({ payload: quotePayload(qa, 'HACK') }).eq('id', qa)
  await B.client.from('quotes').delete().eq('id', qa)
  const still = await admin.from('quotes').select('payload').eq('id', qa).single()
  check('B não altera nem apaga orçamento de A', still.data?.payload?.number === 'ORC-A')
  const steal = await B.client.from('quotes').upsert({ id: quoteId(), updated_at: new Date().toISOString(), payload: {}, account_id: accA.id })
  check('B não grava orçamento na conta de A', !!steal.error)
  const cat = await B.client.from('catalog').select('payload')
  check('B não vê catálogo de A', Array.isArray(cat.data) && cat.data.length === 0)
  const set = await B.client.from('settings').select('payload')
  check('B não vê configurações de A', Array.isArray(set.data) && set.data.length === 0)
  const sug = await B.client.from('suggestions').select('id')
  check('B não vê sugestões de A', Array.isArray(sug.data) && sug.data.length === 0)
  const acc = await B.client.from('accounts').select('id')
  check('B só vê a própria conta', acc.data?.length === 1 && acc.data[0].id === accB.id)
  const logo = await B.client.storage.from('logos').download(`${accA.id}/logo.png`)
  check('B não baixa logo de A', !!logo.error)
  const up = await B.client.storage.from('logos').upload(`${accA.id}/logo.png`, png, { upsert: true, contentType: 'image/png' })
  check('B não sobrescreve logo de A', !!up.error)
}

// Numeração por conta
{
  const na = await A.client.rpc('next_quote_number')
  const nb = await B.client.rpc('next_quote_number')
  check('cada conta começa a própria sequência', na.data === `ORC-${year}-0001` && nb.data === `ORC-${year}-0001`)
  const na2 = await A.client.rpc('next_quote_number')
  check('sequência de A continua', na2.data === `ORC-${year}-0002`)
}

// Conta A vencida: só leitura
await admin.from('accounts').update({ trial_ends_at: new Date(Date.now() - 864e5).toISOString() }).eq('id', accA.id)
{
  const canWrite = await A.client.rpc('account_can_write')
  check('A vencida: account_can_write = false', canWrite.data === false)
  const read = await A.client.from('quotes').select('id')
  check('A vencida ainda lê orçamentos', read.data?.length === 1)
  const ins = await A.client.from('quotes').upsert({ id: quoteId(), updated_at: new Date().toISOString(), payload: {} })
  check('A vencida não cria orçamento', !!ins.error)
  await A.client.from('quotes').update({ payload: quotePayload(qa, 'EDIT') }).eq('id', qa)
  await A.client.from('quotes').delete().eq('id', qa)
  const still = await admin.from('quotes').select('payload').eq('id', qa).single()
  check('A vencida não edita nem apaga orçamento', still.data?.payload?.number === 'ORC-A')
  const num = await A.client.rpc('next_quote_number')
  check('A vencida não gera número', !!num.error)
  const cat = await A.client.from('catalog').upsert({ payload: { marca: 'X' } }, { onConflict: 'account_id' })
  check('A vencida não grava catálogo', !!cat.error)
  const set = await A.client.from('settings').upsert({ payload: { marca: 'X' }, logo_path: null }, { onConflict: 'account_id' })
  check('A vencida não grava configurações', !!set.error)
  const logo = await A.client.storage.from('logos').upload(`${accA.id}/logo.png`, png, { upsert: true, contentType: 'image/png' })
  check('A vencida não troca logo', !!logo.error)
  const dl = await A.client.storage.from('logos').download(`${accA.id}/logo.png`)
  check('A vencida ainda baixa a própria logo', !dl.error)
  const sug = await A.client.from('suggestions').insert({ body: 'Vencida mas falando com a gente' })
  check('A vencida ainda envia sugestão', !sug.error)
  const opt = await A.client.rpc('set_marketing_opt_in', { p_value: false })
  check('A vencida ainda muda o opt-in', !opt.error)
}

// Assinatura liberada pelo operador
await admin.from('accounts').update({ plan: 'active', active_until: new Date(Date.now() + 30 * 864e5).toISOString() }).eq('id', accA.id)
{
  const ins = await A.client.from('quotes').upsert({ id: quoteId(), updated_at: new Date().toISOString(), payload: {} })
  check('A liberada volta a gravar', !ins.error)
}
await admin.from('accounts').update({ active_until: new Date(Date.now() - 1000).toISOString() }).eq('id', accA.id)
{
  const ins = await A.client.from('quotes').upsert({ id: quoteId(), updated_at: new Date().toISOString(), payload: {} })
  check('A com assinatura vencida não grava', !!ins.error)
}
await admin.from('accounts').update({ active_until: null, disabled_at: new Date().toISOString() }).eq('id', accA.id)
{
  const ins = await A.client.from('quotes').upsert({ id: quoteId(), updated_at: new Date().toISOString(), payload: {} })
  check('A desativada não grava', !!ins.error)
}

// Vendedor não exclui a conta da loja
{
  const V = await user('vendedor-b')
  await admin.from('profiles').update({ account_id: accB.id, role: 'vendedor' }).eq('id', V.userId)
  const del = await V.client.rpc('delete_my_account')
  check('vendedor não exclui a conta', !!del.error)
  const acc = await admin.from('accounts').select('id').eq('id', accB.id)
  check('conta B continua depois do vendedor', acc.data?.length === 1)
  await admin.auth.admin.deleteUser(V.userId)
}

// Excluir conta B
{
  const del = await B.client.rpc('delete_my_account')
  check('B exclui a própria conta', !del.error, del.error?.message)
  const acc = await admin.from('accounts').select('id').eq('id', accB.id)
  const usr = await admin.auth.admin.getUserById(B.userId)
  check('conta e login de B somem', acc.data?.length === 0 && !!usr.error)
  const accAStill = await admin.from('accounts').select('id').eq('id', accA.id)
  check('conta A continua intacta', accAStill.data?.length === 1)
}

await admin.storage.from('logos').remove([`${accA.id}/logo.png`])
await admin.auth.admin.deleteUser(A.userId)
await admin.from('accounts').delete().eq('id', accA.id)

const failed = results.filter((r) => !r.ok).length
console.log(`\n${results.length - failed}/${results.length} checks ok`)
process.exit(failed ? 1 : 0)
