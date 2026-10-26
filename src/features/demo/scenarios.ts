import type { DemoScenario } from './types';
import { buildManufacturingScenario } from './manufacturingScenes';
import { buildErpScenario } from './erpScenes';
import { buildBriefingScenario, buildVoiceScenario } from './crmScenes';
import { buildTenderScenario } from './tenderScenes';
import { buildFlowScenario } from './flowScenes';
import { FLOWS } from './flows';
import { USE_CASES, type Channel } from './useCases';

export interface ScenarioEntry {
  id: string;
  group: 'Fabricación' | 'Odoo' | 'CRM' | 'Licitaciones' | 'Casos de uso';
  title: string;
  description: string;
  reference: string;
  channel: Channel;
  steps: string[];
  build: () => DemoScenario;
}

export const SCENARIOS: ScenarioEntry[] = [
  { id: 'ofertas', group: 'Fabricación', title: 'De un plano a una oferta', reference: 'GALMETEC · PROMEGA', channel: 'email',
    description: 'Llega un email con plano y CAD. Se abre el adjunto, se extraen las medidas, se consulta el histórico y se genera la oferta hasta el presupuesto en Odoo.',
    steps: ['Correo', 'Documentos', 'Medidas', 'Cerebro', 'Cálculo', 'Oferta', 'Revisión', 'Odoo'], build: buildManufacturingScenario },
  { id: 'tender-lic-urb', group: 'Licitaciones', title: 'Reurbanización de calle', reference: 'Obra civil · PLACSP', channel: 'portal',
    description: 'Del portal a la oferta: filtrado por perfil, pliegos, mediciones contra la base de precios, coste, baja y plazo.', steps: ['Portal', 'Filtro', 'Pliegos', 'Mediciones', 'Costes', 'Plazo', 'Decisión'], build: () => buildTenderScenario('lic-urb') },
  { id: 'tender-lic-reh', group: 'Licitaciones', title: 'Rehabilitación energética', reference: 'Edificación · TED', channel: 'portal',
    description: 'Mismo recorrido con un plazo que no cabe: el agente detecta el camino crítico y propone una segunda cuadrilla.', steps: ['Portal', 'Filtro', 'Pliegos', 'Mediciones', 'Costes', 'Plazo', 'Decisión'], build: () => buildTenderScenario('lic-reh') },
  { id: 'crm-v-oceano', group: 'CRM', title: 'Actualización por voz tras una visita', reference: 'C03 Voz + C04 CRM', channel: 'voz',
    description: 'El comercial dicta al salir del cliente: cantidad, competencia, etapa e importe actualizados y dos acciones con fecha en la agenda.', steps: ['Voz', 'Estructura', 'CRM', 'Propuesta', 'Odoo', 'Agenda'], build: () => buildVoiceScenario('v-oceano') },
  { id: 'crm-v-cies', group: 'CRM', title: 'Nueva oportunidad dictada en una feria', reference: 'C03 Voz + C04 CRM', channel: 'voz',
    description: 'Un contacto en la feria se convierte en oportunidad con importe y visita programada, sin teclear nada.', steps: ['Voz', 'Estructura', 'CRM', 'Propuesta', 'Odoo', 'Agenda'], build: () => buildVoiceScenario('v-cies') },
  { id: 'crm-brief', group: 'CRM', title: 'Preparar una reunión', reference: 'C04 + C07 + C03', channel: 'voz',
    description: 'Ficha 360 automática del cliente antes de la reunión y actualización por voz al salir.', steps: ['Agenda', 'Cerebro', 'Ficha 360', 'Voz'], build: buildBriefingScenario },
  { id: 'odoo-rfq', group: 'Odoo', title: 'Solicitud de oferta', reference: 'TÉCNICAS DEL MAR', channel: 'email',
    description: 'Un cliente pide precio de repuestos: contacto resuelto, histórico, oportunidad y presupuesto borrador.', steps: ['Bandeja', 'Lectura', 'Cerebro ERP', 'Propuesta', 'Odoo'], build: () => buildErpScenario('rfq') },
  { id: 'odoo-order', group: 'Odoo', title: 'Pedido por WhatsApp', reference: 'Multicanal', channel: 'whatsapp',
    description: 'Mensaje informal con una referencia ambigua: decisión humana, stock insuficiente y entrega parcial.', steps: ['Bandeja', 'Lectura', 'Cerebro ERP', 'Propuesta', 'Odoo'], build: () => buildErpScenario('order') },
  { id: 'odoo-status', group: 'Odoo', title: '¿Ha salido mi pedido?', reference: 'Postventa', channel: 'email',
    description: 'Consulta de estado: pedido, fabricación, albarán y transportista, con respuesta en borrador. Solo lectura.', steps: ['Bandeja', 'Lectura', 'Cerebro ERP', 'Propuesta', 'Odoo'], build: () => buildErpScenario('status') },
  { id: 'odoo-pricing', group: 'Odoo', title: 'Revisión de precio con ARPA', reference: 'GALPI', channel: 'email',
    description: 'El cliente pide más descuento: coste por tramo, margen mínimo y nueva versión del presupuesto.', steps: ['Bandeja', 'Lectura', 'Cerebro ERP', 'Propuesta', 'Odoo'], build: () => buildErpScenario('pricing') },
  ...FLOWS.map((f): ScenarioEntry => {
    const uc = USE_CASES.find((u) => u.id === f.id);
    return {
      id: f.id, group: 'Casos de uso', title: f.title, description: uc?.summary ?? f.subtitle, reference: f.reference, channel: uc?.channel ?? 'email',
      steps: f.steps.map((st) => st.section.split(' · ').at(-1)!).filter((x, i, arr) => arr.indexOf(x) === i), build: () => buildFlowScenario(f),
    };
  }),
];
