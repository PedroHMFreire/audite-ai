import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Hook customizado para caching de dados com expiração
 * Uso: const { data, loading, error, refresh } = useCache(fetchFunction, cacheKey, 5 * 60 * 1000)
 */
export function useCache<T>(
  fetchFn: () => Promise<T>,
  cacheKey: string,
  ttlMs: number = 5 * 60 * 1000 // 5 minutos como padrão
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const cacheRef = useRef<{ data: T; timestamp: number } | null>(null)

  // Verifica se cache está válido
  const isCacheValid = useCallback(() => {
    if (!cacheRef.current) return false
    const elapsed = Date.now() - cacheRef.current.timestamp
    return elapsed < ttlMs
  }, [ttlMs])

  // Função para fazer fetch com caching
  const fetchWithCache = useCallback(async () => {
    // Se cache válido, retorna do cache
    if (isCacheValid() && cacheRef.current) {
      setData(cacheRef.current.data)
      setLoading(false)
      return cacheRef.current.data
    }

    // Caso contrário, faz novo fetch
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFn()
      cacheRef.current = {
        data: result,
        timestamp: Date.now()
      }
      setData(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [fetchFn, isCacheValid])

  // Função para limpar cache manualmente
  const refresh = useCallback(async () => {
    cacheRef.current = null
    return fetchWithCache()
  }, [fetchWithCache])

  // Função para invalidar cache manualmente
  const invalidate = useCallback(() => {
    cacheRef.current = null
  }, [])

  // Executa fetch na montagem
  useEffect(() => {
    fetchWithCache()
  }, [cacheKey]) // Re-executa se cacheKey mudar

  return {
    data,
    loading,
    error,
    refresh,
    invalidate,
    isStale: !isCacheValid()
  }
}

/**
 * Hook para cache de multiplos dados com dependências
 * Útil para categorias, configs, etc que são usados juntos
 */
export function useMultiCache<T extends Record<string, any>>(
  fetchFns: { [K in keyof T]: () => Promise<T[K]> },
  cacheKey: string,
  ttlMs: number = 5 * 60 * 1000
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const cacheRef = useRef<{ data: T; timestamp: number } | null>(null)

  const isCacheValid = useCallback(() => {
    if (!cacheRef.current) return false
    const elapsed = Date.now() - cacheRef.current.timestamp
    return elapsed < ttlMs
  }, [ttlMs])

  const fetchWithCache = useCallback(async () => {
    if (isCacheValid() && cacheRef.current) {
      setData(cacheRef.current.data)
      setLoading(false)
      return cacheRef.current.data
    }

    setLoading(true)
    setError(null)
    try {
      // Executa todos os fetches em paralelo
      const entries = await Promise.all(
        Object.entries(fetchFns).map(async ([key, fn]) => [
          key,
          await fn()
        ])
      )
      const result = Object.fromEntries(entries) as T

      cacheRef.current = {
        data: result,
        timestamp: Date.now()
      }
      setData(result)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [fetchFns, isCacheValid])

  const refresh = useCallback(async () => {
    cacheRef.current = null
    return fetchWithCache()
  }, [fetchWithCache])

  const invalidate = useCallback(() => {
    cacheRef.current = null
  }, [])

  useEffect(() => {
    fetchWithCache()
  }, [cacheKey])

  return {
    data,
    loading,
    error,
    refresh,
    invalidate,
    isStale: !isCacheValid()
  }
}

/**
 * Singleton cache para dados que devem persistir na memória durante a sessão
 * Uso: const categories = useSessionCache('getCategories', getCategories, 10 * 60 * 1000)
 */
const sessionCache = new Map<string, { data: any; timestamp: number }>()

export function useSessionCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlMs: number = 10 * 60 * 1000 // 10 minutos
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const loadData = async () => {
      const cached = sessionCache.get(key)
      const now = Date.now()

      // Valida cache
      if (cached && now - cached.timestamp < ttlMs) {
        setData(cached.data)
        setLoading(false)
        return
      }

      // Fetch novo
      setLoading(true)
      try {
        const result = await fetchFn()
        sessionCache.set(key, {
          data: result,
          timestamp: Date.now()
        })
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [key, ttlMs])

  const refresh = async () => {
    sessionCache.delete(key)
    const result = await fetchFn()
    sessionCache.set(key, {
      data: result,
      timestamp: Date.now()
    })
    setData(result)
    return result
  }

  const invalidate = () => {
    sessionCache.delete(key)
  }

  return {
    data,
    loading,
    error,
    refresh,
    invalidate
  }
}

// Função auxiliar para limpar todo o session cache se necessário
export function clearSessionCache() {
  sessionCache.clear()
}
