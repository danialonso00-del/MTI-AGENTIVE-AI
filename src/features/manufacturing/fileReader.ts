// Lectura REAL de archivos en el navegador. Indica con precisión qué se consigue extraer y qué no:
// un archivo desconocido nunca recibe la estimación del fixture como si se hubiese leído.
import type { Attachment, AttachmentKind } from '@/domain/types';
import { sha256Hex } from '@/lib/hash';
import { uid } from '@/lib/format';

export interface DxfInfo { entities: Record<string, number>; extMin?: [number, number]; extMax?: [number, number]; circleDiameters: number[]; units?: string }

export function parseDxf(text: string): DxfInfo {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const entities: Record<string, number> = {};
  const circles: number[] = [];
  let section = '';
  let extMin: [number, number] | undefined;
  let extMax: [number, number] | undefined;
  let units: string | undefined;
  let current = '';
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = lines[i];
    const value = lines[i + 1];
    if (code === '0' && value === 'SECTION') { section = lines[i + 3] ?? ''; continue; }
    if (code === '9' && (value === '$EXTMIN' || value === '$EXTMAX')) {
      const x = Number(lines[i + 3]); const y = Number(lines[i + 5]);
      if (value === '$EXTMIN') extMin = [x, y]; else extMax = [x, y];
    }
    if (code === '9' && value === '$INSUNITS') units = lines[i + 3] === '4' ? 'mm' : lines[i + 3];
    if (section === 'ENTITIES' && code === '0' && value !== 'ENDSEC') { current = value; entities[value] = (entities[value] ?? 0) + 1; }
    if (section === 'ENTITIES' && current === 'CIRCLE' && code === '40') circles.push(Math.round(Number(value) * 2 * 1000) / 1000);
  }
  return { entities, extMin, extMax, circleDiameters: [...new Set(circles)].sort((a, b) => a - b), units };
}

export function summarizeDxf(d: DxfInfo): string[] {
  const out = [`Entidades: ${Object.entries(d.entities).map(([k, v]) => `${v} ${k}`).join(', ') || 'ninguna'}`];
  if (d.extMin && d.extMax) out.push(`Extensión del dibujo: ${(d.extMax[0] - d.extMin[0]).toFixed(1)} × ${(d.extMax[1] - d.extMin[1]).toFixed(1)}${d.units ? ` ${d.units}` : ''}`);
  if (d.circleDiameters.length) out.push(`Diámetros de círculos: ${d.circleDiameters.map((x) => `Ø${x}`).join(', ')}`);
  out.push('No determina material, tolerancias ni proceso: requieren el plano o la confirmación humana.');
  return out;
}

export function parseStepHeader(text: string): string[] | null {
  if (!text.startsWith('ISO-10303-21')) return null;
  const schema = text.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/)?.[1];
  const name = text.match(/FILE_NAME\s*\(\s*'([^']*)'/)?.[1];
  const counts: Record<string, number> = {};
  for (const m of text.matchAll(/#\d+\s*=\s*([A-Z_0-9]+)\s*\(/g)) counts[m[1]] = (counts[m[1]] ?? 0) + 1;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const pick = ['MANIFOLD_SOLID_BREP', 'ADVANCED_FACE', 'CYLINDRICAL_SURFACE', 'PLANE', 'PRODUCT'].filter((k) => counts[k]).map((k) => `${counts[k]} ${k}`);
  return [
    `Cabecera ISO-10303-21${schema ? ` · esquema ${schema}` : ''}${name ? ` · «${name}»` : ''}`,
    `${total.toLocaleString('es-ES')} entidades${pick.length ? ` (${pick.join(', ')})` : ''}`,
    'Geometría no convertida a malla ni rasgos: requiere el worker CAD (Open CASCADE), pendiente.',
  ];
}

const KIND: [RegExp, AttachmentKind][] = [[/\.(step|stp)$/i, 'step'], [/\.dxf$/i, 'dxf'], [/\.pdf$/i, 'pdf'], [/\.(csv|tsv)$/i, 'csv'], [/\.(txt|md)$/i, 'text'], [/\.(png|jpe?g|webp|gif)$/i, 'image'], [/\.glb$/i, 'glb']];

export async function readUploadedFile(file: File): Promise<Attachment & { previewUrl?: string }> {
  const buf = await file.arrayBuffer();
  const sha256 = await sha256Hex(buf);
  const kind = KIND.find(([re]) => re.test(file.name))?.[1] ?? 'unknown';
  const base = { id: uid('att'), fileName: file.name, kind, sizeBytes: file.size, sha256, uploadedByUser: true, addedAt: new Date().toISOString() };
  const text = () => new TextDecoder('utf-8', { fatal: false }).decode(buf);

  if (kind === 'step') {
    const summary = parseStepHeader(text());
    return summary
      ? { ...base, capability: 'header_read', readSummary: summary }
      : { ...base, capability: 'unsupported', readSummary: ['No es un STEP ASCII válido (falta la cabecera ISO-10303-21).'] };
  }
  if (kind === 'dxf') {
    const t = text();
    if (!/SECTION/.test(t)) return { ...base, capability: 'unsupported', readSummary: ['No parece un DXF ASCII válido.'] };
    return { ...base, capability: 'header_read', readSummary: summarizeDxf(parseDxf(t)) };
  }
  if (kind === 'csv' || kind === 'text') {
    const t = text();
    const lines = t.split(/\r?\n/).filter(Boolean);
    const sep = (lines[0]?.match(/;/g)?.length ?? 0) > (lines[0]?.match(/,/g)?.length ?? 0) ? ';' : ',';
    return {
      ...base, capability: 'text_read', textPreview: t.slice(0, 4000),
      readSummary: kind === 'csv' ? [`${lines.length} filas × ${lines[0]?.split(sep).length ?? 0} columnas (separador «${sep}»)`, 'Contenido disponible como texto; el mapeo a campos se confirma manualmente.'] : [`${lines.length} líneas de texto leídas`],
    };
  }
  if (kind === 'pdf' || kind === 'image') {
    return { ...base, capability: 'preview_only', previewUrl: URL.createObjectURL(file), readSummary: ['Solo vista previa: este modo demo no extrae cotas ni texto de PDFs/imágenes subidos.', 'Introduce o confirma los parámetros manualmente.'] };
  }
  return { ...base, capability: 'unsupported', readSummary: [`Formato no soportado (${file.name.split('.').pop()?.toUpperCase() ?? '—'}). IGES y formatos nativos CAD requieren el worker pendiente.`] };
}
