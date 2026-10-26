// Fixtures de fabricación. TODOS los datos son sintéticos y sirven para demostrar relaciones,
// no son resultados de clientes. Empresa ficticia: Talleres Delta. Clientes ficticios con dominio .example.
import type {
  HistoricalJob,
  Machine,
  MaterialId,
  OperationKind,
  PartFeatures,
} from '@/domain/types';

export const DATASET = {
  machines: { id: 'ds-maquinas', version: '2026.09-r2', date: '2026-09-22', label: 'Catálogo de máquinas y tarifas (ejemplo)' },
  materials: { id: 'ds-materiales', version: '2026.09-r1', date: '2026-09-15', label: 'Tabla de parámetros por material y operación (ejemplo)' },
  rules: { id: 'ds-reglas', version: '2026.10-r1', date: '2026-10-01', label: 'Reglas de proceso de tiempos base (ejemplo)' },
  history: { id: 'ds-historico', version: '2026.09-r3', date: '2026-09-30', label: 'Histórico de trabajos sintético' },
  costs: { id: 'ds-costes', version: '2026.09-r1', date: '2026-09-15', label: 'Costes de material y subcontratación (ejemplo)' },
} as const;

export const DATASET_VERSION = `${DATASET.rules.version}+${DATASET.machines.version}+${DATASET.materials.version}+${DATASET.history.version}`;

export const OPERATION_LABEL: Record<OperationKind, string> = {
  corte: 'Corte del bruto',
  fresado: 'Fresado exterior',
  bolsillo: 'Bolsillo',
  taladrado: 'Taladrado',
  torneado: 'Torneado',
  desbarbado: 'Desbarbado',
  inspeccion: 'Inspección',
};

export const MACHINES: Machine[] = [
  { id: 'SAW-01', name: 'Sierra de cinta automática SAW-01', workcenter: 'Corte', capabilities: ['corte'], rateEurH: 38, speedFactor: {}, attendance: 0.4, enabled: true },
  { id: 'CM-01', name: 'Centro de mecanizado 3 ejes CM-01', workcenter: 'Mecanizado CNC', capabilities: ['fresado', 'bolsillo', 'taladrado'], rateEurH: 62, speedFactor: {}, attendance: 0.3, enabled: true },
  { id: 'CM-02', name: 'Centro de mecanizado 3 ejes CM-02', workcenter: 'Mecanizado CNC', capabilities: ['fresado', 'bolsillo', 'taladrado'], rateEurH: 55, speedFactor: { fresado: 1.08, bolsillo: 1.12, taladrado: 1.05 }, attendance: 0.35, enabled: true },
  { id: 'TC-01', name: 'Torno CNC TC-01', workcenter: 'Torneado CNC', capabilities: ['torneado', 'taladrado'], rateEurH: 58, speedFactor: { taladrado: 1.1 }, attendance: 0.3, enabled: true },
  { id: 'DR-01', name: 'Taladro de columna DR-01', workcenter: 'Taladrado manual', capabilities: ['taladrado'], rateEurH: 34, speedFactor: { taladrado: 1.35 }, attendance: 1, enabled: true },
  { id: 'BN-01', name: 'Banco de desbarbado BN-01', workcenter: 'Acabado manual', capabilities: ['desbarbado'], rateEurH: 30, speedFactor: {}, attendance: 1, enabled: true },
  { id: 'QC-01', name: 'Metrología MMC QC-01', workcenter: 'Calidad', capabilities: ['inspeccion'], rateEurH: 52, speedFactor: {}, attendance: 0.6, enabled: true },
];

/** Preferencia de máquinas por operación y familia. La primera habilitada es la elegida. */
export const MACHINE_PREFERENCE: Record<string, string[]> = {
  'prismatico-fresado:corte': ['SAW-01'],
  'prismatico-fresado:fresado': ['CM-01', 'CM-02'],
  'prismatico-fresado:bolsillo': ['CM-01', 'CM-02'],
  'prismatico-fresado:taladrado': ['CM-01', 'CM-02', 'DR-01'],
  'prismatico-fresado:desbarbado': ['BN-01'],
  'prismatico-fresado:inspeccion': ['QC-01'],
  'torneado:corte': ['SAW-01'],
  'torneado:torneado': ['TC-01'],
  'torneado:taladrado': ['TC-01', 'CM-01', 'CM-02', 'DR-01'],
  'torneado:desbarbado': ['BN-01'],
  'torneado:inspeccion': ['QC-01'],
};

