// Lê as chaves do Supabase LOCAL (Docker). Os testes nunca rodam contra produção.
import { execSync } from 'node:child_process'

export function localEnv() {
  const out = execSync('supabase status -o env', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  const env = {}
  for (const line of out.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/)
    if (m) env[m[1]] = m[2]
  }
  if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(env.API_URL || '')) {
    throw new Error('Supabase local não está rodando (supabase start). Abortando para não tocar em produção.')
  }
  return env
}
