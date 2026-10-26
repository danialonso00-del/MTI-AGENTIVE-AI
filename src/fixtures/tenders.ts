// Licitaciones públicas de obra (datos FICTICIOS con la estructura de los anuncios de la Plataforma
// de Contratación del Sector Público y de TED). Órganos de contratación y expedientes inventados.
import { addDaysIso } from './erp';

export interface Classification { grupo: string; subgrupo: string; categoria: number }

export interface CompanyProfile {
  name: string; cpvPrefixes: { code: string; label: string }[]; regions: string[];
  minBudget: number; maxBudget: number; classifications: Classification[]; minPrepDays: number;
  annualCapacity: number; currentBacklog: number;
}

/** Perfil de licitación de la constructora de la demo. */
export const COMPANY: CompanyProfile = {
  name: 'Construcciones Atlántico (ficticio)',
  cpvPrefixes: [
    { code: '4523', label: 'Obras de urbanización, viales y pavimentación' },
    { code: '4524', label: 'Obras hidráulicas y saneamiento' },
    { code: '4526', label: 'Cubiertas y estructuras' },
    { code: '4532', label: 'Aislamiento' },
    { code: '4545', label: 'Rehabilitación y reforma de edificios' },
    { code: '4531', label: 'Instalaciones eléctricas y alumbrado' },
  ],
  regions: ['Pontevedra', 'A Coruña', 'Ourense', 'Lugo'],
  minBudget: 150_000, maxBudget: 2_500_000,
  classifications: [{ grupo: 'G', subgrupo: '6', categoria: 4 }, { grupo: 'C', subgrupo: '2', categoria: 4 }, { grupo: 'E', subgrupo: '1', categoria: 3 }, { grupo: 'I', subgrupo: '1', categoria: 2 }],
  minPrepDays: 7, annualCapacity: 9_000_000, currentBacklog: 5_600_000,
};

export interface Criterion { name: string; weight: number; type: 'precio' | 'fórmula' | 'juicio de valor' }
export interface Partida { code: string; chapter: string; description: string; unit: string; qty: number; projectPrice: number; baseRef?: string }
export interface PliegoExtract { label: string; value: string; doc: string; fragment: string }

export interface Tender {
  id: string; expediente: string; title: string; organismo: string; portal: 'PLACSP' | 'TED';
  cpv: { code: string; label: string }[]; budget: number; estimatedValue: number; months: number;
  province: string; deadline: string; procedure: string; criteria: Criterion[];
  classification?: Classification; lots?: number; published: string; detailed?: boolean;
  documents?: string[]; pliego?: PliegoExtract[]; partidas?: Partida[];
  precedence?: { chapter: string; after?: string; overlap?: number }[]; historicalBajaPct?: number;
}

const crit = (precio: number, otros: [string, number, Criterion['type']][]): Criterion[] => [{ name: 'Oferta económica', weight: precio, type: 'precio' }, ...otros.map(([name, weight, type]) => ({ name, weight, type }))];

