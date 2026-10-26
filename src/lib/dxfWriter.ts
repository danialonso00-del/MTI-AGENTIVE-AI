// Escritor DXF ASCII (R12, AC1009) del contorno 2D de la pieza: contorno con radios, bolsillo y taladros.
// Se usa para generar los fixtures DXF reales de /public/demo-assets (scripts/generate-assets.mjs).
import type { PartFeatures } from '@/domain/types';

const f = (n: number) => (Math.round(n * 1000) / 1000).toFixed(3);

function roundedRect(x0: number, y0: number, L: number, W: number, r: number, layer: string): string[] {
  const e: string[] = [];
  const line = (x1: number, y1: number, x2: number, y2: number) => e.push('0', 'LINE', '8', layer, '10', f(x1), '20', f(y1), '30', '0.0', '11', f(x2), '21', f(y2), '31', '0.0');
  const arc = (cx: number, cy: number, a0: number, a1: number) => e.push('0', 'ARC', '8', layer, '10', f(cx), '20', f(cy), '30', '0.0', '40', f(r), '50', f(a0), '51', f(a1));
  line(x0 + r, y0, x0 + L - r, y0);
  arc(x0 + L - r, y0 + r, 270, 360);
  line(x0 + L, y0 + r, x0 + L, y0 + W - r);
  arc(x0 + L - r, y0 + W - r, 0, 90);
  line(x0 + L - r, y0 + W, x0 + r, y0 + W);
  arc(x0 + r, y0 + W - r, 90, 180);
  line(x0, y0 + W - r, x0, y0 + r);
  arc(x0 + r, y0 + r, 180, 270);
  return e;
}

export function holeCenters(feat: PartFeatures): [number, number][] {
  if (feat.family === 'torneado') {
    return Array.from({ length: feat.holes.count }, (_, i) => {
      const a = (i / feat.holes.count) * Math.PI * 2 + Math.PI / 2;
      const r = feat.widthMm * 0.375;
      return [feat.widthMm / 2 + r * Math.cos(a), feat.widthMm / 2 + r * Math.sin(a)];
    });
  }
  const n = feat.holes.count, inset = 12, perSide = Math.ceil(n / 2);
  const pts: [number, number][] = [];
  for (let s = 0; s < 2; s++) {
    const y = s === 0 ? inset : feat.widthMm - inset;
    const count = s === 0 ? perSide : n - perSide;
    for (let i = 0; i < count; i++) pts.push([count === 1 ? feat.lengthMm / 2 : inset + ((feat.lengthMm - 2 * inset) * i) / (count - 1), y]);
  }
  return pts;
}

export function buildDxf(feat: PartFeatures, meta: { partNumber: string; revision: string }): string {
  const ents: string[] = [];
  if (feat.family === 'torneado') {
    ents.push('0', 'CIRCLE', '8', 'CONTORNO', '10', f(feat.widthMm / 2), '20', f(feat.widthMm / 2), '30', '0.0', '40', f(feat.widthMm / 2));
  } else {
    ents.push(...roundedRect(0, 0, feat.lengthMm, feat.widthMm, 4, 'CONTORNO'));
    if (feat.pocket) {
      const px = (feat.lengthMm - feat.pocket.lengthMm) / 2, py = (feat.widthMm - feat.pocket.widthMm) / 2;
      ents.push(...roundedRect(px, py, feat.pocket.lengthMm, feat.pocket.widthMm, 3, 'BOLSILLO'));
    }
  }
  for (const [x, y] of holeCenters(feat)) ents.push('0', 'CIRCLE', '8', 'TALADROS', '10', f(x), '20', f(y), '30', '0.0', '40', f(feat.holes.diameterMm / 2));
  ents.push('0', 'TEXT', '8', 'TEXTO', '10', '0.0', '20', f(-10), '30', '0.0', '40', '3.5', '1', `${meta.partNumber} REV ${meta.revision} - EJEMPLO FICTICIO`);
  const maxX = feat.family === 'torneado' ? feat.widthMm : feat.lengthMm;
  const header = ['0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '9', '$INSUNITS', '70', '4', '9', '$EXTMIN', '10', '0.0', '20', f(-10), '30', '0.0', '9', '$EXTMAX', '10', f(maxX), '20', f(feat.widthMm), '30', '0.0', '0', 'ENDSEC'];
  const tables = ['0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', '5',
    ...['0', 'CONTORNO', 'BOLSILLO', 'TALADROS', 'TEXTO'].flatMap((name, i) => ['0', 'LAYER', '2', name, '70', '0', '62', String([7, 7, 1, 5, 3][i]), '6', 'CONTINUOUS']),
    '0', 'ENDTAB', '0', 'ENDSEC'];
  return [...header, ...tables, '0', 'SECTION', '2', 'ENTITIES', ...ents, '0', 'ENDSEC', '0', 'EOF', ''].join('\r\n');
}
