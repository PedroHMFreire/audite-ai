// Regras de acesso do banco: isolamento entre clientes, trial e assinatura.
// Rodar com: npm run test:db  (exige `supabase start`)
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'
import { localEnv } from './local-env.mjs'

const env = localEnv()
const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, opts)
const anon = createClient(env.API_URL, env.ANON_KEY, opts)

const stamp = Date.now()
const created = []

async function newUser(tag, metadata = {}) {
  const email = `sec_${tag}_${stamp}@example.com`
  const password = 'Aa1!segura-' + stamp
  const client = createClient(env.API_URL, env.ANON_KEY, opts)
  const { data, error } = await client.auth.signUp({ email, password, options: { data: metadata } })
  assert.ifError(error)
  assert.ok(data.session, 'signup deve devolver sessão no ambiente local')
  created.push(data.user.id)
  return { client, id: data.user.id, email, password }
}

let a, b, countA

before(async () => {
  a = await newUser('a', {
    store_name: 'Loja A',
    owner_name: 'Ana',
    // tentativa de forjar o trial pelo navegador
    trial_end: '2099-01-01T00:00:00Z',
    trial_active: true,
    subscription_status: 'active',
  })
  b = await newUser('b', { store_name: 'Loja B' })
  const { data, error } = await a.client.from('counts')
    .insert({ user_id: a.id, nome: 'Contagem A' }).select('*').single()
  assert.ifError(error)
  countA = data
  assert.equal(countA.status, 'em_andamento')
  assert.ifError((await a.client.rpc('add_manual_entry', { p_count_id: countA.id, p_codigo: '123', p_qty: 2 })).error)
  assert.ifError((await a.client.from('plan_items').insert({ count_id: countA.id, codigo: '123', nome: 'Vestido', saldo: 3 })).error)
})

after(async () => {
  for (const id of created) await admin.auth.admin.deleteUser(id).catch(() => {})
})

test('visitante sem login não lê nenhuma tabela', async () => {
  for (const table of ['counts', 'user_profiles', 'subscriptions', 'organization_invitations', 'product_catalog', 'manual_entries']) {
    const { data, error } = await anon.from(table).select('*').limit(1)
    assert.ok(error || (data || []).length === 0, `${table} exposta para anon`)
  }
})

test('visitante sem login não envia arquivo para o bucket contagens', async () => {
  const { error } = await anon.storage.from('contagens').upload(`x_${stamp}.txt`, new Blob(['x']))
  assert.ok(error, 'upload anônimo deveria falhar')
})

test('usuário logado também não envia arquivo para o bucket contagens', async () => {
  const { error } = await a.client.storage.from('contagens').upload(`y_${stamp}.txt`, new Blob(['y']))
  assert.ok(error)
})

test('trial é definido pelo servidor: 7 dias, ignorando metadados do cadastro', async () => {
  const { data, error } = await a.client.from('subscriptions').select('*').single()
  assert.ifError(error)
  assert.equal(data.status, 'trialing')
  const days = (new Date(data.trial_ends_at) - Date.now()) / 86400000
  assert.ok(days > 6.9 && days < 7.1, `trial de ${days} dias`)
})

test('perfil é criado no cadastro com os dados da loja', async () => {
  const { data, error } = await a.client.from('user_profiles').select('*').single()
  assert.ifError(error)
  assert.equal(data.store_name, 'Loja A')
  assert.equal(data.owner_name, 'Ana')
})

test('usuário não altera a própria assinatura', async () => {
  const upd = await a.client.from('subscriptions')
    .update({ status: 'active', trial_ends_at: '2099-01-01' }).eq('user_id', a.id).select()
  assert.ok(upd.error || upd.data.length === 0)
  const ins = await a.client.from('subscriptions').insert({ user_id: a.id, status: 'active' })
  assert.ok(ins.error)
  const del = await a.client.from('subscriptions').delete().eq('user_id', a.id).select()
  assert.ok(del.error || del.data.length === 0)
  const { data } = await admin.from('subscriptions').select('status').eq('user_id', a.id).single()
  assert.equal(data.status, 'trialing')
})

test('usuário não altera campos de plano no perfil, mas altera dados cadastrais', async () => {
  const bad = await a.client.from('user_profiles')
    .update({ subscription_status: 'active', trial_end: '2099-01-01' }).eq('id', a.id)
  assert.ok(bad.error, 'atualizar subscription_status deveria falhar')
  const ok = await a.client.from('user_profiles').update({ store_name: 'Loja A2' }).eq('id', a.id).select().single()
  assert.ifError(ok.error)
  assert.equal(ok.data.store_name, 'Loja A2')
  const del = await a.client.from('user_profiles').delete().eq('id', a.id)
  assert.ok(del.error, 'apagar o perfil deveria falhar')
})