export interface MaterialParams {
  id: MaterialId;
  name: string;
  shortName: string;
  densityGcm3: number;
  priceEurKg: number;
  /** Multiplicador del ciclo base respecto a la referencia (aluminio 6082-T6). Específico por operación. */
  cycleMultiplier: Record<OperationKind, number>;
  setupExtraMin: Partial<Record<OperationKind, number>>;
  source: string;
}

export const MATERIALS: Record<MaterialId, MaterialParams> = {
  'al-6082-t6': {
    id: 'al-6082-t6',
    name: 'Aluminio EN AW-6082-T6',
    shortName: 'Al 6082-T6',
    densityGcm3: 2.7,
    priceEurKg: 4.8,
    cycleMultiplier: { corte: 1, fresado: 1, bolsillo: 1, taladrado: 1, torneado: 1, desbarbado: 1, inspeccion: 1 },
    setupExtraMin: {},
    source: 'Referencia de la tabla (multiplicador 1,00)',
  },
  'steel-s275': {
    id: 'steel-s275',
    name: 'Acero S275JR',
    shortName: 'Acero S275',
    densityGcm3: 7.85,
    priceEurKg: 1.35,
    cycleMultiplier: { corte: 1.6, fresado: 1.9, bolsillo: 2.1, taladrado: 1.7, torneado: 1.8, desbarbado: 1.3, inspeccion: 1 },
    setupExtraMin: { fresado: 5, bolsillo: 5 },
    source: 'Velocidades de corte de referencia del taller (fixture)',
  },
  'ss-304': {
    id: 'ss-304',
    name: 'Acero inoxidable AISI 304',
    shortName: 'Inox 304',
    densityGcm3: 8.0,
    priceEurKg: 3.9,
    cycleMultiplier: { corte: 2.0, fresado: 2.4, bolsillo: 2.7, taladrado: 2.2, torneado: 2.3, desbarbado: 1.5, inspeccion: 1 },
    setupExtraMin: { fresado: 8, bolsillo: 8, torneado: 8 },
    source: 'Velocidades de corte de referencia del taller (fixture)',
  },
};

export const MATERIAL_ALIASES: Record<string, MaterialId> = {
  '6082': 'al-6082-t6',
  'en aw-6082-t6': 'al-6082-t6',
  aluminio: 'al-6082-t6',
  s275: 'steel-s275',
  acero: 'steel-s275',
  '304': 'ss-304',
  inox: 'ss-304',
};

/** Subcontrataciones conocidas por acabado. Precio por pieza, fixture. */
export const FINISH_COSTS: { match: RegExp; label: string; eurPerPiece: number; leadDays: number }[] = [
  { match: /anodizado/i, label: 'Anodizado (subcontratado)', eurPerPiece: 1.85, leadDays: 4 },
  { match: /zincado|galvanizado/i, label: 'Zincado (subcontratado)', eurPerPiece: 1.2, leadDays: 3 },
  { match: /pasivado/i, label: 'Pasivado (subcontratado)', eurPerPiece: 2.1, leadDays: 3 },
];

export const FEATURES_SP118_B: PartFeatures = {
  family: 'prismatico-fresado',
  lengthMm: 110,
  widthMm: 70,
  heightMm: 20,
  pocket: { lengthMm: 50, widthMm: 30, depthMm: 12 },
  holes: { count: 4, diameterMm: 8, fit: 'H7' },
  criticalDims: 5,
  blankMm: { length: 120, width: 80, height: 25 },
};

export const FEATURES_SP118_C: PartFeatures = {
  ...FEATURES_SP118_B,
  pocket: { lengthMm: 50, widthMm: 30, depthMm: 16 },
  holes: { count: 6, diameterMm: 8, fit: 'H7' },
  criticalDims: 6,
};

export const FEATURES_BR210: PartFeatures = {
  family: 'torneado',
  lengthMm: 160,
  widthMm: 160,
  heightMm: 20,
  holes: { count: 6, diameterMm: 11 },
  criticalDims: 4,
  blankMm: { length: 165, width: 165, height: 25 },
};

export const FEATURES_PL040: PartFeatures = {
  family: 'prismatico-fresado',
  lengthMm: 140,
  widthMm: 90,
  heightMm: 12,
  holes: { count: 6, diameterMm: 6.5 },
  criticalDims: 4,
  blankMm: { length: 150, width: 100, height: 15 },
};

