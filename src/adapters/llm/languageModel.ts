// Interfaz LanguageModelAdapter (sección 10). En la demo se usa un redactor por plantillas
// determinista: no se necesita LLM para ejecutar los fixtures y el resultado es reproducible.
// Un proveedor real se conectaría en servidor y su salida se validaría contra esquema.
import type { EstimateResult, ManufacturingRequest } from '@/domain/types';
import { MATERIALS } from '@/fixtures/manufacturing';
import { eur, minutes, num, dateEs } from '@/lib/format';

export interface LanguageModelAdapter {
  id: string;
  label: string;
  isGenerative: boolean;
  draftMissingDataQuestion(req: ManufacturingRequest, missing: string[]): string;
  draftOfferText(req: ManufacturingRequest, r: EstimateResult): string;
  draftReply(req: ManufacturingRequest, r: EstimateResult, quoteName: string): string;
}

const MISSING_TEXT: Record<string, string> = {
  material: 'el material de la pieza (el plano indica «según pedido»)',
  quantity: 'la cantidad del lote',
  finish: 'el acabado superficial requerido',
};

export const templateModel: LanguageModelAdapter = {
  id: 'template-es-v1',
  label: 'Redacción por plantilla determinista (sin LLM configurado)',
  isGenerative: false,

  draftMissingDataQuestion(req, missing) {
    return `Hola ${req.customer.contact.split(' ')[0]}:

Gracias por la solicitud ${req.ref} (${req.partNumber}). Para preparar una oferta fiable necesitamos que nos confirméis:

${missing.map((m) => `· ${MISSING_TEXT[m] ?? m}`).join('\n')}

En cuanto lo recibamos, completamos la estimación.

Un saludo,
Oficina técnica · Talleres Delta`;
  },

  draftOfferText(req, r) {
    const mat = req.draft.material ? MATERIALS[req.draft.material].name : '—';
    return `Oferta ${req.ref} · ${req.partNumber} rev. ${req.draft.revision}
Cliente: ${req.customer.company}
Lote: ${num(req.draft.quantity, 0)} uds · ${mat}${req.draft.finish ? ` · ${req.draft.finish}` : ''}

Precio unitario: ${eur(r.cost.commercialUnitEur)} · Total: ${eur(r.cost.commercialTotalEur)} (IVA no incluido)
Tiempo de proceso estimado del lote: ${minutes(r.estimatedLotMin)} (${num(r.perPieceMin, 2)} min/pieza imputados)
Plazo orientativo: ${r.leadTime.minDays}–${r.leadTime.maxDays} días hábiles desde pedido, sujeto a planificación.

Supuestos: ${r.assumptions.slice(0, 2).join(' ')}`;
  },

  draftReply(req, r, quoteName) {
    return `Hola ${req.customer.contact.split(' ')[0]}:

Os adjuntamos nuestra oferta ${quoteName} para ${num(req.draft.quantity, 0)} uds de ${req.partNumber} rev. ${req.draft.revision}.

· Precio unitario: ${eur(r.cost.commercialUnitEur)} (total ${eur(r.cost.commercialTotalEur)}, IVA no incluido)
· Plazo orientativo: ${r.leadTime.minDays}–${r.leadTime.maxDays} días hábiles desde la confirmación del pedido
${req.fields.find((f) => f.key === 'dueDate')?.value ? `· Fecha solicitada: ${dateEs(req.fields.find((f) => f.key === 'dueDate')!.value!)}\n` : ''}
Quedamos atentos a cualquier comentario.

Un saludo,
Ofertas · Talleres Delta`;
  },
};
