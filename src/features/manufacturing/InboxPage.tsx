import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, FastForward, Filter, Inbox, Mail, PenSquare, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { ManufacturingRequest, RunState } from '@/domain/types';
import { Badge, Button, Card, EmptyState, Input, RUN_STATE, Select, StatePill } from '@/components/ui';
import { BrandLogo } from '@/components/layout/Brand';
import { MATERIALS } from '@/fixtures/manufacturing';
import { MANUFACTURING_FLOW } from '@/services/runs/manufacturingFlow';
import { estimate } from '@/services/estimation/engine';
import { useStudio } from '@/store/useStudio';
import { cx, eur, numSmart, relativeEs } from '@/lib/format';

const GROUPS: { id: string; label: string; states: RunState[] }[] = [
  { id: 'all', label: 'Todas', states: [] },
  { id: 'action', label: 'Requieren acción', states: ['needs_input', 'reviewing'] },
  { id: 'new', label: 'Nuevas', states: ['received'] },
  { id: 'progress', label: 'En curso', states: ['extracting', 'retrieving', 'estimating'] },
  { id: 'done', label: 'Aprobadas / ERP', states: ['approved', 'draft_created'] },
];

export default function InboxPage() {
  const requests = useStudio((s) => s.requests);
  const runUntil = useStudio((s) => s.runUntil);
  const toast = useStudio((s) => s.toast);
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const group = params.get('g') ?? 'all';
  const prio = params.get('p') ?? '';
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const nav = useNavigate();

  const set = (k: string, v: string) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }); };
  const list = useMemo(() => {
    const g = GROUPS.find((x) => x.id === group)!;
    const n = q.trim().toLowerCase();
    return requests
      .filter((r) => !g.states.length || g.states.includes(r.state))
      .filter((r) => !prio || r.priority === prio)
      .filter((r) => !n || `${r.ref} ${r.subject} ${r.customer.company} ${r.partNumber} ${r.customer.contact}`.toLowerCase().includes(n))
      .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  }, [requests, group, q, prio]);
  const counts = Object.fromEntries(GROUPS.map((g) => [g.id, requests.filter((r) => !g.states.length || g.states.includes(r.state)).length]));
  const active = list.find((r) => r.id === preview) ?? list[0];

  const bulk = async () => {
    setBulkBusy(true);
    for (const id of selected) await runUntil(id, 'review');
    setBulkBusy(false);
    toast('success', `${selected.length} solicitudes procesadas hasta revisión (las bloqueadas quedan en «Requiere dato»)`);
    setSelected([]);
  };

  return (
    <div className="mx-auto max-w-[1680px] px-4 py-5 md:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-[#8a6100]">Fabricación · GALMETEC / PROMEGA</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight md:text-[34px]">De un plano a una oferta</h1>
          <p className="mt-1 max-w-2xl text-[14.5px] text-ink-3">Solicitudes de oferta con planos y CAD. Cada expediente conserva adjuntos, estimaciones, versiones, aprobaciones y su presupuesto en el ERP.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-xl bg-white px-3 py-2 text-[12.5px] text-ink-3 ring-1 ring-line sm:flex"><BrandLogo src="/brands/gmail.svg" name="Gmail" size={20} plate={false} /><BrandLogo src="/brands/outlook.svg" name="Outlook" size={20} plate={false} /> ofertas@talleresdelta.example · fixture</span>
          <Button variant="primary" icon={<Plus />} onClick={() => nav('/fabricacion/nueva')}>Nueva solicitud</Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1 md:max-w-[380px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <Input value={q} onChange={(e) => set('q', e.target.value)} placeholder="Buscar por RFQ, cliente o pieza" className="pl-9" aria-label="Buscar solicitudes" />
          {q && <button onClick={() => set('q', '')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink" aria-label="Limpiar búsqueda"><X className="size-4" /></button>}
        </div>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Estado">
          {GROUPS.map((g) => (
            <button key={g.id} role="tab" aria-selected={group === g.id} onClick={() => set('g', g.id === 'all' ? '' : g.id)}
              className={cx('rounded-full px-3 py-1.5 text-[13px] font-medium ring-1 transition-colors', group === g.id ? 'bg-navy text-white ring-navy' : 'bg-white text-ink-2 ring-line hover:ring-line-strong')}>
              {g.label} <span className={cx('ml-1 tabular', group === g.id ? 'text-gold-light' : 'text-ink-3')}>{counts[g.id]}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="size-4 text-ink-3" />
          <Select value={prio} onChange={(e) => set('p', e.target.value)} className="h-9 w-auto py-1.5" aria-label="Prioridad">
            <option value="">Toda prioridad</option><option value="alta">Alta</option><option value="normal">Normal</option><option value="baja">Baja</option>
          </Select>
        </div>
      </div>

      <AnimatePresence>
        {selected.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mb-3 flex items-center gap-3 rounded-xl bg-navy px-4 py-2.5 text-white">
            <span className="text-[13.5px]">{selected.length} seleccionadas</span>
            <Button size="sm" variant="primary" icon={<FastForward />} onClick={bulk} disabled={bulkBusy}>{bulkBusy ? 'Procesando…' : 'Procesar hasta revisión'}</Button>
            <button className="ml-auto text-[13px] text-secondary hover:text-white" onClick={() => setSelected([])}>Deseleccionar</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Card className="overflow-hidden">
          {list.length === 0 ? (
            <EmptyState icon={<Inbox />} title="No hay solicitudes con estos filtros" action={<Button onClick={() => setParams({})}>Quitar filtros</Button>}>Prueba otra búsqueda o crea una solicitud manual.</EmptyState>
          ) : (
            <ul className="divide-y divide-line" aria-label="Solicitudes">
              {list.map((r) => (
                <li key={r.id} className={cx('group flex items-center gap-3 px-4 py-3 transition-colors', active?.id === r.id ? 'bg-gold/[0.06]' : 'hover:bg-ink/[0.02]')} onMouseEnter={() => setPreview(r.id)}>
                  <input type="checkbox" className="size-4 accent-[#e6a817]" checked={selected.includes(r.id)} onChange={(e) => setSelected(e.target.checked ? [...selected, r.id] : selected.filter((x) => x !== r.id))} aria-label={`Seleccionar ${r.ref}`} />
                  <Link to={`/fabricacion/${r.id}`} className="flex min-w-0 flex-1 items-center gap-3" onFocus={() => setPreview(r.id)}>
                    <span className={cx('flex size-9 shrink-0 items-center justify-center rounded-xl', r.channel === 'manual' ? 'bg-info-bg text-info' : 'bg-ink/[0.05] text-ink-3')}>{r.channel === 'manual' ? <PenSquare className="size-4" /> : <Mail className="size-4" />}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><span className="font-mono text-[12px] text-ink-3">{r.ref}</span>{r.priority === 'alta' && <Badge tone="err">Alta</Badge>}</div>
                      <div className="truncate text-[14.5px] font-medium text-ink">{r.subject}</div>
                      <div className="truncate text-[12.5px] text-ink-3">{r.customer.company} · {r.customer.contact}</div>
                    </div>
                    <div className="hidden w-[150px] shrink-0 md:block"><Progress req={r} /></div>
                    <div className="flex w-[150px] shrink-0 flex-col items-end gap-1">
                      <StatePill state={r.state} />
                      <span className="text-[12px] text-ink-3">{relativeEs(r.receivedAt)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {active && <PreviewPanel req={active} />}
      </div>
    </div>
  );
}

function Progress({ req }: { req: ManufacturingRequest }) {
  return (
    <div className="flex gap-0.5" aria-label="Progreso del recorrido">
      {MANUFACTURING_FLOW.map((s) => {
        const st = req.steps[s.id]?.status ?? 'idle';
        return <span key={s.id} title={`${s.title}: ${st}`} className={cx('h-1.5 flex-1 rounded-full', st === 'completed' ? 'bg-ok' : st === 'needs_input' ? 'bg-[#f59e0b]' : st === 'failed' ? 'bg-err' : 'bg-ink/10')} />;
      })}
    </div>
  );
}

function PreviewPanel({ req }: { req: ManufacturingRequest }) {
  const r = estimate(req.draft);
  const rows: [string, string][] = [
    ['Pieza', `${req.partNumber} · ${req.partName} · rev. ${req.currentRevision}`],
    ['Cantidad', `${req.draft.quantity} uds`],
    ['Material', req.draft.material ? MATERIALS[req.draft.material].name : 'Sin especificar'],
    ['Adjuntos', `${req.attachments.length}`],
    ['Versiones', `${req.versions.length}${req.approval && !req.approval.invalidatedAt ? ' · aprobada' : ''}`],
    ['Estimación', r.operations.length ? `${numSmart(r.estimatedLotMin, 1)} min · ${eur(r.cost.commercialTotalEur)}` : r.blocked[0] ?? '—'],
    ['ERP', req.erpRef ? `${req.erpRef.name} (borrador)` : '—'],
  ];
  return (
    <Card className="sticky top-[72px] h-fit overflow-hidden">
      <div className="tech-grid px-5 py-4 text-white">
        <div className="font-mono text-[12px] text-gold-light">{req.ref}</div>
        <div className="mt-1 text-[17px] font-semibold">{req.subject}</div>
        <div className="mt-1 text-[13px] text-secondary">{req.customer.company} · {req.customer.email}</div>
        <div className="mt-3"><StatePill state={req.state} /></div>
      </div>
      <dl className="divide-y divide-line text-[13.5px]">
        {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3 px-5 py-2.5"><dt className="text-ink-3">{k}</dt><dd className="text-right font-medium">{v}</dd></div>)}
      </dl>
      <div className="px-5 py-3"><Progress req={req} /><div className="mt-1 text-[12px] text-ink-3">{RUN_STATE[req.state].label} · {MANUFACTURING_FLOW.filter((s) => req.steps[s.id]?.status === 'completed').length}/8 pasos</div></div>
      <div className="border-t border-line p-4">
        <Link to={`/fabricacion/${req.id}`} className="flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-gold text-[14px] font-semibold text-navy transition-colors hover:bg-gold-light">Abrir expediente <ArrowRight className="size-4" /></Link>
      </div>
    </Card>
  );
}
