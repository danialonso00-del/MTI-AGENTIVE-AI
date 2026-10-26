import { AlertTriangle, FileCheck2, Info } from 'lucide-react';
import { useState } from 'react';
import type { ManufacturingRequest } from '@/domain/types';
import { Button, Field, Modal, Textarea } from '@/components/ui';
import { useStudio } from '@/store/useStudio';
import { eur, numSmart } from '@/lib/format';
import { useEstimate } from './hooks';

export function ApproveModal({ req, open, onClose, onApproved }: { req: ManufacturingRequest; open: boolean; onClose: () => void; onApproved?: () => void }) {
  const r = useEstimate(req)!;
  const save = useStudio((s) => s.saveVersion);
  const approve = useStudio((s) => s.approve);
  const user = useStudio((s) => s.ui.user);
  const [comment, setComment] = useState('');
  const existing = req.versions.find((v) => v.inputHash === r.inputHash);
  const blocked = r.blocked.length > 0;
  const uncertain = [
    ...req.contradictions.map((c) => c.description),
    ...req.fields.filter((f) => f.status === 'assumed').map((f) => `${f.label} supuesto: ${f.value}${f.note ? ` — ${f.note}` : ''}`),
  ];
  return (
    <Modal open={open} onClose={onClose} title="Revisar y aprobar" subtitle={`${req.ref} · rev. ${req.draft.revision} · ${req.draft.quantity} uds`} width={620}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" icon={<FileCheck2 />} disabled={blocked} disabledReason="La estimación está bloqueada"
          onClick={() => {
            const vId = existing?.id ?? save(req.id, 'Versión aprobada');
            approve(req.id, vId, comment || undefined);
            onApproved?.();
            onClose();
          }}>
          {existing ? `Aprobar v${existing.number}` : `Guardar v${req.versions.length + 1} y aprobar`}
        </Button>
      </>}>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-canvas px-3 py-2 ring-1 ring-line"><div className="text-[12px] text-ink-3">Tiempo del lote</div><div className="text-[16px] font-semibold tabular">{numSmart(r.estimatedLotMin, 1)} min</div></div>
          <div className="rounded-xl bg-canvas px-3 py-2 ring-1 ring-line"><div className="text-[12px] text-ink-3">Precio total</div><div className="text-[16px] font-semibold tabular">{eur(r.cost.commercialTotalEur)}</div></div>
          <div className="rounded-xl bg-canvas px-3 py-2 ring-1 ring-line"><div className="text-[12px] text-ink-3">Hash de inputs</div><div className="font-mono text-[13px] font-semibold">{r.inputHash.slice(0, 12)}</div></div>
        </div>
        {uncertain.length > 0 && (
          <div className="rounded-xl bg-warn-bg p-3 ring-1 ring-warn/20">
            <div className="mb-1 flex items-center gap-2 text-[13px] font-semibold text-warn"><AlertTriangle className="size-4" /> Incertidumbres a revisar</div>
            <ul className="space-y-1 text-[13px] text-[#7c3d06]">{uncertain.map((u) => <li key={u}>· {u}</li>)}</ul>
            <p className="mt-2 text-[12.5px] text-[#7c3d06]">Puedes confirmar valores en «Correo y adjuntos». Si apruebas así, quedan como supuestos explícitos de esta versión.</p>
          </div>
        )}
        <Field label="Comentario de aprobación" hint={`Aprobará: ${user}`}>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="p. ej. Revisado con producción; acabado natural confirmado por teléfono." />
        </Field>
        <p className="flex gap-2 text-[12.5px] text-ink-3"><Info className="mt-0.5 size-4 shrink-0" />La aprobación fija el hash de inputs y cálculo. Cualquier edición posterior la anula automáticamente.</p>
      </div>
    </Modal>
  );
}