// ── Licitación detallada 1: urbanización (GO) ───────────────────────────────
const URB_PARTIDAS: Partida[] = [
  { code: '01.01', chapter: 'Demoliciones y movimiento de tierras', description: 'Demolición de pavimento de aglomerado y acera, incl. carga y transporte', unit: 'm²', qty: 3_850, projectPrice: 9.85, baseRef: 'DEM-01' },
  { code: '01.02', chapter: 'Demoliciones y movimiento de tierras', description: 'Excavación en zanja en terreno compacto', unit: 'm³', qty: 1_240, projectPrice: 18.4, baseRef: 'EXC-02' },
  { code: '02.01', chapter: 'Saneamiento y pluviales', description: 'Tubería PVC SN8 Ø400 mm, incl. cama de arena', unit: 'm', qty: 620, projectPrice: 96.5, baseRef: 'SAN-400' },
  { code: '02.02', chapter: 'Saneamiento y pluviales', description: 'Pozo de registro prefabricado Ø1000', unit: 'ud', qty: 18, projectPrice: 1_180, baseRef: 'POZ-1000' },
  { code: '02.03', chapter: 'Saneamiento y pluviales', description: 'Sumidero sifónico con rejilla de fundición', unit: 'ud', qty: 42, projectPrice: 265, baseRef: 'SUM-01' },
  { code: '03.01', chapter: 'Pavimentación', description: 'Base de zahorra artificial e=25 cm', unit: 'm³', qty: 960, projectPrice: 31.2, baseRef: 'ZAH-25' },
  { code: '03.02', chapter: 'Pavimentación', description: 'Mezcla bituminosa AC16 surf e=5 cm', unit: 'm²', qty: 2_450, projectPrice: 11.9, baseRef: 'MBC-16' },
  { code: '03.03', chapter: 'Pavimentación', description: 'Pavimento de losa de granito 60×40×6 en aceras', unit: 'm²', qty: 1_400, projectPrice: 78.5, baseRef: 'GRA-60' },
  { code: '03.04', chapter: 'Pavimentación', description: 'Bordillo de granito 15×25', unit: 'm', qty: 1_160, projectPrice: 38.6, baseRef: 'BOR-15' },
  { code: '04.01', chapter: 'Alumbrado público', description: 'Canalización 2Ø110 bajo acera', unit: 'm', qty: 540, projectPrice: 24.8, baseRef: 'CAN-110' },
  { code: '04.02', chapter: 'Alumbrado público', description: 'Columna 6 m con luminaria LED 40 W (modelo del proyecto)', unit: 'ud', qty: 34, projectPrice: 1_390 },
  { code: '05.01', chapter: 'Seguridad, salud y gestión de residuos', description: 'Seguridad y salud (partida alzada según estudio)', unit: 'PA', qty: 1, projectPrice: 7_800, baseRef: 'SYS-PA' },
];

// ── Licitación detallada 2: rehabilitación energética (GO con plazo ajustado) ──
const REH_PARTIDAS: Partida[] = [
  { code: '01.01', chapter: 'Actuaciones previas', description: 'Andamio tubular homologado, montaje y alquiler 4 meses', unit: 'm²', qty: 2_900, projectPrice: 16.4, baseRef: 'AND-01' },
  { code: '01.02', chapter: 'Actuaciones previas', description: 'Desmontaje de carpintería existente', unit: 'm²', qty: 640, projectPrice: 14.2, baseRef: 'DES-CAR' },
  { code: '02.01', chapter: 'Envolvente térmica (SATE)', description: 'SATE con EPS grafitado 12 cm y acabado acrílico', unit: 'm²', qty: 2_650, projectPrice: 92.4, baseRef: 'SATE-12' },
  { code: '02.02', chapter: 'Envolvente térmica (SATE)', description: 'Aislamiento de cubierta con lana mineral 16 cm', unit: 'm²', qty: 1_380, projectPrice: 28.9, baseRef: 'AIS-CUB' },
  { code: '03.01', chapter: 'Carpinterías', description: 'Ventana de aluminio RPT con vidrio bajo emisivo', unit: 'm²', qty: 640, projectPrice: 415, baseRef: 'VEN-RPT' },
  { code: '04.01', chapter: 'Instalaciones', description: 'Aerotermia 2×40 kW con depósito de inercia', unit: 'ud', qty: 1, projectPrice: 78_500, baseRef: 'AER-80' },
  { code: '04.02', chapter: 'Instalaciones', description: 'Fotovoltaica en cubierta 30 kWp', unit: 'ud', qty: 1, projectPrice: 36_800, baseRef: 'FV-30' },
  { code: '04.03', chapter: 'Instalaciones', description: 'Iluminación LED en aulas y pasillos', unit: 'ud', qty: 210, projectPrice: 168, baseRef: 'LED-01' },
  { code: '05.01', chapter: 'Seguridad, salud y gestión de residuos', description: 'Seguridad y salud (partida alzada según estudio)', unit: 'PA', qty: 1, projectPrice: 18_900, baseRef: 'SYS-PA' },
];

