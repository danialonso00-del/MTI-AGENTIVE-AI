// Motor de licitaciones de obra: filtrado según el perfil de la empresa, valoración de mediciones
// contra la base de precios, planificación por capítulos y oferta económica. Determinista y
// explicable: cada cifra indica su regla o su fuente. Datos y precios de ejemplo.
import { BAJA_HISTORY, COMPANY, LABOUR_RATE, MACHINE_RATE, PRICE_BASE, type Classification, type CompanyProfile, type Tender } from '@/fixtures/tenders';

export const TENDER_FLOW = [
  { id: 'portal', title: 'Vigilancia de portales', agent: 'C01' },
  { id: 'filter', title: 'Filtrado por perfil', agent: 'C02' },
  { id: 'pliegos', title: 'Lectura de pliegos', agent: 'C02' },
  { id: 'mediciones', title: 'Mediciones y precios', agent: 'C07' },
  { id: 'costes', title: 'Costes y oferta', agent: 'C02' },
  { id: 'plan', title: 'Planificación', agent: 'C05' },
  { id: 'riesgos', title: 'Riesgos', agent: 'C08' },
  { id: 'decision', title: 'Decisión', agent: 'MTI' },
];

export const WORKDAYS_PER_MONTH = 21;
export const CI_PCT = 5; // costes indirectos de obra sobre coste directo
export const COMPANY_GG_PCT = 9; // gastos generales reales de la empresa
export const PEC_FACTOR = 1.19; // 13 % GG + 6 % BI sobre el PEM del proyecto (presupuesto base)

/** Categoría de clasificación según la anualidad media (RD 773/2015, art. 26). */
export function requiredCategory(estimatedValue: number, months: number) {
  const annual = months > 12 ? estimatedValue / (months / 12) : estimatedValue;
  const cat = annual <= 150_000 ? 1 : annual <= 360_000 ? 2 : annual <= 840_000 ? 3 : annual <= 2_400_000 ? 4 : annual <= 5_000_000 ? 5 : 6;
  return { annual, cat };
}

const daysBetween = (a: Date, iso: string) => Math.ceil((new Date(`${iso}T23:59:00`).getTime() - a.getTime()) / 86_400_000);
const eur0 = (n: number) => `${Math.round(n).toLocaleString('es-ES')} €`;

export interface ScreenResult { tender: Tender; applies: boolean; score: number; passed: string[]; rejected: string[]; warnings: string[]; daysLeft: number }

export function screenTender(t: Tender, p: CompanyProfile = COMPANY, today = new Date()): ScreenResult {
  const passed: string[] = [], rejected: string[] = [], warnings: string[] = [];
  const cpvHit = t.cpv.find((c) => p.cpvPrefixes.some((x) => c.code.startsWith(x.code)));
  if (cpvHit) passed.push(`CPV ${cpvHit.code} dentro de la actividad (${p.cpvPrefixes.find((x) => cpvHit.code.startsWith(x.code))!.label})`);
  else rejected.push(`Objeto fuera de la actividad: CPV ${t.cpv[0].code} · ${t.cpv[0].label}`);
  if (p.regions.includes(t.province)) passed.push(`Ámbito: ${t.province}`);
  else rejected.push(`Fuera del ámbito geográfico (${t.province})`);
  if (t.budget >= p.minBudget && t.budget <= p.maxBudget) passed.push(`Importe ${eur0(t.budget)} dentro del rango`);
  else rejected.push(`Importe ${eur0(t.budget)} fuera del rango ${eur0(p.minBudget)}–${eur0(p.maxBudget)}`);
  const req: Classification | undefined = t.classification;
  if (req) {
    const has = p.classifications.find((c) => c.grupo === req.grupo && c.subgrupo === req.subgrupo);
    if (has && has.categoria >= req.categoria) passed.push(`Clasificación ${req.grupo}-${req.subgrupo} cat. ${req.categoria}: disponible (cat. ${has.categoria})`);
    else rejected.push(`Clasificación exigida ${req.grupo}-${req.subgrupo} cat. ${req.categoria} no disponible`);
  } else if (cpvHit && t.estimatedValue > 500_000) {
    warnings.push('Obra > 500.000 €: verificar si el PCAP exige clasificación');
  }
  const daysLeft = daysBetween(today, t.deadline);
  if (daysLeft >= p.minPrepDays) passed.push(`${daysLeft} días para preparar la oferta`);
  else rejected.push(`Plazo de presentación insuficiente (${daysLeft} días; mínimo ${p.minPrepDays})`);
  const annual = t.months > 12 ? t.budget / (t.months / 12) : t.budget;
  if (p.currentBacklog + annual > p.annualCapacity) warnings.push('Supera la capacidad anual de producción con la cartera actual');
  const priceWeight = t.criteria.find((c) => c.type === 'precio')?.weight ?? 0;
  const score = rejected.length ? 0 : Math.round(55 + Math.min(25, t.criteria.filter((c) => c.type !== 'juicio de valor').reduce((a, c) => a + c.weight, 0) / 4) + (daysLeft > 14 ? 10 : 5) + (priceWeight <= 60 ? 10 : 5));
  return { tender: t, applies: rejected.length === 0, score, passed, rejected, warnings, daysLeft };
}

