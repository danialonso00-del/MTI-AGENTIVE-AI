import { AnimatePresence, motion } from 'motion/react';
import { BookOpen, Database, FileText, Mail, Ruler, UserCheck, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Evidence, ManufacturingRequest } from '@/domain/types';
import { DRAWINGS, REQUIREMENTS } from '@/fixtures/drawings';
import { HISTORICAL_JOBS, MATERIALS, MACHINES, DATASET } from '@/fixtures/manufacturing';
import { findEvidence, PROVENANCE_LABEL } from '@/services/estimation/evidence';
import { cx, dateTimeEs } from '@/lib/format';
import { Badge, IconButton } from '@/components/ui';
import { PartDrawing } from '@/components/part/PartDrawing';

const KIND_ICON: Record<Evidence['kind'], ReactNode> = {
  source: <FileText />, rule: <Ruler />, fixture: <Database />, model: <BookOpen />, human: <UserCheck />,
};

interface Ctx { open(id: string): void; req?: ManufacturingRequest }
const EvidenceCtx = createContext<Ctx>({ open: () => {} });
export const useEvidence = () => useContext(EvidenceCtx);

export function EvidenceProvider({ req, children }: { req?: ManufacturingRequest; children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = useCallback((id: string) => setOpenId(id), []);
  const value = useMemo(() => ({ open, req }), [open, req]);
  const ev = openId ? findEvidence(req, openId) : undefined;
  return (
    <EvidenceCtx.Provider value={value}>
      {children}
      <AnimatePresence>
        {ev && <EvidenceDrawer key={ev.id} ev={ev} req={req} onClose={() => setOpenId(null)} />}
      </AnimatePresence>
    </EvidenceCtx.Provider>
  );
}

export function EvidenceChip({ id, className, label }: { id: string; className?: string; label?: string }) {
  const { open, req } = useEvidence();
  const ev = findEvidence(req, id);
  if (!ev) return null;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); open(id); }}
      title={`${PROVENANCE_LABEL[ev.kind]} · ${ev.locator}`}
      className={cx(
        'inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-medium ring-1 ring-inset transition-colors [&>svg]:size-3 [&>svg]:shrink-0',
        ev.kind === 'source' && 'bg-info-bg text-info ring-info/15 hover:ring-info/40',
        ev.kind === 'rule' && 'bg-[#f1ecfb] text-[#5b3cc4] ring-[#5b3cc4]/15 hover:ring-[#5b3cc4]/40',
        ev.kind === 'fixture' && 'bg-ink/[0.05] text-ink-2 ring-ink/10 hover:ring-ink/30',
        ev.kind === 'human' && 'bg-ok-bg text-ok ring-ok/15 hover:ring-ok/40',
        ev.kind === 'model' && 'bg-gold/10 text-[#8a6100] ring-gold/30',
        className,
      )}
    >
      {KIND_ICON[ev.kind]}
      <span className="truncate">{label ?? shortLabel(ev)}</span>
    </button>
  );
}

const SHORT: Record<string, string> = { 'ev-rules': 'Reglas de proceso', 'ev-materials': 'Tabla de materiales', 'ev-machines': 'Máquinas y tarifas' };
const shortLabel = (ev: Evidence) => SHORT[ev.id] ?? (ev.id.startsWith('ev-hist-') ? ev.id.replace('ev-hist-', '') : shortLocator(ev.locator));
const shortLocator = (l: string) => {
  const parts = l.split(' · ');
  return parts.length > 1 ? `${parts[0].replace(/^(Correo|Plano|Hoja de requisitos).*/, '$1')} · ${parts.at(-1)}` : l;
};

/** Resalta un fragmento dentro de un texto. */
export function Highlighted({ text, needle, className }: { text: string; needle?: string; className?: string }) {
  if (!needle) return <span className={className}>{text}</span>;
  const i = text.toLowerCase().indexOf(needle.toLowerCase());
  if (i < 0) return <span className={className}>{text}</span>;
  return (
    <span className={className}>
      {text.slice(0, i)}
      <mark className="evidence" data-evidence>{text.slice(i, i + needle.length)}</mark>
      {text.slice(i + needle.length)}
    </span>
  );
}

