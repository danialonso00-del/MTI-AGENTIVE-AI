// Genera los archivos de ejemplo reales en public/demo-assets:
//  · PDF de planos y hoja de requisitos (impresos con Chromium desde los mismos componentes del visor)
//  · DXF ASCII R12 desde los rasgos de la pieza
// Uso: npm run assets   (levanta un servidor Vite temporal; no necesita red)
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const OUT = 'public/demo-assets';
await mkdir(OUT, { recursive: true });
const server = await createServer({ server: { port: 5199, strictPort: true }, logLevel: 'error' });
await server.listen();
const base = 'http://localhost:5199';
try {
  const { DRAWINGS } = await server.ssrLoadModule('/src/fixtures/drawings.ts');
  const { buildDxf } = await server.ssrLoadModule('/src/lib/dxfWriter.ts');
  const files = [];
  for (const spec of Object.values(DRAWINGS)) {
    const name = `${spec.partNumber}_rev${spec.revision}.dxf`;
    await writeFile(`${OUT}/${name}`, buildDxf(spec.features, spec));
    files.push(name);
  }
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const key of Object.keys(DRAWINGS)) {
    const spec = DRAWINGS[key];
    await page.goto(`${base}/print/plano/${encodeURIComponent(key)}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('svg[role="img"]');
    const name = `${spec.partNumber}_rev${spec.revision}.pdf`;
    await page.pdf({ path: `${OUT}/${name}`, landscape: true, format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    files.push(name);
  }
  await page.goto(`${base}/print/requisitos/RFQ-2026-0042`, { waitUntil: 'networkidle' });
  await page.waitForSelector('table');
  await page.pdf({ path: `${OUT}/Requisitos_RFQ-2026-0042.pdf`, format: 'A4', printBackground: true });
  files.push('Requisitos_RFQ-2026-0042.pdf');
  await browser.close();
  for (const f of files) {
    const buf = await readFile(`${OUT}/${f}`);
    console.log(f.padEnd(34), String(buf.length).padStart(7), 'bytes  sha256', createHash('sha256').update(buf).digest('hex').slice(0, 16));
  }
} finally {
  await server.close();
}
