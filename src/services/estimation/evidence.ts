import type { Evidence, ManufacturingRequest } from '@/domain/types';
import { DATASET, HISTORICAL_JOBS } from '@/fixtures/manufacturing';

/** Evidencias globales: datasets de reglas, materiales, máquinas e histórico. */
export const GLOBAL_EVIDENCE: Evidence[] = [
  { id: 'ev-rules', sourceId: DATASET.rules.id, locator: `${DATASET.rules.label} · v${DATASET.rules.version} (${DATASET.rules.date})`, kind: 'rule', excerpt: 'Fórmulas de preparación y ciclo base por operación' },
  { id: 'ev-materials', sourceId: DATASET.materials.id, locator: `${DATASET.materials.label} · v${DATASET.materials.version} (${DATASET.materials.date})`, kind: 'fixture', excerpt: 'Multiplicadores de ciclo y preparación por material' },
  { id: 'ev-machines', sourceId: DATASET.machines.id, locator: `${DATASET.machines.label} · v${DATASET.machines.version} (${DATASET.machines.date})`, kind: 'fixture', excerpt: 'Capacidades, tarifas €/h y factores de velocidad' },
  ...HISTORICAL_JOBS.map<Evidence>((j) => ({
    id: `ev-hist-${j.ref}`, sourceId: DATASET.history.id, locator: `${DATASET.history.label} · ${j.ref} (${j.date})`, kind: 'fixture',
    excerpt: `${j.partName} · ${j.quantity} uds · real ${j.realLotMin} min`,
  })),
];

export function findEvidence(req: ManufacturingRequest | undefined, id: string): Evidence | undefined {
  return req?.evidence.find((e) => e.id === id) ?? GLOBAL_EVIDENCE.find((e) => e.id === id);
}

export const PROVENANCE_LABEL: Record<Evidence['kind'], string> = {
  source: 'Documento del cliente',
  rule: 'Regla de proceso',
  fixture: 'Dataset de ejemplo',
  model: 'Modelo',
  human: 'Decisión humana',
};
