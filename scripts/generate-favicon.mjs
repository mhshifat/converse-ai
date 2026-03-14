/**
 * Generates app/favicon.ico from app/icon.svg (Converse logo).
 * Run from web/: node scripts/generate-favicon.mjs
 * Requires: npm install -D sharp to-ico
 */
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sharp from 'sharp';
import toIco from 'to-ico';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appDir = join(__dirname, '..', 'src', 'app');
const svgPath = join(appDir, 'icon.svg');
const outPath = join(appDir, 'favicon.ico');

const svg = readFileSync(svgPath);

async function main() {
  const sizes = [16, 32, 48];
  const pngs = await Promise.all(
    sizes.map((size) =>
      sharp(svg)
        .resize(size, size)
        .png()
        .toBuffer()
    )
  );
  const ico = await toIco(pngs);
  writeFileSync(outPath, ico);
  console.log('Generated:', outPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