const sumPEM = (ps: Partida[]) => ps.reduce((a, p) => a + p.qty * p.projectPrice, 0);
const round2 = (n: number) => Math.round(n * 100) / 100;

export const TENDERS: Tender[] = [
  {
    id: 'lic-urb', expediente: 'OBR-2026-0187', title: 'Reurbanización de la Rúa do Porto: pavimentación, saneamiento y alumbrado', organismo: 'Concello de Ría Alta (ficticio)', portal: 'PLACSP',
    cpv: [{ code: '45233140', label: 'Obras viales' }, { code: '45232410', label: 'Obras de saneamiento' }, { code: '45316110', label: 'Instalación de alumbrado público' }],
    budget: round2(sumPEM(URB_PARTIDAS) * 1.19), estimatedValue: round2(sumPEM(URB_PARTIDAS) * 1.19), months: 6, province: 'Pontevedra', deadline: addDaysIso(16), procedure: 'Abierto simplificado',
    criteria: crit(60, [['Ampliación del plazo de garantía', 15, 'fórmula'], ['Memoria técnica y plan de obra', 25, 'juicio de valor']]),
    published: addDaysIso(-4), detailed: true, historicalBajaPct: 11.8,
    documents: ['Pliego de cláusulas administrativas (PCAP)', 'Proyecto de ejecución: memoria, planos y mediciones', 'Estudio de seguridad y salud', 'Modelo DEUC'],
    pliego: [
      { label: 'Presupuesto base de licitación', value: 'sin IVA (PEM + 13 % GG + 6 % BI)', doc: 'PCAP · cláusula 4', fragment: 'El presupuesto base de licitación asciende a la cantidad indicada, IVA excluido.' },
      { label: 'Plazo de ejecución', value: '6 meses', doc: 'PCAP · cláusula 6', fragment: 'El plazo de ejecución de las obras será de SEIS (6) MESES desde la firma del acta de replanteo.' },
      { label: 'Solvencia / clasificación', value: 'Clasificación G-6 categoría 3 (sustituye a solvencia)', doc: 'PCAP · cláusula 9', fragment: 'Podrá acreditarse la solvencia mediante clasificación en el grupo G, subgrupo 6, categoría 3.' },
      { label: 'Garantía definitiva', value: '5 % del precio de adjudicación', doc: 'PCAP · cláusula 12', fragment: 'El adjudicatario constituirá una garantía del 5 % del precio final ofertado, IVA excluido.' },
      { label: 'Ofertas anormalmente bajas', value: 'Art. 149 LCSP · criterios del art. 85 RGLCAP', doc: 'PCAP · cláusula 15', fragment: 'Se considerarán, en principio, anormalmente bajas las ofertas que se encuentren en los supuestos del artículo 85 del RGLCAP.' },
      { label: 'Penalidades por demora', value: '0,60 € por cada 1.000 € y día', doc: 'PCAP · cláusula 21', fragment: 'Por demora se impondrán penalidades diarias de 0,60 euros por cada 1.000 euros del precio del contrato.' },
    ],
    partidas: URB_PARTIDAS,
    precedence: [
      { chapter: 'Demoliciones y movimiento de tierras' },
      { chapter: 'Saneamiento y pluviales', after: 'Demoliciones y movimiento de tierras', overlap: 0.4 },
      { chapter: 'Alumbrado público', after: 'Saneamiento y pluviales', overlap: 0.5 },
      { chapter: 'Pavimentación', after: 'Saneamiento y pluviales', overlap: 0.2 },
      { chapter: 'Seguridad, salud y gestión de residuos' },
    ],
  },
  {
    id: 'lic-reh', expediente: 'EDU-2026-0412', title: 'Rehabilitación energética del CEIP Monte Alto (SATE, carpinterías, aerotermia y fotovoltaica)', organismo: 'Deputación de Mar e Montes (ficticia)', portal: 'TED',
    cpv: [{ code: '45453000', label: 'Obras de reparación y rehabilitación' }, { code: '45321000', label: 'Trabajos de aislamiento térmico' }, { code: '45261410', label: 'Aislamiento de cubiertas' }],
    budget: round2(sumPEM(REH_PARTIDAS) * 1.19), estimatedValue: round2(sumPEM(REH_PARTIDAS) * 1.19), months: 5, province: 'A Coruña', deadline: addDaysIso(22), procedure: 'Abierto',
    criteria: crit(55, [['Reducción del plazo de ejecución', 10, 'fórmula'], ['Mejoras en eficiencia energética', 10, 'fórmula'], ['Memoria técnica y organización de obra', 25, 'juicio de valor']]),
    classification: { grupo: 'C', subgrupo: '2', categoria: 4 }, published: addDaysIso(-2), detailed: true, historicalBajaPct: 9.6,
    documents: ['Pliego de cláusulas administrativas (PCAP)', 'Proyecto de ejecución y mediciones', 'Certificado energético previsto', 'Modelo DEUC'],
    pliego: [
      { label: 'Presupuesto base de licitación', value: 'sin IVA · cofinanciado por fondos europeos', doc: 'PCAP · cláusula 3', fragment: 'Actuación cofinanciada; el presupuesto base de licitación se indica IVA excluido.' },
      { label: 'Plazo de ejecución', value: '5 meses, obra con centro en funcionamiento', doc: 'PCAP · cláusula 5', fragment: 'Plazo de CINCO (5) MESES. Los trabajos en aulas se concentrarán en periodos no lectivos.' },
      { label: 'Clasificación exigida', value: 'Grupo C, subgrupo 2, categoría 4', doc: 'PCAP · cláusula 8', fragment: 'Será requisito indispensable la clasificación en el grupo C, subgrupo 2, categoría 4.' },
      { label: 'Garantía definitiva', value: '5 % del precio de adjudicación', doc: 'PCAP · cláusula 11', fragment: 'Garantía definitiva del 5 % del importe de adjudicación, excluido el IVA.' },
      { label: 'Condición especial', value: 'Gestión de residuos con valorización ≥ 70 %', doc: 'PCAP · cláusula 18', fragment: 'Al menos el 70 % de los residuos no peligrosos se destinará a preparación para reutilización o reciclado.' },
    ],
    partidas: REH_PARTIDAS,
    precedence: [
      { chapter: 'Actuaciones previas' },
      { chapter: 'Carpinterías', after: 'Actuaciones previas', overlap: 0.3 },
      { chapter: 'Envolvente térmica (SATE)', after: 'Actuaciones previas', overlap: 0.3 },
      { chapter: 'Instalaciones', after: 'Actuaciones previas', overlap: 0.6 },
      { chapter: 'Seguridad, salud y gestión de residuos' },
    ],
  },
  // ── Resto del feed (se filtran) ──
  { id: 'lic-dragado', expediente: 'APN-2026-033', title: 'Dragado de mantenimiento de la dársena norte', organismo: 'Autoridad Portuaria del Atlántico Norte (ficticia)', portal: 'TED', cpv: [{ code: '45252124', label: 'Dragado' }], budget: 3_960_000, estimatedValue: 3_960_000, months: 8, province: 'A Coruña', deadline: addDaysIso(25), procedure: 'Abierto', criteria: crit(70, [['Memoria técnica', 30, 'juicio de valor']]), classification: { grupo: 'F', subgrupo: '1', categoria: 5 }, published: addDaysIso(-6) },
  { id: 'lic-limpieza', expediente: 'SER-2026-221', title: 'Servicio de limpieza de dependencias municipales', organismo: 'Concello de Ría Alta (ficticio)', portal: 'PLACSP', cpv: [{ code: '90910000', label: 'Servicios de limpieza' }], budget: 410_000, estimatedValue: 820_000, months: 24, province: 'Pontevedra', deadline: addDaysIso(12), procedure: 'Abierto', criteria: crit(80, [['Plan de trabajo', 20, 'juicio de valor']]), published: addDaysIso(-3) },
  { id: 'lic-sevilla', expediente: 'OBR-2026-1290', title: 'Pavimentación de calles en el casco histórico', organismo: 'Ayuntamiento de Villasur (ficticio)', portal: 'PLACSP', cpv: [{ code: '45233252', label: 'Pavimentación de calles' }], budget: 690_000, estimatedValue: 690_000, months: 7, province: 'Sevilla', deadline: addDaysIso(18), procedure: 'Abierto simplificado', criteria: crit(65, [['Memoria', 35, 'juicio de valor']]), published: addDaysIso(-5) },
  { id: 'lic-hospital', expediente: 'SAN-2026-007', title: 'Construcción del nuevo hospital comarcal (fase 1)', organismo: 'Servizo de Saúde Atlántico (ficticio)', portal: 'TED', cpv: [{ code: '45215140', label: 'Construcción de hospitales' }], budget: 18_400_000, estimatedValue: 18_400_000, months: 30, province: 'Lugo', deadline: addDaysIso(40), procedure: 'Restringido', criteria: crit(50, [['Proyecto técnico', 50, 'juicio de valor']]), classification: { grupo: 'C', subgrupo: '2', categoria: 6 }, published: addDaysIso(-8) },
  { id: 'lic-senda', expediente: 'OBR-2026-0201', title: 'Senda peatonal y carril bici en la ribera', organismo: 'Concello de Val do Río (ficticio)', portal: 'PLACSP', cpv: [{ code: '45233162', label: 'Carriles para bicicletas' }], budget: 312_500, estimatedValue: 312_500, months: 4, province: 'Ourense', deadline: addDaysIso(3), procedure: 'Abierto simplificado', criteria: crit(70, [['Memoria', 30, 'juicio de valor']]), published: addDaysIso(-10) },
  { id: 'lic-vehiculos', expediente: 'SUM-2026-054', title: 'Suministro de dos vehículos eléctricos para la policía local', organismo: 'Concello de Ría Alta (ficticio)', portal: 'PLACSP', cpv: [{ code: '34144900', label: 'Vehículos eléctricos' }], budget: 86_000, estimatedValue: 86_000, months: 3, province: 'Pontevedra', deadline: addDaysIso(14), procedure: 'Abierto simplificado', criteria: crit(100, []), published: addDaysIso(-2) },
  { id: 'lic-cubierta', expediente: 'OBR-2026-0233', title: 'Sustitución de la cubierta del pabellón polideportivo', organismo: 'Concello de Pedra Branca (ficticio)', portal: 'PLACSP', cpv: [{ code: '45261210', label: 'Cubiertas' }], budget: 268_400, estimatedValue: 268_400, months: 3, province: 'Lugo', deadline: addDaysIso(11), procedure: 'Abierto simplificado', criteria: crit(80, [['Mejoras', 20, 'fórmula']]), published: addDaysIso(-1) },
  { id: 'lic-edar', expediente: 'AGU-2026-019', title: 'Ampliación de la EDAR comarcal', organismo: 'Augas do Norte (ficticio)', portal: 'TED', cpv: [{ code: '45252100', label: 'Plantas de tratamiento de aguas residuales' }], budget: 2_150_000, estimatedValue: 2_150_000, months: 12, province: 'Pontevedra', deadline: addDaysIso(28), procedure: 'Abierto', criteria: crit(55, [['Memoria técnica', 45, 'juicio de valor']]), classification: { grupo: 'K', subgrupo: '8', categoria: 4 }, published: addDaysIso(-7) },
  { id: 'lic-mantenimiento', expediente: 'SER-2026-310', title: 'Mantenimiento de alumbrado público (2 años)', organismo: 'Concello de Val do Río (ficticio)', portal: 'PLACSP', cpv: [{ code: '50232100', label: 'Mantenimiento de alumbrado público' }], budget: 198_000, estimatedValue: 396_000, months: 24, province: 'Ourense', deadline: addDaysIso(9), procedure: 'Abierto simplificado', criteria: crit(75, [['Plan de mantenimiento', 25, 'juicio de valor']]), published: addDaysIso(-4) },
  { id: 'lic-muro', expediente: 'OBR-2026-0198', title: 'Muro de contención y drenaje en la carretera provincial', organismo: 'Deputación de Mar e Montes (ficticia)', portal: 'PLACSP', cpv: [{ code: '45262620', label: 'Muros de contención' }], budget: 98_500, estimatedValue: 98_500, months: 2, province: 'A Coruña', deadline: addDaysIso(8), procedure: 'Abierto supersimplificado', criteria: crit(100, []), published: addDaysIso(-3) },
];

