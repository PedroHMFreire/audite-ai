// Gera os ícones do aplicativo a partir da marca. Uso: npm run pwa:icons
import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public')

const BRAND = '#2B50FF'
const WHITE = '#FFFFFF'

// `radius` arredonda o fundo; `scale` encolhe o símbolo. Ícones "maskable" são
// recortados pelo sistema (círculo, squircle…), então o fundo vai até a borda
// e o símbolo fica dentro da zona segura central.
const icon = ({ radius, scale }) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${radius}" fill="${BRAND}"/>
  <g transform="translate(256 256) scale(${scale}) translate(-256 -256)">
    <path d="M158 375 256 137l98 238" fill="none" stroke="${WHITE}" stroke-width="47" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M98 292h316" fill="none" stroke="${WHITE}" stroke-width="47" stroke-linecap="round"/>
  </g>
</svg>`

const files = [
  { name: 'icon-192.png', size: 192, radius: 139, scale: 1 },
  { name: 'icon-512.png', size: 512, radius: 139, scale: 1 },
  { name: 'icon-192-maskable.png', size: 192, radius: 0, scale: 0.72 },
  { name: 'icon-512-maskable.png', size: 512, radius: 0, scale: 0.72 },
  // iOS aplica o próprio arredondamento e não aceita transparência.
  { name: 'icon-180.png', size: 180, radius: 0, scale: 0.86 },
]

for (const f of files) {
  await sharp(Buffer.from(icon(f))).resize(f.size, f.size).png().toFile(path.join(publicDir, f.name))
  console.log(`${f.name} (${f.size}x${f.size})`)
}