export interface TenderParams { marginPct: number; extraCrews: Record<string, number> }
export const DEFAULT_TENDER_PARAMS: TenderParams = { marginPct: 6, extraCrews: {} };

export interface PartidaCost {
  code: string; chapter: string; description: string; unit: string; qty: number; projectPrice: number; projectTotal: number;
  labour: number; machine: number; materials: number; unitCost: number; total: number; diffPct: number;
  source: string; assumed?: string; days: number; crew: string;
}

export function estimateTender(t: Tender, params: TenderParams = DEFAULT_TENDER_PARAMS) {
  const partidas: PartidaCost[] = (t.partidas ?? []).map((p) => {
    const item = PRICE_BASE.find((x) => x.ref === p.baseRef);
    let labour = 0, machine = 0, materials = 0, assumed: string | undefined, days = 0, crew = 'Sin asignar', source = 'Base de precios';
    if (p.baseRef === 'SYS-PA') { materials = p.projectPrice; source = 'Estudio de seguridad y salud (no se oferta baja)'; crew = item!.crew; }
    else if (item) {
      labour = item.labourH * LABOUR_RATE; machine = item.machineH * MACHINE_RATE; materials = item.materials;
      days = p.qty / item.unitsPerDay; crew = item.crew; source = `${item.ref} · ${item.source}`;
    } else {
      materials = p.projectPrice * 0.82;
      assumed = 'Sin precio en la base: 82 % del precio de proyecto hasta recibir oferta de proveedor';
      days = p.qty / 4; crew = 'Subcontrata (supuesto 4 ud/día)'; source = 'Supuesto';
    }
    const unitCost = (labour + machine + materials) * (p.baseRef === 'SYS-PA' ? 1 : 1 + CI_PCT / 100);
    const total = unitCost * p.qty;
    const projectTotal = p.qty * p.projectPrice;
    return { ...p, projectTotal, labour, machine, materials, unitCost, total, diffPct: (unitCost / p.projectPrice - 1) * 100, source, assumed, days, crew };
  });

  const chapters = [...new Set(partidas.map((p) => p.chapter))].map((name) => {
    const ps = partidas.filter((p) => p.chapter === name);
    const crews = 1 + (params.extraCrews[name] ?? 0);
    return { name, cost: ps.reduce((a, p) => a + p.total, 0), project: ps.reduce((a, p) => a + p.projectTotal, 0), workDays: ps.reduce((a, p) => a + p.days, 0) / crews, crews, partidas: ps.length };
  });

  // Planificación: precedencias con solape (fracción del predecesor que puede solaparse)
  const plazoDays = t.months * WORKDAYS_PER_MONTH;
  const sched: Record<string, { start: number; end: number }> = {};
  for (const pr of t.precedence ?? []) {
    const ch = chapters.find((c) => c.name === pr.chapter);
    if (!ch || ch.name.startsWith('Seguridad')) continue;
    const pred = pr.after ? sched[pr.after] : undefined;
    const start = pred ? pred.end - (pred.end - pred.start) * (pr.overlap ?? 0) : 0;
    sched[ch.name] = { start, end: start + ch.workDays };
  }
  const totalDays = Math.max(0, ...Object.values(sched).map((s) => s.end));
  const sys = chapters.find((c) => c.name.startsWith('Seguridad'));
  if (sys) sched[sys.name] = { start: 0, end: totalDays };
  const critical = Object.entries(sched).filter(([n]) => !n.startsWith('Seguridad')).sort((a, b) => b[1].end - a[1].end)[0]?.[0];

  // Economía
  const projectPEM = partidas.reduce((a, p) => a + p.projectTotal, 0);
  const ownPEM = partidas.reduce((a, p) => a + p.total, 0);
  const costWithGG = ownPEM * (1 + COMPANY_GG_PCT / 100);
  const offer = costWithGG * (1 + params.marginPct / 100);
  const bajaPct = (1 - offer / t.budget) * 100;
  const hist = BAJA_HISTORY.filter((h) => h.organismo === t.organismo);
  const avgHist = hist.length ? hist.reduce((a, h) => a + h.bajaGanadora, 0) / hist.length : t.historicalBajaPct ?? 10;
  const abnormalThreshold = avgHist + 10; // art. 85.4 RGLCAP: >10 puntos sobre la media (aprox. con histórico)
  const priceW = t.criteria.find((c) => c.type === 'precio')?.weight ?? 0;
  const pricePoints = priceW * Math.max(0, Math.min(1, bajaPct / Math.max(avgHist, 0.1)));
  const breakEvenBaja = (1 - costWithGG / t.budget) * 100;

  const checks: { level: 'ok' | 'warning' | 'error'; text: string }[] = [];
  const reqCat = requiredCategory(t.estimatedValue, t.months);
  checks.push({ level: 'ok', text: `Anualidad media ${eur0(reqCat.annual)} → categoría ${reqCat.cat} (RD 773/2015)` });
  checks.push(totalDays <= plazoDays
    ? { level: 'ok', text: `Plan de ${Math.ceil(totalDays)} días hábiles dentro del plazo (${plazoDays}); holgura ${Math.floor(plazoDays - totalDays)} días` }
    : { level: 'error', text: `Plan de ${Math.ceil(totalDays)} días: supera el plazo de ${plazoDays} días. Camino crítico: ${critical}` });
  const missing = partidas.filter((p) => p.assumed);
  if (missing.length) checks.push({ level: 'warning', text: `${missing.length} partida sin precio en la base: ${missing.map((m) => m.code).join(', ')} (pedir oferta)` });
  if (bajaPct > abnormalThreshold) checks.push({ level: 'error', text: `Baja ${bajaPct.toFixed(1).replace('.', ',')} % por encima del umbral orientativo de anormalidad (${abnormalThreshold.toFixed(1).replace('.', ',')} %)` });
  else checks.push({ level: 'ok', text: `Baja por debajo del umbral orientativo de anormalidad (${abnormalThreshold.toFixed(1).replace('.', ',')} %)` });
  if (params.marginPct < 3) checks.push({ level: 'warning', text: 'Margen inferior al 3 %: riesgo ante desviaciones' });
  checks.push({ level: 'ok', text: `Garantía definitiva estimada: ${eur0(offer * 0.05)} (5 %)` });

  const fits = totalDays <= plazoDays;
  const recommendation = !fits ? 'Revisar: el plazo no se cumple con los equipos actuales'
    : bajaPct < avgHist - 4 ? 'Presentar con cautela: la baja queda lejos de la media histórica'
    : bajaPct > abnormalThreshold ? 'No presentar con esta baja: riesgo de oferta anormalmente baja'
    : 'Presentar: económicamente viable, plazo cumplido y baja competitiva';

  return {
    partidas, chapters, schedule: sched, totalDays, plazoDays, critical,
    totals: { projectPEM, ownPEM, costWithGG, offer, bajaPct, breakEvenBaja, avgHist, abnormalThreshold, pricePoints, priceWeight: priceW, guarantee: offer * 0.05, baseBudget: t.budget },
    checks, recommendation, go: fits && bajaPct <= abnormalThreshold && params.marginPct >= 0,
  };
}
export type TenderEstimate = ReturnType<typeof estimateTender>;