// ── Base de precios interna (ficticia): descompuestos con rendimientos ──
export interface PriceItem { ref: string; description: string; unit: string; labourH: number; machineH: number; materials: number; crew: string; unitsPerDay: number; source: string }
export const LABOUR_RATE = 27.5; // €/h medio cuadrilla (oficial + peón), fixture
export const MACHINE_RATE = 52; // €/h medio maquinaria, fixture
export const PRICE_BASE_VERSION = 'BPI-2026.2 (base interna de ejemplo)';
export const PRICE_BASE: PriceItem[] = [
  { ref: 'DEM-01', description: 'Demolición de pavimento', unit: 'm²', labourH: 0.08, machineH: 0.05, materials: 2.1, crew: 'Cuadrilla de demolición', unitsPerDay: 420, source: 'Obras 2024–2026' },
  { ref: 'EXC-02', description: 'Excavación en zanja', unit: 'm³', labourH: 0.12, machineH: 0.16, materials: 0.8, crew: 'Retro + 2 peones', unitsPerDay: 95, source: 'Obras 2024–2026' },
  { ref: 'SAN-400', description: 'Tubería PVC Ø400', unit: 'm', labourH: 0.9, machineH: 0.25, materials: 58.9, crew: 'Cuadrilla de saneamiento', unitsPerDay: 38, source: 'Tarifa proveedor 09/2026' },
  { ref: 'POZ-1000', description: 'Pozo prefabricado Ø1000', unit: 'ud', labourH: 9, machineH: 3, materials: 735, crew: 'Cuadrilla de saneamiento', unitsPerDay: 2.5, source: 'Tarifa proveedor 09/2026' },
  { ref: 'SUM-01', description: 'Sumidero sifónico', unit: 'ud', labourH: 2.8, machineH: 0.5, materials: 128, crew: 'Cuadrilla de saneamiento', unitsPerDay: 9, source: 'Obras 2025' },
  { ref: 'ZAH-25', description: 'Zahorra artificial', unit: 'm³', labourH: 0.1, machineH: 0.12, materials: 17.5, crew: 'Equipo de firmes', unitsPerDay: 160, source: 'Tarifa cantera 2026' },
  { ref: 'MBC-16', description: 'Aglomerado AC16 e=5', unit: 'm²', labourH: 0.03, machineH: 0.03, materials: 7.4, crew: 'Equipo de extendido', unitsPerDay: 1200, source: 'Subcontrata asfaltado' },
  { ref: 'GRA-60', description: 'Losa de granito', unit: 'm²', labourH: 1.05, machineH: 0.05, materials: 41.2, crew: 'Cuadrilla de solado', unitsPerDay: 42, source: 'Tarifa cantera 2026' },
  { ref: 'BOR-15', description: 'Bordillo de granito', unit: 'm', labourH: 0.42, machineH: 0.05, materials: 17.9, crew: 'Cuadrilla de solado', unitsPerDay: 85, source: 'Tarifa cantera 2026' },
  { ref: 'CAN-110', description: 'Canalización 2Ø110', unit: 'm', labourH: 0.32, machineH: 0.08, materials: 8.6, crew: 'Cuadrilla eléctrica', unitsPerDay: 70, source: 'Obras 2025' },
  { ref: 'SYS-PA', description: 'Seguridad y salud', unit: 'PA', labourH: 0, machineH: 0, materials: 0, crew: 'Técnico de prevención', unitsPerDay: 1, source: 'Según estudio de SyS' },
  { ref: 'AND-01', description: 'Andamio tubular', unit: 'm²', labourH: 0.22, machineH: 0, materials: 7.9, crew: 'Montadores de andamio', unitsPerDay: 180, source: 'Alquiler 2026' },
  { ref: 'DES-CAR', description: 'Desmontaje de carpintería', unit: 'm²', labourH: 0.35, machineH: 0, materials: 1.2, crew: 'Cuadrilla de carpintería', unitsPerDay: 60, source: 'Obras 2025' },
  { ref: 'SATE-12', description: 'SATE EPS 12 cm', unit: 'm²', labourH: 1.25, machineH: 0, materials: 46.5, crew: 'Cuadrilla SATE', unitsPerDay: 34, source: 'Tarifa sistema 2026' },
  { ref: 'AIS-CUB', description: 'Aislamiento de cubierta 16 cm', unit: 'm²', labourH: 0.25, machineH: 0, materials: 15.2, crew: 'Cuadrilla de cubiertas', unitsPerDay: 140, source: 'Tarifa 2026' },
  { ref: 'VEN-RPT', description: 'Ventana aluminio RPT', unit: 'm²', labourH: 1.4, machineH: 0, materials: 318, crew: 'Cuadrilla de carpintería', unitsPerDay: 22, source: 'Presupuesto carpintero 09/2026' },
  { ref: 'AER-80', description: 'Aerotermia 80 kW', unit: 'ud', labourH: 160, machineH: 8, materials: 60_800, crew: 'Instaladores térmicos', unitsPerDay: 0.06, source: 'Oferta fabricante 2026' },
  { ref: 'FV-30', description: 'Fotovoltaica 30 kWp', unit: 'ud', labourH: 120, machineH: 6, materials: 26_900, crew: 'Instaladores eléctricos', unitsPerDay: 0.1, source: 'Oferta instalador 2026' },
  { ref: 'LED-01', description: 'Luminaria LED interior', unit: 'ud', labourH: 0.9, machineH: 0, materials: 108, crew: 'Instaladores eléctricos', unitsPerDay: 26, source: 'Tarifa 2026' },
];

/** Bajas históricas en órganos similares (fixture) para orientar la oferta. */
export const BAJA_HISTORY = [
  { expediente: 'OBR-2025-0144', organismo: 'Concello de Ría Alta (ficticio)', budget: 512_000, bajaGanadora: 12.6, licitadores: 7 },
  { expediente: 'OBR-2025-0098', organismo: 'Concello de Ría Alta (ficticio)', budget: 298_000, bajaGanadora: 10.9, licitadores: 5 },
  { expediente: 'EDU-2025-0310', organismo: 'Deputación de Mar e Montes (ficticia)', budget: 1_080_000, bajaGanadora: 9.1, licitadores: 6 },
  { expediente: 'EDU-2025-0275', organismo: 'Deputación de Mar e Montes (ficticia)', budget: 760_000, bajaGanadora: 10.2, licitadores: 8 },
];
