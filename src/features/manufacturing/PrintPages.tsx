// Páginas de impresión usadas para generar los PDF de ejemplo (planos y hoja de requisitos).
import { useParams } from 'react-router-dom';
import { PartDrawing } from '@/components/part/PartDrawing';
import { RequirementsSheetView } from '@/components/evidence/Evidence';
import { DRAWINGS, REQUIREMENTS } from '@/fixtures/drawings';

export function PrintDrawing() {
  const { key } = useParams();
  const spec = DRAWINGS[decodeURIComponent(key ?? '')];
  if (!spec) return <div>Plano no encontrado</div>;
  return (
    <div style={{ width: '297mm', height: '210mm', background: '#fff' }}>
      <style>{'@page { size: A4 landscape; margin: 0 } body { background: #fff }'}</style>
      <PartDrawing spec={spec} className="h-full w-full" />
    </div>
  );
}

export function PrintRequirements() {
  const { ref } = useParams();
  const sheet = REQUIREMENTS[ref ?? ''];
  if (!sheet) return <div>Hoja no encontrada</div>;
  return (
    <div className="bg-white p-[18mm] text-ink">
      <style>{'@page { size: A4; margin: 0 } body { background: #fff }'}</style>
      <div className="mb-6 flex items-end justify-between border-b-2 border-navy pb-3">
        <div><div className="text-[12px] text-ink-3">Marina Norte (ficticio) · Compras</div><h1 className="text-[22px] font-semibold">Hoja de requisitos</h1></div>
        <div className="text-right text-[12px] text-ink-3">{sheet.id}<br />DOCUMENTO DE EJEMPLO · DATOS FICTICIOS</div>
      </div>
      <RequirementsSheetView sheetId={sheet.id} />
      <p className="mt-6 text-[12px] text-ink-3">Generado para MTI Agentive AI Studio. No corresponde a ningún cliente real.</p>
    </div>
  );
}
