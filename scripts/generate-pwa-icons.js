import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function generateIcons() {
  const logoPath = path.join(__dirname, '../public/logo.svg');
  const publicDir = path.join(__dirname, '../public');
  
  if (!fs.existsSync(logoPath)) {
    console.error(`❌ Erro: Arquivo não encontrado: ${logoPath}`);
    process.exit(1);
  }

  const sizes = [
    { width: 192, height: 192, name: 'icon-192.png' },
    { width: 192, height: 192, name: 'icon-192-maskable.png' },
    { width: 512, height: 512, name: 'icon-512.png' },
    { width: 512, height: 512, name: 'icon-512-maskable.png' },
    { width: 180, height: 180, name: 'icon-180.png' }
  ];

  console.log('🎨 Gerando ícones PWA...\n');

  for (const size of sizes) {
    try {
      const outputPath = path.join(publicDir, size.name);
      
      await sharp(logoPath)
        .resize(size.width, size.height, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ ${size.name} (${size.width}x${size.height})`);
    } catch (error) {
      console.error(`❌ Erro ao gerar ${size.name}:`, error.message);
    }
  }

  console.log('\n✨ Ícones gerados com sucesso!');
}

generateIcons().catch(console.error);
