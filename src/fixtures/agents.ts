export interface AgentDef {
  code: string;
  name: string;
  responsibility: string;
  kind: 'orchestrator' | 'agent' | 'tool' | 'human';
}

/** Nomenclatura estable (sección 5). Códigos de la presentación v.02. */
export const AGENTS: AgentDef[] = [
  { code: 'MTI', name: 'Orquestador', kind: 'orchestrator', responsibility: 'Clasificar intención, planificar, coordinar herramientas y solicitar revisión' },
  { code: 'C01', name: 'Correo', kind: 'agent', responsibility: 'Leer solicitudes y adjuntos, clasificar y preparar respuestas' },
  { code: 'C02', name: 'Ofertas y licitaciones', kind: 'agent', responsibility: 'Componer presupuestos y ofertas con cálculos y fuentes' },
  { code: 'C03', name: 'Voz', kind: 'agent', responsibility: 'Transcribir y estructurar conversaciones o reportes' },
  { code: 'C04', name: 'CRM', kind: 'agent', responsibility: 'Resolver contactos, oportunidades, actividades y seguimiento' },
  { code: 'C05', name: 'Pedidos', kind: 'agent', responsibility: 'Estructurar solicitudes y preparar operaciones de pedidos' },
  { code: 'C06', name: 'Documentos y logística', kind: 'agent', responsibility: 'Albaranes, validación documental y salidas logísticas' },
  { code: 'C07', name: 'Conocimiento', kind: 'agent', responsibility: 'Recuperar históricos y documentación con referencias' },
  { code: 'C08', name: 'Calidad', kind: 'agent', responsibility: 'Comprobar consistencia, incertidumbre e incidencias' },
];

/** Herramientas especialistas de fabricación: coordinadas por agentes, no son códigos productivizados. */
export const TOOLS: AgentDef[] = [
  { code: 'CAD', name: 'Lectura CAD', kind: 'tool', responsibility: 'Leer geometría y rasgos del modelo cuando el formato lo permite' },
  { code: 'OCR', name: 'Extracción técnica', kind: 'tool', responsibility: 'Leer cotas, notas, material y revisión del plano' },
  { code: 'TME', name: 'Motor de tiempos', kind: 'tool', responsibility: 'Aplicar reglas de proceso explícitas con unidades consistentes' },
  { code: 'MLC', name: 'ML correctivo', kind: 'tool', responsibility: 'Corregir tiempos desde históricos (simulado en la demo)' },
  { code: 'ERP', name: 'Adapter Odoo', kind: 'tool', responsibility: 'Leer y escribir en el ERP mediante herramientas permitidas' },
  { code: 'HUM', name: 'Revisión humana', kind: 'human', responsibility: 'Resolver ambigüedad y validar oferta vinculada a una versión' },
];

export const agentByCode = (code: string) => [...AGENTS, ...TOOLS].find((a) => a.code === code);