export const FEATURES_SP126: PartFeatures = {
  family: 'prismatico-fresado',
  lengthMm: 125,
  widthMm: 75,
  heightMm: 22,
  pocket: { lengthMm: 60, widthMm: 32, depthMm: 10 },
  holes: { count: 4, diameterMm: 10 },
  criticalDims: 5,
  blankMm: { length: 135, width: 85, height: 27 },
};

function job(
  id: string,
  ref: string,
  partName: string,
  family: HistoricalJob['family'],
  material: MaterialId,
  machineId: string,
  quantity: number,
  date: string,
  features: HistoricalJob['features'],
  ops: [OperationKind, number, number][],
  setupMin: number,
): HistoricalJob {
  const mapped = ops.map(([kind, ruleCycleMin, ratio]) => ({
    kind,
    ruleCycleMin,
    realCycleMin: Math.round(ruleCycleMin * ratio * 1000) / 1000,
  }));
  const realLotMin = Math.round((setupMin + quantity * mapped.reduce((s, o) => s + o.realCycleMin, 0)) * 10) / 10;
  return { id, ref, partName, family, material, machineId, quantity, date, features, ops: mapped, realLotMin };
}

// Ciclo regla por operación y ratio real/regla sintético (redondeo a 3 decimales).
export const HISTORICAL_JOBS: HistoricalJob[] = [
  job('hj-2025-118', 'OF-2025-118', 'Soporte SP-104', 'prismatico-fresado', 'al-6082-t6', 'CM-01', 40, '2025-06-12',
    { lengthMm: 105, widthMm: 70, heightMm: 20, pocket: { lengthMm: 48, widthMm: 30, depthMm: 12 }, holes: { count: 4, diameterMm: 8 } },
    [['corte', 0.8, 1.0], ['fresado', 3.1, 1.12], ['bolsillo', 4.36, 1.08], ['taladrado', 1.8, 1.03], ['desbarbado', 1.2, 0.98], ['inspeccion', 1.0, 1.0]], 72),
  job('hj-2025-131', 'OF-2025-131', 'Soporte SP-109', 'prismatico-fresado', 'al-6082-t6', 'CM-01', 60, '2025-09-03',
    { lengthMm: 115, widthMm: 75, heightMm: 22, pocket: { lengthMm: 52, widthMm: 32, depthMm: 12 }, holes: { count: 4, diameterMm: 8 } },
    [['corte', 0.86, 0.98], ['fresado', 3.65, 1.1], ['bolsillo', 4.89, 1.06], ['taladrado', 1.8, 1.05], ['desbarbado', 1.2, 1.0], ['inspeccion', 1.0, 1.02]], 70),
  job('hj-2026-007', 'OF-2026-007', 'Escuadra EQ-22', 'prismatico-fresado', 'al-6082-t6', 'CM-02', 80, '2026-01-20',
    { lengthMm: 100, widthMm: 60, heightMm: 25, pocket: { lengthMm: 40, widthMm: 30, depthMm: 10 }, holes: { count: 6, diameterMm: 6 } },
    [['corte', 0.89, 1.02], ['fresado', 4.5, 1.07], ['bolsillo', 3.3, 1.11], ['taladrado', 2.6, 1.08], ['desbarbado', 1.5, 1.03], ['inspeccion', 1.0, 0.97]], 68),
  job('hj-2025-160', 'OF-2025-160', 'Placa prototipo PL-031', 'prismatico-fresado', 'al-6082-t6', 'CM-01', 2, '2025-07-08',
    { lengthMm: 110, widthMm: 70, heightMm: 18, pocket: { lengthMm: 45, widthMm: 28, depthMm: 10 }, holes: { count: 4, diameterMm: 8 } },
    [['corte', 0.75, 1.3], ['fresado', 2.9, 1.6], ['bolsillo', 3.4, 1.7], ['taladrado', 1.8, 1.4], ['desbarbado', 1.2, 1.5], ['inspeccion', 0.9, 2.0]], 95),
  job('hj-2025-077', 'OF-2025-077', 'Carcasa CR-12', 'prismatico-fresado', 'al-6082-t6', 'CM-01', 25, '2025-04-02',
    { lengthMm: 300, widthMm: 200, heightMm: 80, pocket: { lengthMm: 260, widthMm: 160, depthMm: 60 }, holes: { count: 12, diameterMm: 6 } },
    [['corte', 5.0, 1.05], ['fresado', 30.5, 1.2], ['bolsillo', 500, 0.9], ['taladrado', 5.0, 1.1], ['desbarbado', 2.4, 1.1], ['inspeccion', 2.0, 1.2]], 140),
  job('hj-2025-203', 'OF-2025-203', 'Placa PL-036', 'prismatico-fresado', 'al-6082-t6', 'CM-02', 100, '2025-11-14',
    { lengthMm: 130, widthMm: 90, heightMm: 12, holes: { count: 6, diameterMm: 6.5 } },
    [['corte', 0.52, 1.0], ['fresado', 2.3, 1.06], ['taladrado', 2.6, 1.04], ['desbarbado', 1.5, 1.02], ['inspeccion', 0.9, 1.0]], 55),
  job('hj-2026-044', 'OF-2026-044', 'Placa PL-038', 'prismatico-fresado', 'al-6082-t6', 'CM-01', 60, '2026-03-05',
    { lengthMm: 150, widthMm: 95, heightMm: 12, holes: { count: 8, diameterMm: 6.5 } },
    [['corte', 0.55, 0.99], ['fresado', 2.6, 1.08], ['taladrado', 3.4, 1.02], ['desbarbado', 1.8, 1.0], ['inspeccion', 0.9, 1.03]], 58),
  job('hj-2026-012', 'OF-2026-012', 'Placa PL-033', 'prismatico-fresado', 'al-6082-t6', 'CM-01', 150, '2026-02-10',
    { lengthMm: 135, widthMm: 85, heightMm: 10, holes: { count: 6, diameterMm: 6.5 } },
    [['corte', 0.46, 1.01], ['fresado', 2.0, 1.04], ['taladrado', 2.6, 1.06], ['desbarbado', 1.5, 0.98], ['inspeccion', 0.9, 1.0]], 52),
  job('hj-2024-211', 'OF-2024-211', 'Soporte SP-090', 'prismatico-fresado', 'steel-s275', 'CM-01', 30, '2024-10-21',
    { lengthMm: 110, widthMm: 70, heightMm: 20, pocket: { lengthMm: 50, widthMm: 30, depthMm: 10 }, holes: { count: 4, diameterMm: 8 } },
    [['corte', 1.28, 1.04], ['fresado', 6.08, 1.15], ['bolsillo', 8.19, 1.12], ['taladrado', 3.06, 1.08], ['desbarbado', 1.56, 1.02], ['inspeccion', 1.0, 1.0]], 85),
  job('hj-2026-019', 'OF-2026-019', 'Soporte SP-112', 'prismatico-fresado', 'steel-s275', 'CM-01', 50, '2026-02-26',
    { lengthMm: 120, widthMm: 75, heightMm: 22, pocket: { lengthMm: 55, widthMm: 30, depthMm: 12 }, holes: { count: 4, diameterMm: 10 } },
    [['corte', 1.39, 1.0], ['fresado', 7.48, 1.11], ['bolsillo', 10.2, 1.1], ['taladrado', 3.06, 1.06], ['desbarbado', 1.56, 1.0], ['inspeccion', 1.0, 1.02]], 88),
  job('hj-2025-094', 'OF-2025-094', 'Brida BR-180', 'torneado', 'al-6082-t6', 'TC-01', 40, '2025-05-19',
    { lengthMm: 180, widthMm: 180, heightMm: 18, holes: { count: 8, diameterMm: 11 } },
    [['corte', 1.6, 1.0], ['torneado', 3.52, 1.09], ['taladrado', 3.4, 1.05], ['desbarbado', 1.8, 1.0], ['inspeccion', 0.9, 1.0]], 60),
  job('hj-2026-031', 'OF-2026-031', 'Brida BR-200', 'torneado', 'ss-304', 'TC-01', 24, '2026-03-30',
    { lengthMm: 200, widthMm: 200, heightMm: 22, holes: { count: 8, diameterMm: 13 } },
    [['corte', 3.9, 1.05], ['torneado', 10.5, 1.14], ['taladrado', 7.5, 1.1], ['desbarbado', 2.7, 1.04], ['inspeccion', 0.9, 1.0]], 92),
  job('hj-2024-188', 'OF-2024-188', 'Eje EJ-40', 'torneado', 'steel-s275', 'TC-01', 120, '2024-12-02',
    { lengthMm: 240, widthMm: 40, heightMm: 40, holes: { count: 1, diameterMm: 8 } },
    [['corte', 0.6, 1.0], ['torneado', 5.4, 1.12], ['taladrado', 1.0, 1.05], ['inspeccion', 1.2, 1.0]], 50),
];