test('usuário não se promove a administrador', async () => {
  const upd = await a.client.from('user_roles').update({ role: 'admin' }).eq('user_id', a.id)
  assert.ok(upd.error)
  const { data } = await a.client.rpc('is_admin')
  assert.equal(data, false)
})

test('cliente B não lê nem altera dados do cliente A', async () => {
  for (const [table, col] of [['counts', 'id'], ['manual_entries', 'count_id'], ['plan_items', 'count_id'], ['results', 'count_id']]) {
    const { data } = await b.client.from(table).select('*').eq(col, countA.id)
    assert.equal((data || []).length, 0, `${table} do A visível para o B`)
  }
  const ins = await b.client.from('manual_entries').insert({ count_id: countA.id, codigo: '999', qty: 1 })
  assert.ok(ins.error)
  const rpc = await b.client.rpc('add_manual_entry', { p_count_id: countA.id, p_codigo: '999', p_qty: 1 })
  assert.ok(rpc.error)
  const fin = await b.client.rpc('compute_count_results', { p_count_id: countA.id })
  assert.ok(fin.error)
  const del = await b.client.from('counts').delete().eq('id', countA.id).select()
  assert.equal((del.data || []).length, 0)
  const forge = await b.client.from('counts').insert({ user_id: a.id, nome: 'forjada' })
  assert.ok(forge.error)
  const prof = await b.client.from('user_profiles').select('*').eq('id', a.id)
  assert.equal((prof.data || []).length, 0)
  const sub = await b.client.from('subscriptions').select('*').eq('user_id', a.id)
  assert.equal((sub.data || []).length, 0)
})

test('convites: B não lista convites da organização de A; prévia exige o token', async () => {
  const org = await a.client.rpc('create_organization', { p_name: 'Org A' })
  assert.ifError(org.error)
  const inv = await a.client.from('organization_invitations')
    .insert({ org_id: org.data, invited_by: a.id }).select('*').single()
  assert.ifError(inv.error)
  const leak = await b.client.from('organization_invitations').select('*')
  assert.equal((leak.data || []).length, 0, 'convites de outra organização visíveis')
  const preview = await b.client.rpc('get_invitation_preview', { p_token: inv.data.token })
  assert.ifError(preview.error)
  assert.equal(preview.data[0].org_name, 'Org A')
  assert.equal(preview.data[0].is_valid, true)
  const none = await b.client.rpc('get_invitation_preview', { p_token: '00000000-0000-0000-0000-000000000000' })
  assert.equal((none.data || []).length, 0)
})

test('funções administrativas negam acesso a usuário comum', async () => {
  assert.ok((await a.client.rpc('admin_grant_access', { p_user_id: a.id, p_days: 30 })).error)
  assert.ok((await a.client.rpc('admin_list_customers')).error)
  assert.ok((await a.client.rpc('admin_list_users_with_roles')).error)
})

test('leitura com identificador: reenviar não soma duas vezes', async () => {
  const send = (entry, qty = 1) => a.client.rpc('add_manual_entry', { p_count_id: countA.id, p_codigo: 'IDEM-1', p_qty: qty, p_entry_id: entry })
  const first = await send('entrada-0001', 2)
  assert.ifError(first.error)
  assert.equal(first.data, true)
  const again = await send('entrada-0001', 2)
  assert.ifError(again.error)
  assert.equal(again.data, false, 'reenvio deve ser reconhecido')
  assert.equal((await send('entrada-0002', 3)).data, true)
  const { data } = await a.client.from('manual_entries').select('qty').eq('count_id', countA.id).eq('codigo', 'IDEM-1').single()
  assert.equal(data.qty, 5)
  await a.client.from('manual_entries').delete().eq('count_id', countA.id).eq('codigo', 'IDEM-1')
})

test('leitura com identificador: outro cliente e código inválido são recusados', async () => {
  const other = await b.client.rpc('add_manual_entry', { p_count_id: countA.id, p_codigo: 'X', p_qty: 1, p_entry_id: 'entrada-b-0001' })
  assert.match(other.error?.message || '', /contagem_nao_encontrada/)
  const empty = await a.client.rpc('add_manual_entry', { p_count_id: countA.id, p_codigo: '   ', p_qty: 1, p_entry_id: 'entrada-0003' })
  assert.match(empty.error?.message || '', /codigo_invalido/)
  const receipts = await a.client.from('manual_entry_receipts').select('*')
  assert.ok(receipts.error || receipts.data.length === 0, 'recibos não são legíveis pelo cliente')
})

