#!/usr/bin/env node
/**
 * Script para gerar ícones PNG da PWA a partir do logo.svg
 * 
 * Requisitos:
 * - Node.js 16+
 * - npm packages: sharp (instale com: npm install -D sharp)
 * 
 * Uso:
 * npx tsx scripts/generate-pwa-icons.ts
 * 
 * Gera os seguintes ícones:
 * - icon-192.png (192x192)
 * - icon-192-maskable.png (192x192, maskable format)
 * - icon-512.png (512x512)
 * - icon-512-maskable.png (512x512, maskable format)
 * - icon-180.png (180x180, apple-touch-icon)
 */

import fs from 'fs'
import path from 'path'

// Se sharp não estiver instalado, mostrar instruções
function checkSharp() {
  try {
    require.resolve('sharp')
    return true
  } catch {
    console.error('❌ Erro: Pacote "sharp" não encontrado')
    console.log('\n📦 Para instalar:')
    console.log('   npm install -D sharp')
    console.log('\nOu use alternativas online:')
    console.log('   1. https://www.photopea.com/ (carregar logo.svg)')
    console.log('   2. https://www.icoconvert.com/ (converter SVG → PNG)')
    console.log('   3. ImageMagick: convert logo.svg -resize 192x192 icon-192.png')
    process.exit(1)
  }
}

async function generateIcons() {
  checkSharp()
  
  const sharp = require('sharp')
  const logoPath = path.join(process.cwd(), 'public/logo.svg')
  const publicDir = path.join(process.cwd(), 'public')
  
  if (!fs.existsSync(logoPath)) {
    console.error(`❌ Erro: Arquivo não encontrado: ${logoPath}`)
    process.exit(1)
  }

  const sizes = [
    { width: 192, height: 192, name: 'icon-192.png' },
    { width: 192, height: 192, name: 'icon-192-maskable.png' },
    { width: 512, height: 512, name: 'icon-512.png' },
    { width: 512, height: 512, name: 'icon-512-maskable.png' },
    { width: 180, height: 180, name: 'icon-180.png' }
  ]

  console.log('🎨 Gerando ícones PWA...\n')

  for (const size of sizes) {
    try {
      const outputPath = path.join(publicDir, size.name)
      
      // Para maskable icons, adicionar background branco
      if (size.name.includes('maskable')) {
        await sharp(logoPath)
          .resize(size.width, size.height, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 0.0 }
          })
          .png()
          .toFile(outputPath)
      } else {
        await sharp(logoPath)
          .resize(size.width, size.height, {
            fit: 'contain',
            background: { r: 255, g: 255, b: 255, alpha: 1 }
          })
          .png()
          .toFile(outputPath)
      }
      
      console.log(`✅ ${size.name} (${size.width}x${size.height})`)
    } catch (error) {
      console.error(`❌ Erro ao gerar ${size.name}:`, error)
    }
  }

  console.log('\n✨ Ícones gerados com sucesso!')
}

generateIcons().catch(console.error)
