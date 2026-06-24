/**
 * Fila offline de entradas de contagem.
 *
 * Estoque costuma ficar em galpão/fundos sem sinal. Aqui as leituras são
 * persistidas em IndexedDB e sincronizadas com o Supabase assim que houver
 * rede — o vendedor nunca perde uma contagem por queda de conexão.
 *
 * Cada item pendente representa uma chamada à RPC `add_manual_entry`
 * (upsert incremental: soma `qty` por código), então reenviar é idempotente
 * em relação à intenção (cada bipe = +qty uma única vez).
 */
import { supabase } from './supabaseClient'

export type PendingEntry = {
  id: string
  count_id: string
  codigo: string
  qty: number
  ts: number
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

async function notify() {
  const all = await getAll()
  listeners.forEach(l => l(all.length))
}

export function onPendingChange(listener: Listener): () => void {
  listeners.add(listener)
  void getAll().then(all => listener(all.length))
  return () => listeners.delete(listener)
}

export async function pendingCount(): Promise<number> {
  return (await getAll()).length
}

export async function pendingCountFor(count_id: string): Promise<number> {
  return (await getAll()).filter(e => e.count_id === count_id).length
}

function uid(): string {
  // id local único sem depender de Date.now/Math.random combinados de forma frágil
  return `${Date.now().toString(36)}-${(performance.now() | 0).toString(36)}-${(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2))}`
}

/** Envia uma entrada à RPC; em caso de falha, devolve false. */
async function sendOne(entry: PendingEntry): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('add_manual_entry', {
      p_count_id: entry.count_id,
      p_codigo: entry.codigo,
      p_qty: entry.qty
    })
    return !error
  } catch {
    return false
  }
}

let flushing = false

/** Tenta drenar a fila. Para no primeiro erro (provável falta de rede). */
export async function flushQueue(): Promise<void> {
  if (flushing) return
  flushing = true
  try {
    const all = await getAll()
    for (const entry of all) {
      const ok = await sendOne(entry)
      if (!ok) break // sem rede / erro: tenta de novo depois
      await remove(entry.id)
      await notify()
    }
  } finally {
    flushing = false
  }
}

/**
 * Registra uma entrada. Tenta enviar na hora; se estiver offline ou falhar,
 * guarda na fila e sincroniza depois. Nunca lança por falta de rede.
 */
export async function enqueueEntry(count_id: string, codigo: string, qty: number): Promise<void> {
  const entry: PendingEntry = { id: uid(), count_id, codigo, qty, ts: Date.now() }

  const online = typeof navigator === 'undefined' || navigator.onLine
  if (online) {
    const ok = await sendOne(entry)
    if (ok) return
  }
  // offline ou falhou → persiste e sincroniza quando voltar
  await put(entry)
  await notify()
}

// Sincroniza automaticamente ao recuperar a conexão.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void flushQueue())
  // tentativa oportunista ao carregar
  window.setTimeout(() => void flushQueue(), 1500)
}