test('trial vencido: lê tudo, mas não cria nem altera contagens', async () => {
  await admin.from('subscriptions').update({ trial_ends_at: new Date(Date.now() - 3600e3).toISOString() }).eq('user_id', a.id)
  const access = await a.client.rpc('my_access')
  assert.ifError(access.error)
  assert.equal(access.data.has_access, false)
  assert.equal(access.data.status, 'trialing')

  const read = await a.client.from('counts').select('*').eq('id', countA.id)
  assert.equal(read.data.length, 1, 'leitura deve continuar')
  const entries = await a.client.from('manual_entries').select('*').eq('count_id', countA.id)
  assert.equal(entries.data.length, 1)

  assert.ok((await a.client.from('counts').insert({ user_id: a.id, nome: 'nova' })).error)
  assert.ok((await a.client.rpc('add_manual_entry', { p_count_id: countA.id, p_codigo: '123', p_qty: 1 })).error)
  const withId = await a.client.rpc('add_manual_entry', { p_count_id: countA.id, p_codigo: '123', p_qty: 1, p_entry_id: 'entrada-vencida-1' })
  assert.match(withId.error?.message || '', /assinatura_inativa/)
  assert.ok((await a.client.from('plan_items').insert({ count_id: countA.id, codigo: '9', nome: 'x', saldo: 1 })).error)
  const fin = await a.client.rpc('compute_count_results', { p_count_id: countA.id })
  assert.match(fin.error?.message || '', /assinatura_inativa/)
})

test('assinatura ativa libera de novo e a contagem é finalizada corretamente', async () => {
  await admin.from('subscriptions').update({
    status: 'active', current_period_end: new Date(Date.now() + 30 * 86400e3).toISOString(),
  }).eq('user_id', a.id)
  assert.equal((await a.client.rpc('my_access')).data.has_access, true)
  const fin = await a.client.rpc('compute_count_results', { p_count_id: countA.id })
  assert.ifError(fin.error)
  // plano: 3 unidades do código 123; contado: 2 → uma falta
  assert.deepEqual(fin.data[0], { regular: 0, falta: 1, excesso: 0, total: 1 })
  const closed = await a.client.rpc('add_manual_entry', { p_count_id: countA.id, p_codigo: '123', p_qty: 1, p_entry_id: 'entrada-fechada-1' })
  assert.match(closed.error?.message || '', /contagem_fechada/)
})

test('cancelada continua valendo até o fim do período pago', async () => {
  await admin.from('subscriptions').update({
    status: 'canceled', current_period_end: new Date(Date.now() + 86400e3).toISOString(),
  }).eq('user_id', a.id)
  assert.equal((await a.client.rpc('my_access')).data.has_access, true)
  await admin.from('subscriptions').update({
    current_period_end: new Date(Date.now() - 86400e3).toISOString(),
  }).eq('user_id', a.id)
  assert.equal((await a.client.rpc('my_access')).data.has_access, false)
})

test('administrador libera acesso manualmente e sempre tem acesso', async () => {
  await admin.from('user_roles').update({ role: 'admin', permissions: ['view_admin_dashboard'] }).eq('user_id', b.id)
  assert.equal((await b.client.rpc('is_admin')).data, true)
  assert.ifError((await b.client.rpc('admin_grant_access', { p_user_id: a.id, p_days: 30 })).error)
  const acc = (await a.client.rpc('my_access')).data
  assert.equal(acc.has_access, true)
  assert.equal(acc.status, 'comp')
  const list = await b.client.rpc('admin_list_customers')
  assert.ifError(list.error)
  assert.ok(list.data.some((r) => r.user_id === a.id && r.has_access === true))
  await admin.from('subscriptions').update({ trial_ends_at: new Date(Date.now() - 1e6).toISOString() }).eq('user_id', b.id)
  assert.equal((await b.client.rpc('my_access')).data.has_access, true)
  await admin.from('user_roles').update({ role: 'user', permissions: [] }).eq('user_id', b.id)
})

test('exclusão de conta apaga todos os dados do usuário', async () => {
  const c = await newUser('c', { store_name: 'Loja C' })
  const cnt = await c.client.from('counts').insert({ user_id: c.id, nome: 'C1' }).select('id').single()
  assert.ifError(cnt.error)
  await c.client.rpc('add_manual_entry', { p_count_id: cnt.data.id, p_codigo: '1', p_qty: 1 })
  await c.client.from('categories').insert({ user_id: c.id, name: 'Vestidos' })
  assert.ifError((await c.client.rpc('delete_my_account')).error)
  for (const [table, col] of [['counts', 'user_id'], ['categories', 'user_id'], ['user_profiles', 'id'], ['subscriptions', 'user_id'], ['user_roles', 'user_id']]) {
    const { data } = await admin.from(table).select('*').eq(col, c.id)
    assert.equal(data.length, 0, `${table} ainda tem dados`)
  }
  const { data: entries } = await admin.from('manual_entries').select('*').eq('count_id', cnt.data.id)
  assert.equal(entries.length, 0)
  const { data: u } = await admin.auth.admin.getUserById(c.id)
  assert.equal(u.user, null)
})
