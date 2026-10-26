// Reglas de proceso explícitas (dataset ds-reglas). Calculan preparación y ciclo base por pieza
// para el material de referencia (Al 6082-T6) a partir de rasgos de la pieza. Son reglas de ejemplo:
// en un piloto se calibran con fabricación antes de usarse para ofertar.
import type { OperationKind, PartFeatures } from '@/domain/types';

export interface RuleOutput {
  kind: OperationKind;
  setupMin: number;
  cycleMin: number;
  ruleText: string;
  inputsText: string;
  assumptions: string[];
}

const fmt = (n: number, d = 2) => n.toLocaleString('es-ES', { maximumFractionDigits: d });

export function routeFor(f: PartFeatures): OperationKind[] {
  if (f.family === 'torneado') {
    return ['corte', 'torneado', ...(f.holes.count > 0 ? (['taladrado'] as const) : []), 'desbarbado', 'inspeccion'];
  }
  return [
    'corte',
    'fresado',
    ...(f.pocket ? (['bolsillo'] as const) : []),
    ...(f.holes.count > 0 ? (['taladrado'] as const) : []),
    'desbarbado',
    'inspeccion',
  ];
}

export function pocketVolumeCm3(f: Pick<PartFeatures, 'pocket'>): number {
  if (!f.pocket) return 0;
  return (f.pocket.lengthMm * f.pocket.widthMm * f.pocket.depthMm) / 1000;
}

export function partVolumeCm3(f: PartFeatures): number {
  const holeVol = f.holes.count * Math.PI * (f.holes.diameterMm / 2) ** 2 * f.heightMm;
  if (f.family === 'torneado') {
    const disc = Math.PI * (f.widthMm / 2) ** 2 * f.heightMm;
    return (disc - holeVol) / 1000;
  }
  return (f.lengthMm * f.widthMm * f.heightMm - holeVol) / 1000 - pocketVolumeCm3(f);
}

export function blankVolumeCm3(f: PartFeatures): number {
  const b = f.blankMm;
  if (f.family === 'torneado') return (Math.PI * (b.width / 2) ** 2 * b.height) / 1000;
  return (b.length * b.width * b.height) / 1000;
}

export function applyRule(kind: OperationKind, f: PartFeatures): RuleOutput {
  switch (kind) {
    case 'corte': {
      const section = (f.blankMm.width * f.blankMm.height) / 100;
      return {
        kind, setupMin: 10, cycleMin: 0.2 + 0.03 * section,
        ruleText: 'ciclo = 0,2 + 0,03 × sección del bruto (cm²)',
        inputsText: `sección = ${f.blankMm.width} × ${f.blankMm.height} mm = ${fmt(section)} cm²`,
        assumptions: [],
      };
    }
    case 'fresado': {
      const perimeter = 2 * (f.lengthMm + f.widthMm);
      return {
        kind, setupMin: 20, cycleMin: 0.5 + 0.0075 * perimeter * (f.heightMm / 20),
        ruleText: 'ciclo = 0,5 + 0,0075 × perímetro (mm) × altura/20',
        inputsText: `perímetro = ${fmt(perimeter)} mm · altura = ${f.heightMm} mm`,
        assumptions: ['Contorno exterior en un único amarre'],
      };
    }
    case 'bolsillo': {
      const vol = pocketVolumeCm3(f);
      return {
        kind, setupMin: 15, cycleMin: 0.9 + 0.2 * vol,
        ruleText: 'ciclo = 0,9 + 0,2 × volumen a vaciar (cm³)',
        inputsText: f.pocket ? `${f.pocket.lengthMm} × ${f.pocket.widthMm} × ${f.pocket.depthMm} mm = ${fmt(vol)} cm³` : 'sin bolsillo',
        assumptions: ['Radios interiores compatibles con fresa estándar'],
      };
    }
    case 'taladrado': {
      const dia = Math.max(1, f.holes.diameterMm / 10);
      return {
        kind, setupMin: 10, cycleMin: 0.2 + 0.4 * f.holes.count * dia,
        ruleText: 'ciclo = 0,2 + 0,4 × nº taladros × máx(1, Ø/10)',
        inputsText: `${f.holes.count} taladros Ø${fmt(f.holes.diameterMm)}${f.holes.fit ? ` ${f.holes.fit}` : ''}`,
        assumptions: f.holes.fit ? [`Escariado ${f.holes.fit} incluido en el ciclo (supuesto)`] : [],
      };
    }
    case 'torneado': {
      return {
        kind, setupMin: 25, cycleMin: 0.6 + 0.0009 * f.widthMm * f.heightMm,
        ruleText: 'ciclo = 0,6 + 0,0009 × Ø (mm) × espesor (mm)',
        inputsText: `Ø${f.widthMm} × ${f.heightMm} mm`,
        assumptions: ['Refrentado y cilindrado en dos amarres'],
      };
    }
    case 'desbarbado':
      return {
        kind, setupMin: 5, cycleMin: 0.6 + 0.15 * f.holes.count,
        ruleText: 'ciclo = 0,6 + 0,15 × nº taladros',
        inputsText: `${f.holes.count} taladros + aristas exteriores`,
        assumptions: [],
      };
    case 'inspeccion':
      return {
        kind, setupMin: 10, cycleMin: 0.5 + 0.1 * f.criticalDims,
        ruleText: 'ciclo = 0,5 + 0,1 × cotas críticas',
        inputsText: `${f.criticalDims} cotas críticas`,
        assumptions: ['Inspección al 100 % de cotas críticas'],
      };
  }
}
