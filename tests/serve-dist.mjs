// Servidor estático para os testes ponta a ponta: serve o build de produção
// com os MESMOS cabeçalhos de segurança do deploy (vercel.json), para que a
// política de conteúdo (CSP) seja testada de verdade.
// Uso: node tests/serve-dist.mjs [pasta] [porta]
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { localEnv } from './local-env.mjs'

const root = path.resolve(process.argv[2] || 'dist-e2e')
const port = Number(process.argv[3] || 4180)
const api = new URL(localEnv().API_URL)

const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'))
const global = Object.fromEntries(vercel.headers.find((h) => h.source === '/(.*)').headers.map((h) => [h.key, h.value]))
// Único ajuste: o Supabase local no lugar do *.supabase.co.
global['Content-Security-Policy'] = global['Content-Security-Policy']
  .replace('connect-src ', `connect-src http://${api.host} ws://${api.host} `)
delete global['Strict-Transport-Security'] // http local

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.map': 'application/json',
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  let file = path.join(root, decodeURIComponent(url.pathname))
  if (!file.startsWith(root)) { res.writeHead(403).end(); return }
  const isFile = await stat(file).then((s) => s.isFile()).catch(() => false)
  if (!isFile) file = path.join(root, 'index.html') // rotas do app
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', ...global })
    res.end(body)
  } catch {
    res.writeHead(404).end('not found')
  }
}).listen(port, '127.0.0.1', () => console.log(`servindo ${root} em http://localhost:${port}`))
