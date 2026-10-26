// Planos de ejemplo. El mismo objeto alimenta el componente SVG del visor, el PDF generado
// (scripts/generate-assets.mjs) y el DXF. Las anclas permiten resaltar evidencias.
import type { PartFeatures } from '@/domain/types';
import { FEATURES_BR210, FEATURES_PL040, FEATURES_SP118_B, FEATURES_SP118_C, FEATURES_SP126 } from './manufacturing';

export interface DrawingSpec {
  id: string;
  partNumber: string;
  partName: string;
  revision: string;
  revisionDate: string;
  customer: string;
  materialText: string;
  finishText: string;
  generalTolerance: string;
  notes: string[];
  features: PartFeatures;
  scale: string;
  drawnBy: string;
  revisionHistory: { rev: string; date: string; text: string }[];
}

const base = {
  scale: '1:1',
  drawnBy: 'Oficina técnica (ficticio)',
};

export const DRAWINGS: Record<string, DrawingSpec> = {
  'SP-118:B': {
    ...base,
    id: 'SP-118:B', partNumber: 'SP-118', partName: 'Soporte mecanizado', revision: 'B', revisionDate: '2026-09-28',
    customer: 'Marina Norte (ficticio)', materialText: 'EN AW-6082-T6', finishText: 'Anodizado — ver hoja de requisitos',
    generalTolerance: 'ISO 2768-mK',
    notes: ['Tolerancias generales ISO 2768-mK.', '4× Ø8 H7 pasantes.', 'Romper aristas 0,3×45°.', 'Rugosidad general Ra 3,2.'],
    features: FEATURES_SP118_B,
    revisionHistory: [
      { rev: 'A', date: '2026-07-14', text: 'Emisión inicial' },
      { rev: 'B', date: '2026-09-28', text: 'Bolsillo 50×30×12; taladros a H7' },
    ],
  },
  'SP-118:C': {
    ...base,
    id: 'SP-118:C', partNumber: 'SP-118', partName: 'Soporte mecanizado', revision: 'C', revisionDate: '2026-10-05',
    customer: 'Marina Norte (ficticio)', materialText: 'EN AW-6082-T6', finishText: 'Anodizado — ver hoja de requisitos',
    generalTolerance: 'ISO 2768-mK',
    notes: ['Tolerancias generales ISO 2768-mK.', '6× Ø8 H7 pasantes.', 'Romper aristas 0,3×45°.', 'Rugosidad general Ra 3,2.'],
    features: FEATURES_SP118_C,
    revisionHistory: [
      { rev: 'A', date: '2026-07-14', text: 'Emisión inicial' },
      { rev: 'B', date: '2026-09-28', text: 'Bolsillo 50×30×12; taladros a H7' },
      { rev: 'C', date: '2026-10-05', text: 'Bolsillo prof. 16; 6 taladros' },
    ],
  },
  'BR-210:A': {
    ...base,
    id: 'BR-210:A', partNumber: 'BR-210', partName: 'Brida de amarre', revision: 'A', revisionDate: '2026-09-30',
    customer: 'Náutica Cíes (ficticio)', materialText: 'SEGÚN PEDIDO', finishText: '—', generalTolerance: 'ISO 2768-m',
    notes: ['Tolerancias generales ISO 2768-m.', '6× Ø11 pasantes a 60°.', 'Material según pedido.'],
    features: FEATURES_BR210,
    revisionHistory: [{ rev: 'A', date: '2026-09-30', text: 'Emisión inicial' }],
  },
  'PL-040:A': {
    ...base,
    id: 'PL-040:A', partNumber: 'PL-040', partName: 'Placa base', revision: 'A', revisionDate: '2026-09-18',
    customer: 'Marina Norte (ficticio)', materialText: 'EN AW-6082-T6', finishText: 'Anodizado natural 10 µm', generalTolerance: 'ISO 2768-m',
    notes: ['Tolerancias generales ISO 2768-m.', '6× Ø6,5 pasantes.', 'Romper aristas.'],
    features: FEATURES_PL040,
    revisionHistory: [{ rev: 'A', date: '2026-09-18', text: 'Emisión inicial' }],
  },
  'SP-126:A': {
    ...base,
    id: 'SP-126:A', partNumber: 'SP-126', partName: 'Soporte de bancada', revision: 'A', revisionDate: '2026-09-29',
    customer: 'Astilleros Lérez (ficticio)', materialText: 'S275JR', finishText: 'Zincado', generalTolerance: 'ISO 2768-m',
    notes: ['Tolerancias generales ISO 2768-m.', '4× Ø10 pasantes.', 'Zincado blanco 8 µm.'],
    features: FEATURES_SP126,
    revisionHistory: [{ rev: 'A', date: '2026-09-29', text: 'Emisión inicial' }],
  },
};

export interface RequirementsSheet {
  id: string;
  title: string;
  rows: { key: string; label: string; value: string; anchor: string }[];
}

export const REQUIREMENTS: Record<string, RequirementsSheet> = {
  'RFQ-2026-0042': {
    id: 'RFQ-2026-0042',
    title: 'Hoja de requisitos — RFQ-2026-0042',
    rows: [
      { key: 'partNumber', label: 'Referencia', value: 'SP-118 · Soporte mecanizado', anchor: 'req.partNumber' },
      { key: 'revision', label: 'Revisión de plano', value: 'B', anchor: 'req.revision' },
      { key: 'quantity', label: 'Lote', value: '50 uds', anchor: 'req.quantity' },
      { key: 'material', label: 'Material', value: 'EN AW-6082-T6', anchor: 'req.material' },
      { key: 'finish', label: 'Acabado', value: 'Anodizado natural 15 µm', anchor: 'req.finish' },
      { key: 'tolerance', label: 'Tolerancias', value: 'ISO 2768-mK; taladros Ø8 H7', anchor: 'req.tolerance' },
      { key: 'dueDate', label: 'Fecha de entrega solicitada', value: '06/11/2026', anchor: 'req.dueDate' },
      { key: 'packaging', label: 'Embalaje', value: 'Bolsa individual, caja de 25 uds', anchor: 'req.packaging' },
      { key: 'certs', label: 'Certificados', value: 'Certificado de material 3.1', anchor: 'req.certs' },
    ],
  },
};
