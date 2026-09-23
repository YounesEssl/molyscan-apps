// Technical exports of the official SVG files; never redraw the logo.
// Requires sharp (or NODE_PATH pointing to an existing sharp installation).
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'assets/brand/molyscan');
const mobile = path.join(root, 'apps/mobile/assets');
const admin = path.join(root, 'apps/admin/public');
const store = path.join(root, 'apps/mobile/store-assets/branding');
const red = '#c80632';

async function main() {
  const square = await fs.readFile(path.join(source, 'logo_molyscan_square.svg'), 'utf8');
  const bevel = await fs.readFile(path.join(source, 'logo_molyscan_bevel.svg'), 'utf8');
  for (const folder of [path.join(mobile, 'images'), path.join(admin, 'brand'), store]) {
    await fs.mkdir(folder, { recursive: true });
  }

  // Keep the actual official paths. Only remove the solid background and apply
  // a uniform centered scale for Android's foreground/small-icon formats.
  const transparent = square.replace(/<rect\s+class="cls-2"[^>]*\/>/, '');
  if (transparent === square) throw new Error('Official SVG background was not found');
  const adaptive = transparent
    .replace('<g>', '<g transform="translate(87.04 87.04) scale(0.66)">');
  const notification = transparent.replace(/#f3f4f7/g, '#ffffff');

  const png = (svg, size) => sharp(Buffer.from(svg), { density: 144 }).resize(size, size);
  await Promise.all([
    png(square, 1024).flatten({ background: red }).removeAlpha().png().toFile(path.join(mobile, 'icon.png')),
    png(adaptive, 1024).png().toFile(path.join(mobile, 'adaptive-icon.png')),
    png(notification, 96).png().toFile(path.join(mobile, 'notification-icon.png')),
    png(bevel, 1024).png().toFile(path.join(mobile, 'splash-icon.png')),
    png(bevel, 512).png().toFile(path.join(mobile, 'images/molyscan-logo.png')),
    png(bevel, 64).png().toFile(path.join(mobile, 'favicon.png')),
    png(square, 512).flatten({ background: red }).removeAlpha().png().toFile(path.join(store, 'google-play-icon.png')),
    fs.copyFile(path.join(source, 'logo_molyscan_bevel.svg'), path.join(admin, 'brand/molyscan-logo.svg')),
    fs.copyFile(path.join(source, 'logo_molyscan_bevel.svg'), path.join(admin, 'favicon.svg')),
  ]);
  console.log('Official Molyscan logo assets generated.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
