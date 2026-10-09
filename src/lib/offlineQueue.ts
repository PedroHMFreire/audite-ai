/**
 * Fila offline de entradas de contagem.
 *
 * Estoque costuma ficar em galpão/fundos sem sinal. Aqui as leituras são
 * persistidas em IndexedDB e sincronizadas com o Supabase assim que houver
 * rede — o vendedor nunca perde uma contagem por queda de conexão.
 *
 * Cada item pendente representa uma chamada à RPC `add_manual_entry`, que
 * soma `qty` ao código. O `id` da leitura vai junto: o servidor guarda os ids
 * já recebidos e ignora repetições, então reenviar depois de uma resposta
 * perdida não conta a peça duas vezes.
 *
 * Falha de rede → a leitura fica na fila. Recusa do servidor (contagem
 * fechada, acesso inativo) → a leitura é descartada e o usuário é avisado;
 * mantê-la travaria todas as seguintes para sempre.
 */
import { supabase } from './supabaseClient'

export type PendingEntry = {
  id: string
  count_id: string
  codigo: string
  qty: number
  ts: number
  /** Dono da leitura: outra conta no mesmo aparelho não a envia. */
  user_id?: string
}

const DB_NAME = 'audite-offline'
const STORE = 'pending_entries'
const DB_VERSION = 1

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' })
        store.createIndex('by_count', 'count_id', { unique: false })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDB()
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode)
    const store = transaction.objectStore(STORE)
    const request = fn(store)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getAll(): Promise<PendingEntry[]> {
  try {
    return (await tx<PendingEntry[]>('readonly', s => s.getAll() as IDBRequest<PendingEntry[]>)) || []
  } catch {
    return []
  }
}

async function put(entry: PendingEntry): Promise<void> {
  await tx('readwrite', s => s.put(entry))
}

async function remove(id: string): Promise<void> {
  await tx('readwrite', s => s.delete(id))
}

// ---- Observabilidade do número de pendências (para o indicador de status) ----
type Listener = (pending: number) => void
const listeners = new Set<Listener>()

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.user.id ?? null
}

/** Pendências da conta que está logada agora. */
async function mine(): Promise<PendingEntry[]> {
  const [all, uid] = await Promise.all([getAll(), currentUserId()])
  return all.filter((e) => !e.user_id || e.user_id === uid)
}

async function notify() {
  const all = await mine()
  listeners.forEach(l => l(all.length))
}

// ---- Leituras recusadas pelo servidor ----
export type RejectedEntry = { entry: PendingEntry; reason: string }
type RejectListener = (rejected: RejectedEntry) => void
const rejectListeners = new Set<RejectListener>()

/** Avisa quando uma leitura guardada foi recusada pelo servidor e descartada. */
export function onEntryRejected(listener: RejectListener): () => void {
  rejectListeners.add(listener)
  return () => rejectListeners.delete(listener)
}

export class EntryRejectedError extends Error {}

function rejectionMessage(raw: string): string {
  if (/assinatura_inativa/.test(raw)) return 'Seu acesso está inativo. Assine para continuar contando.'
  if (/contagem_fechada/.test(raw)) return 'Esta contagem já foi finalizada. Reabra pelo relatório para incluir itens.'
  if (/contagem_nao_encontrada/.test(raw)) return 'Esta contagem não existe mais ou pertence a outra conta.'
  if (/codigo_invalido/.test(raw)) return 'Código vazio ou longo demais.'
  return raw || 'O servidor recusou a leitura.'
}

export function onPendingChange(listener: Listener): () => void {
  listeners.add(listener)
  void mine().then(all => listener(all.length))
  return () => listeners.delete(listener)
}

export async function pendingCount(): Promise<number> {
  return (await mine()).length
}

export async function pendingCountFor(count_id: string): Promise<number> {
  return (await mine()).filter(e => e.count_id === count_id).length
}

function uid(): string {
  // id local único sem depender de Date.now/Math.random combinados de forma frágil
  return `${Date.now().toString(36)}-${(performance.now() | 0).toString(36)}-${(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2))}`
}

type SendResult = { outcome: 'ok' } | { outcome: 'retry' } | { outcome: 'rejected'; reason: string }

/**
 * Envia uma leitura. Distingue "tente de novo" (sem rede, servidor fora do
 * ar, sessão expirada) de "o servidor recusou" (não adianta reenviar).
 */
async function sendOne(entry: PendingEntry): Promise<SendResult> {
  try {
    const { error, status } = await supabase.rpc('add_manual_entry', {
      p_count_id: entry.count_id,
      p_codigo: entry.codigo,
      p_qty: entry.qty,
      p_entry_id: entry.id
    })
    if (!error) return { outcome: 'ok' }
    // status 0 = a requisição nem saiu; 401 = sessão a renovar; 408/429/5xx = temporário
    if (!status || status === 401 || status === 408 || status === 429 || status >= 500) return { outcome: 'retry' }
    return { outcome: 'rejected', reason: rejectionMessage(error.message) }
  } catch {
    return { outcome: 'retry' }
  }
}

let activeFlush: Promise<void> | null = null
/** Tenta drenar a fila. Se um flush já estiver em progresso, aguarda sua conclusão. */
export async function flushQueue(): Promise<void> {
  if (activeFlush) {
    // Aguarda o flush em andamento em vez de retornar silenciosamente.
    // Isso garante que finalizar() só prossegue após todas as entradas serem enviadas.
    await activeFlush
    return
  }
  activeFlush = (async () => {
    try {
      const all = (await mine()).sort((a, b) => a.ts - b.ts)
      for (const entry of all) {
        const result = await sendOne(entry)
        if (result.outcome === 'retry') break
        await remove(entry.id)
        if (result.outcome === 'rejected') {
          rejectListeners.forEach((l) => l({ entry, reason: result.reason }))
        }
        await notify()
      }
    } finally {
      activeFlush = null
    }
  })()
  await activeFlush
}

/**
 * Registra uma leitura. Tenta enviar na hora; sem rede, guarda na fila e
 * sincroniza depois. Lança `EntryRejectedError` se o servidor recusar.
 */
export async function enqueueEntry(count_id: string, codigo: string, qty: number): Promise<void> {
  const entry: PendingEntry = { id: uid(), count_id, codigo, qty, ts: Date.now(), user_id: (await currentUserId()) ?? undefined }
  const online = typeof navigator === 'undefined' || navigator.onLine
  if (online) {
    const result = await sendOne(entry)
    if (result.outcome === 'ok') return
    if (result.outcome === 'rejected') throw new EntryRejectedError(result.reason)
  }
  // sem rede ou falha temporária → persiste e sincroniza quando voltar
  await put(entry)
  await notify()
}

// Sincroniza automaticamente ao recuperar a conexão.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void flushQueue())
  // tentativa oportunista ao carregar
  window.setTimeout(() => void flushQueue(), 1500)
}