export function RequirementsSheetView({ sheetId, highlight }: { sheetId: string; highlight?: string | null }) {
  const sheet = REQUIREMENTS[sheetId];
  if (!sheet) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="border-b border-line bg-canvas px-4 py-2.5 text-[13px] font-semibold">{sheet.title}</div>
      <table className="w-full text-[13.5px]">
        <tbody>
          {sheet.rows.map((r) => (
            <tr key={r.key} className={cx('border-b border-line last:border-0', highlight === r.anchor && 'bg-gold/15 outline-2 -outline-offset-2 outline-gold-dark')}>
              <td className="w-[44%] px-4 py-2 text-ink-3">{r.label}</td>
              <td className="px-4 py-2 font-medium">{r.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SourcePreview({ ev, req }: { ev: Evidence; req?: ManufacturingRequest }) {
  const email = req?.emails.find((m) => m.id === ev.sourceId);
  if (email) {
    return (
      <div className="rounded-xl border border-line bg-white p-4">
        <div className="mb-2 text-[12.5px] text-ink-3">{email.fromName} · {dateTimeEs(email.date)}</div>
        <div className="mb-3 text-[14px] font-semibold">{email.subject}</div>
        <Highlighted className="whitespace-pre-wrap text-[14px] leading-relaxed text-ink-2" text={email.body} needle={ev.anchor ?? ev.excerpt} />
      </div>
    );
  }
  const att = req?.attachments.find((a) => a.id === ev.sourceId);
  if (att && att.fileName.startsWith('Requisitos') && req) return <RequirementsSheetView sheetId={req.ref} highlight={ev.anchor} />;
  if (att && (att.kind === 'pdf' || att.kind === 'step') && req) {
    const spec = DRAWINGS[`${req.partNumber}:${att.revision ?? req.currentRevision}`];
    if (spec) return (
      <div>
        {att.kind === 'step' && <p className="mb-2 rounded-lg bg-gold/10 px-3 py-2 text-[12.5px] text-[#7a5600]">{att.substituteNote}</p>}
        <PartDrawing spec={spec} highlight={att.kind === 'step' ? 'dims.pocket' : ev.anchor} className="w-full rounded-xl border border-line" />
      </div>
    );
  }
  if (ev.sourceId === DATASET.history.id) {
    const job = HISTORICAL_JOBS.find((j) => ev.id.endsWith(j.ref));
    if (job) return (
      <table className="w-full overflow-hidden rounded-xl border border-line bg-white text-[13px]">
        <thead className="bg-canvas text-ink-3"><tr><th className="px-3 py-2 text-left font-medium">Operación</th><th className="px-3 py-2 text-right font-medium">Regla (min)</th><th className="px-3 py-2 text-right font-medium">Real (min)</th><th className="px-3 py-2 text-right font-medium">Real/regla</th></tr></thead>
        <tbody>{job.ops.map((o) => <tr key={o.kind} className="border-t border-line"><td className="px-3 py-1.5">{o.kind}</td><td className="px-3 py-1.5 text-right tabular">{o.ruleCycleMin}</td><td className="px-3 py-1.5 text-right tabular">{o.realCycleMin}</td><td className="px-3 py-1.5 text-right tabular">{(Math.round((o.realCycleMin / o.ruleCycleMin) * 1000) / 1000).toFixed(3)}</td></tr>)}</tbody>
      </table>
    );
  }
  if (ev.sourceId === DATASET.materials.id) return (
    <div className="grid gap-2">{Object.values(MATERIALS).map((m) => <div key={m.id} className="rounded-lg border border-line bg-white px-3 py-2 text-[13px]"><b>{m.name}</b> · {m.densityGcm3} g/cm³ · {m.priceEurKg.toFixed(2).replace('.', ',')} €/kg<div className="text-ink-3">Ciclo × {Object.entries(m.cycleMultiplier).map(([k, v]) => `${k} ${v}`).join(' · ')}</div></div>)}</div>
  );
  if (ev.sourceId === DATASET.machines.id) return (
    <div className="grid gap-1.5">{MACHINES.map((m) => <div key={m.id} className="flex justify-between rounded-lg border border-line bg-white px-3 py-2 text-[13px]"><span><b className="font-mono">{m.id}</b> {m.name.replace(m.id, '')}</span><span className="tabular text-ink-3">{m.rateEurH} €/h</span></div>)}</div>
  );
  if (ev.sourceId === DATASET.rules.id) return <p className="text-[13.5px] text-ink-2">Cada operación indica su fórmula y los rasgos usados en la columna «Origen» de la tabla de estimación.</p>;
  return null;
}

function EvidenceDrawer({ ev, req, onClose }: { ev: Evidence; req?: ManufacturingRequest; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70]">
      <motion.div className="absolute inset-0 bg-navy/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.aside
        role="dialog" aria-label="Evidencia"
        initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ duration: 0.26, ease: [0.23, 1, 0.32, 1] }}
        className="absolute inset-y-0 right-0 flex w-full max-w-[760px] flex-col bg-canvas shadow-[var(--shadow-pop)]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line bg-white px-5 py-4">
          <div>
            <div className="flex items-center gap-2"><Badge tone={ev.kind === 'source' ? 'info' : ev.kind === 'human' ? 'ok' : 'neutral'}>{PROVENANCE_LABEL[ev.kind]}</Badge></div>
            <h2 className="mt-2 text-[16px] font-semibold">{ev.locator}</h2>
            {ev.excerpt && <p className="mt-1 text-[14px] text-ink-2">«{ev.excerpt}»</p>}
          </div>
          <IconButton label="Cerrar" onClick={onClose}><X /></IconButton>
        </div>
        <div className="flex-1 overflow-y-auto p-5 scroll-thin">
          <SourcePreview ev={ev} req={req} />
          <p className="mt-4 flex items-center gap-1.5 text-[12.5px] text-ink-3"><Mail className="size-3.5" /> Los documentos son inputs: no pueden introducir herramientas, credenciales ni instrucciones de escritura.</p>
        </div>
      </motion.aside>
    </div>
  );
}
