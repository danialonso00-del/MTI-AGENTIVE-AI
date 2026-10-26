// Recuperación de trabajos históricos comparables (herramienta de C07 Conocimiento) y corrector
// simulado. El corrector NO es un modelo entrenado: factor = mediana(real/regla) en comparables.
import type { ComparableResult, MaterialId, OperationKind, PartFeatures } from '@/domain/types';
import { HISTORICAL_JOBS, MATERIALS } from '@/fixtures/manufacturing';
import { pocketVolumeCm3 } from './rules';

export const SIMILARITY_THRESHOLD = 0.6;
export const MAX_COMPARABLES = 3;
export const MIN_COMPARABLES_FOR_CORRECTION = 2;

const ratio = (a: number, b: number) => (a === 0 && b === 0 ? 1 : Math.min(a, b) / Math.max(a, b));
const env = (f: { lengthMm: number; widthMm: number; heightMm: number }) => f.lengthMm * f.widthMm * f.heightMm;

export function findComparables(
  features: PartFeatures,
  material: MaterialId | null,
  quantity: number,
): ComparableResult[] {
  const scored: ComparableResult[] = HISTORICAL_JOBS.map((job) => {
    const reasons: string[] = [];
    let exclusionReason: string | undefined;
    if (job.family !== features.family) {
      exclusionReason = `Otra familia de proceso (${job.family === 'torneado' ? 'torneado' : 'prismático fresado'}): tiempos no transferibles`;
    } else if (job.quantity <= 5) {
      exclusionReason = `Lote prototipo (${job.quantity} uds): la preparación domina, no transferible`;
    } else if (material && job.material !== material) {
      exclusionReason = `Material distinto (${MATERIALS[job.material].shortName}): parámetros de corte no transferibles`;
    } else if (Boolean(job.features.pocket) !== Boolean(features.pocket)) {
      exclusionReason = job.features.pocket ? 'Ruta distinta: el histórico incluye bolsillo' : 'Ruta distinta: el histórico no tiene bolsillo';
    }
    const envSim = ratio(env(job.features), env(features));
    const pocketSim = ratio(pocketVolumeCm3(job.features), pocketVolumeCm3(features));
    const holeSim = 1 - Math.abs(job.features.holes.count - features.holes.count) / Math.max(job.features.holes.count, features.holes.count, 1);
    const qtySim = ratio(job.quantity, Math.max(quantity, 1));
    const score = exclusionReason ? 0 : 0.45 * envSim + 0.2 * pocketSim + 0.15 * holeSim + 0.2 * qtySim;
    if (!exclusionReason) {
      reasons.push(`Envolvente ${job.features.lengthMm}×${job.features.widthMm}×${job.features.heightMm} mm (${Math.round(envSim * 100)} %)`);
      if (features.pocket) reasons.push(`Bolsillo ${Math.round(pocketSim * 100)} % del volumen`);
      reasons.push(`${job.features.holes.count} taladros vs ${features.holes.count}`);
      reasons.push(`Lote ${job.quantity} uds vs ${quantity}`);
    }
    return { job, score, reasons, included: false, exclusionReason };
  });

  const eligible = scored
    .filter((c) => !c.exclusionReason && c.score >= SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_COMPARABLES);
  for (const c of scored) {
    if (eligible.includes(c)) c.included = true;
    else if (!c.exclusionReason) c.exclusionReason = c.score < SIMILARITY_THRESHOLD ? `Similitud baja (${c.score.toFixed(2).replace('.', ',')} < 0,60)` : 'Fuera del top 3 de similitud';
  }
  return scored.sort((a, b) => Number(b.included) - Number(a.included) || b.score - a.score);
}

const median = (values: number[]) => {
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export interface CorrectionFactor {
  kind: OperationKind;
  factor: number;
  samples: { jobRef: string; ratio: number }[];
  applied: boolean;
  note: string;
}

export function correctionFactors(comparables: ComparableResult[], kinds: OperationKind[]): Record<string, CorrectionFactor> {
  const used = comparables.filter((c) => c.included);
  const out: Record<string, CorrectionFactor> = {};
  for (const kind of kinds) {
    const samples = used
      .map((c) => {
        const op = c.job.ops.find((o) => o.kind === kind);
        return op ? { jobRef: c.job.ref, ratio: Math.round((op.realCycleMin / op.ruleCycleMin) * 1000) / 1000 } : null;
      })
      .filter((x): x is { jobRef: string; ratio: number } => x !== null);
    if (samples.length >= MIN_COMPARABLES_FOR_CORRECTION) {
      const factor = Math.round(median(samples.map((s) => s.ratio)) * 100) / 100;
      out[kind] = { kind, factor, samples, applied: true, note: `Mediana real/regla en ${samples.length} comparables` };
    } else {
      out[kind] = {
        kind, factor: 1, samples, applied: false,
        note: samples.length === 0 ? 'Sin comparables: corrección no aplicada (factor 1,00)' : `Solo ${samples.length} comparable: corrección no aplicada (factor 1,00)`,
      };
    }
  }
  return out;
}
