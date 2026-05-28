/**
 * generate-icons.ts
 *
 * Uses sharp to convert the SVG icon into PNGs at 16x16, 48x48, and 128x128 sizes.
 *
 * Run with: pnpm --filter scripts generate-icons
 */

import sharp from 'sharp'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync, mkdirSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SVG_PATH = join(__dirname, '..', 'packages', 'extension', 'public', 'icons', 'icon.svg')
const ICONS_DIR = join(__dirname, '..', 'packages', 'extension', 'public', 'icons')

const SIZES = [16, 48, 128]

async function main() {
  console.log('🎨 Generating PNG icons from SVG...')

  if (!existsSync(SVG_PATH)) {
    console.error(`❌ Source SVG not found at: ${SVG_PATH}`)
    process.exit(1)
  }

  // Ensure icons directory exists
  mkdirSync(ICONS_DIR, { recursive: true })

  for (const size of SIZES) {
    const outputPath = join(ICONS_DIR, `icon-${size}.png`)
    await sharp(SVG_PATH)
      .resize(size, size)
      .png()
      .toFile(outputPath)
    console.log(`  ✅ Generated icon-${size}.png`)
  }

  console.log('🎉 Done generating icons!')
}

main().catch((err) => {
  console.error('❌ Error generating icons:', err)
  process.exit(1)
})
