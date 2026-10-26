// Recorridos guiados de CRM: actualización por voz tras una visita, nueva oportunidad dictada y
// preparación de una reunión. Cada escena ejecuta acciones reales del Asistente comercial.
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Bell, CalendarDays, CheckCircle2, FileText, Mic, Phone, Sparkles, Target, TrendingUp, Users } from 'lucide-react';
import type { Activity } from '@/domain/erp';
import { LEAD_STAGES, orderTotal } from '@/domain/erp';
import { BrandLogo } from '@/components/layout/Brand';
import { VOICE_SAMPLES } from '@/fixtures/voice';
import { customer360 } from '@/services/crm/voiceNote';
import { useStudio } from '@/store/useStudio';
import { cx, eur } from '@/lib/format';
import { AgentPulse, AppWindow, CountUp, MultiHighlight, Reveal, Typewriter } from './kit';
import { BrainCloud, type CloudDoc } from './BrainCloud';
import type { DemoScenario } from './types';

const S = () => useStudio.getState();
const TYPE_ICON: Record<Activity['type'], React.ReactNode> = { Llamada: <Phone />, Reunión: <Users />, Email: <FileText />, Tarea: <CheckCircle2 /> };
const longDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

function makeNoteRef() { return { id: '' as string }; }
type NoteRef = ReturnType<typeof makeNoteRef>;
const useNote = (ref: NoteRef) => useStudio((s) => (s.voiceNotes ?? []).find((n) => n.id === ref.id));

// ── Escenas compartidas por los recorridos de voz ───────────────────────────
function Dictation({ t, text, context }: { t: number; text: string; context: string }) {
  const words = text.split(' ');
  const shown = Math.min(words.length, Math.max(0, Math.floor((t - 1200) / 170)));
  const secs = Math.max(0, Math.floor((t - 1200) / 1000));
  const recording = t >= 1200 && shown < words.length;
  return (
    <div className="grid h-full items-center gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="mx-auto w-[330px] overflow-hidden rounded-[40px] bg-[#0b0f19] p-3 shadow-[0_40px_90px_-30px_rgb(0_0_0/0.9)] ring-1 ring-white/15">
        <div className="rounded-[30px] bg-navy-mid px-5 pb-6 pt-8">
          <div className="text-center text-[12px] text-muted">MTI · Asistente comercial</div>
          <div className="mt-5 flex justify-center">
            <div className="relative flex size-24 items-center justify-center">
              {recording && <span className="absolute inset-0 animate-ping rounded-full bg-[#dc2626]/30" />}
              <span className={cx('relative flex size-20 items-center justify-center rounded-full transition-colors duration-500', recording ? 'bg-[#dc2626]' : shown >= words.length ? 'bg-[#16a34a]' : 'bg-gold')}>{shown >= words.length ? <CheckCircle2 className="size-9 text-white" /> : <Mic className="size-9 text-white" />}</span>
            </div>
          </div>
          <div className="mt-3 text-center font-mono text-[14px] text-white">{`0:${String(secs).padStart(2, '0')}`}</div>
          <div className="mt-3 flex h-10 items-center justify-center gap-[3px]">
            {Array.from({ length: 26 }, (_, i) => <span key={i} className="w-[3px] rounded-full bg-gold transition-[height] duration-150" style={{ height: recording ? 6 + Math.abs(Math.sin((t / 120) + i * 1.3)) * 28 : 4 }} />)}
          </div>
          <div className="mt-4 min-h-[150px] rounded-2xl bg-white/[0.05] p-3 text-[13px] leading-relaxed text-secondary">{words.slice(0, shown).join(' ')}{recording && <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-gold align-middle" />}</div>
        </div>
      </div>
      <div className="space-y-3">
        <Reveal t={t} at={300}><div className="rounded-2xl bg-white/[0.05] p-4 ring-1 ring-white/10"><div className="text-[12px] text-muted">Contexto</div><div className="text-[17px] font-semibold text-white">{context}</div><div className="mt-1 text-[13px] text-secondary">Sin abrir el portátil ni rellenar formularios: el comercial habla y sigue con su ruta.</div></div></Reveal>
        <Reveal t={t} at={1500}><AgentPulse code="C03" label="Voz · transcribe en tiempo real" active={recording} done={shown >= words.length} /></Reveal>
        <Reveal t={t} at={1500 + words.length * 170}><div className="rounded-2xl bg-[#16a34a]/12 p-3 text-[13px] text-[#86efac] ring-1 ring-[#16a34a]/40">Nota de {secs} s lista para procesar</div></Reveal>
      </div>
    </div>
  );
}

function Structure({ t, noteRef: ref }: { t: number; noteRef: NoteRef }) {
  const note = useNote(ref);
  if (!note) return <div className="text-muted">Procesando…</div>;
  const p = note.parse;
  const items = [
    ...p.extracted.map((e) => ({ ...e, tone: 'info' as const })),
    ...p.risks.map((r) => ({ ...r, tone: 'warn' as const })),
    ...p.activities.map((a) => ({ label: a.type, value: `${a.summary.split(' · ')[0]} · ${longDate(a.dueDate)}`, fragment: a.fragment, tone: 'gold' as const })),
  ];
  const at = (i: number) => 900 + i * 750;
  return (
    <AppWindow section="Asistente comercial › Nota de voz" className="h-full">
      <div className="grid h-full lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="p-6">
          <div className="text-[12.5px] text-ink-3">Transcripción · C03 Voz</div>
          <MultiHighlight className="mt-3 block text-[17px] leading-[1.8] text-ink-2" text={note.transcript} marks={items.map((x, i) => ({ needle: x.fragment, on: t >= at(i), active: t >= at(i) && t < at(i + 1) }))} />
        </div>
        <div className="space-y-2 border-l border-line bg-[#f8fafc] p-4">
          <div className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Datos estructurados</div>
          {items.map((x, i) => (
            <Reveal key={x.label + i} t={t} at={at(i) + 250} x={24} y={0}>
              <div className={cx('rounded-xl bg-white px-3 py-2 ring-1', x.tone === 'warn' ? 'ring-warn/40' : x.tone === 'gold' ? 'ring-gold/50' : 'ring-line')}>
                <div className={cx('text-[11.5px]', x.tone === 'warn' ? 'text-warn' : x.tone === 'gold' ? 'text-[#8a6100]' : 'text-ink-3')}>{x.tone === 'warn' ? 'Riesgo · ' : x.tone === 'gold' ? 'Próxima acción · ' : ''}{x.label}</div>
                <div className="text-[14px] font-semibold text-ink">{x.value}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </AppWindow>
  );
}

function CrmContext({ t, noteRef: ref }: { t: number; noteRef: NoteRef }) {
  const note = useNote(ref);
  const erp = useStudio((s) => s.erp);
  if (!note) return null;
  const docs: CloudDoc[] = [
    ...erp.partners.filter((p) => p.isCompany).map((p) => ({ id: p.id, label: p.name, sub: `res.partner · ${p.city}`, kind: 'partner' as const })),
    ...erp.leads.filter((l) => l.stage !== 'Ganado').map((l) => ({ id: l.id, label: l.name, sub: `crm.lead · ${l.stage}`, kind: 'order' as const })),
    ...erp.saleOrders.slice(0, 5).map((o) => ({ id: o.id, label: o.name, sub: `sale.order · ${eur(orderTotal(o))}`, kind: 'order' as const })),
    ...erp.products.filter((p) => ['pr-cb30', 'pr-vb2', 'pr-ej12'].includes(p.id)).map((p) => ({ id: p.id, label: p.defaultCode, sub: `product · ${eur(p.listPrice)}`, kind: 'product' as const })),
  ];
  const selected = [note.parse.partnerId, note.parse.leadId, ...erp.saleOrders.filter((o) => o.partnerId === note.parse.partnerId).map((o) => o.id).slice(0, 2), ...(note.transcript.includes('CB-30') ? ['pr-cb30'] : [])].filter(Boolean) as string[];
  const rejected = note.parse.discarded.map((d) => ({ id: erp.partners.find((p) => p.name === d.name)?.id ?? d.name, reason: d.reason }));
  return (
    <BrainCloud t={t} docs={docs} selected={selected.filter((id) => docs.some((d) => d.id === id))} rejected={rejected}
      query={`${note.parse.contactName ?? ''} · ${note.parse.partnerName ?? 'cliente'} · oportunidad abierta`} centerLabel="C04 · CRM" centerSub={`${docs.length} registros de Odoo`}
      scanAt={1200} matchAt={3800} flyAt={4800} selectedTitle="Registros vinculados" rejectedTitle="Descartados"
      footer={t >= 6200 ? <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white/[0.04] p-3 text-[12.5px] text-secondary ring-1 ring-white/10">{note.parse.leadName ? <>Oportunidad abierta: <b className="text-white">{note.parse.leadName}</b></> : 'Sin oportunidad abierta: se propondrá crear una nueva.'}</motion.div> : null} />
  );
}

function Proposal({ t, noteRef: ref }: { t: number; noteRef: NoteRef }) {
  const note = useNote(ref);
  const lead = useStudio((s) => s.erp.leads.find((l) => l.id === note?.parse.leadId));
  if (!note) return null;
  const p = note.parse;
  return (
    <div className="grid h-full gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="text-[11.5px] font-semibold uppercase tracking-wider text-gold-light">Cambios en la oportunidad · C04</div>
        {p.stage && (
          <Reveal t={t} at={500}>
            <div className="rounded-2xl bg-white p-4 text-ink shadow-xl">
              <div className="text-[12px] text-ink-3">Etapa</div>
              <div className="mt-2 flex items-center gap-3"><span className="rounded-lg bg-canvas px-3 py-1.5 text-[15px] ring-1 ring-line">{p.stage.from ?? 'Nueva'}</span><ArrowRight className="size-5 text-[#8a6100]" /><motion.span initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4, type: 'spring' }} className={cx('rounded-lg px-3 py-1.5 text-[15px] font-semibold', p.stage.to === 'Perdido' ? 'bg-err-bg text-err' : 'bg-gold/20 text-[#7a5600]')}>{p.stage.to}</motion.span></div>
              {p.lostReason && <div className="mt-2 text-[12.5px] text-err">Motivo: {p.lostReason}</div>}
            </div>
          </Reveal>
        )}
        {p.revenue && (
          <Reveal t={t} at={1500}>
            <div className="rounded-2xl bg-white p-4 text-ink shadow-xl">
              <div className="text-[12px] text-ink-3">Importe esperado</div>
              <div className="mt-1 flex items-baseline gap-3"><span className="text-[16px] text-ink-3 line-through">{p.revenue.from ? eur(p.revenue.from) : '—'}</span><span className="text-[30px] font-semibold tracking-tight"><CountUp t={t} from={1700} value={p.revenue.to} format={eur} /></span><TrendingUp className="size-5 text-ok" /></div>
              <div className="text-[12px] text-ink-3">{p.revenue.basis}</div>
            </div>
          </Reveal>
        )}
        {p.risks.length > 0 && <Reveal t={t} at={2600}><div className="flex flex-wrap gap-2">{p.risks.map((r) => <span key={r.label} className="rounded-full bg-[#f59e0b]/15 px-3 py-1.5 text-[13px] text-[#fcd34d] ring-1 ring-[#f59e0b]/40">⚠ {r.label}: {r.value}</span>)}</div></Reveal>}
        {!lead && p.partnerName && <Reveal t={t} at={600}><div className="rounded-2xl bg-white p-4 text-ink shadow-xl"><div className="text-[12px] text-ink-3">Nueva oportunidad</div><div className="text-[18px] font-semibold">{note.actions.find((a) => a.kind === 'create_lead')?.title.replace('Crear oportunidad ', '')}</div><div className="text-[13px] text-ink-3">{p.partnerName} · Cualificado</div></div></Reveal>}
      </div>
      <div className="space-y-3">
        <div className="text-[11.5px] font-semibold uppercase tracking-wider text-gold-light">Próximas acciones con fecha</div>
        {p.activities.map((a, i) => (
          <Reveal key={a.fragment} t={t} at={3200 + i * 900} x={30} y={0}>
            <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10">
              <span className="flex size-11 items-center justify-center rounded-xl bg-gold text-navy [&>svg]:size-5">{TYPE_ICON[a.type]}</span>
              <div><div className="text-[15px] font-semibold text-white">{a.summary}</div><div className="text-[12.5px] capitalize text-secondary">{longDate(a.dueDate)}</div><div className="text-[11.5px] italic text-muted">«{a.fragment}»</div></div>
            </div>
          </Reveal>
        ))}
        <Reveal t={t} at={3200 + p.activities.length * 900 + 300}><div className="rounded-xl bg-white/[0.04] px-3 py-2 text-[12.5px] text-muted ring-1 ring-white/10">Fechas habladas («mañana», «el jueves», «en marzo») convertidas a fechas concretas.</div></Reveal>
      </div>
    </div>
  );
}

function OdooLead({ t, noteRef: ref }: { t: number; noteRef: NoteRef }) {
  const note = useNote(ref);
  const erp = useStudio((s) => s.erp);
  if (!note) return null;
  const leadId = note.parse.leadId ?? note.actions.find((a) => a.kind === 'create_lead')?.resultId;
  const lead = erp.leads.find((l) => l.id === leadId);
  const acts = (erp.activities ?? []).filter((a) => note.actions.some((x) => x.resultId === a.id));
  return (
    <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <AppWindow section={`Odoo › CRM › ${lead?.name ?? 'Nueva oportunidad'}`} className="h-full" right={<BrandLogo src="/brands/odoo.svg" name="Odoo" size={22} />}>
        <div className="p-5">
          {!lead ? <div className="py-16 text-center text-[14px] text-ink-3 animate-pulse">Creando oportunidad…</div> : (
            <>
              <div className="flex gap-1">{LEAD_STAGES.map((s) => <div key={s} className={cx('flex h-8 flex-1 items-center justify-center text-[12px] font-medium transition-colors duration-300 first:rounded-l-lg last:rounded-r-lg', s === lead.stage ? (s === 'Perdido' ? 'bg-err text-white' : 'bg-[#714b67] text-white') : 'bg-canvas text-ink-3')}>{s}</div>)}</div>
              <div className="mt-4 flex items-baseline justify-between gap-3"><h2 className="text-[22px] font-semibold text-ink">{lead.name}</h2><span className="text-[22px] font-semibold tabular text-ink">{eur(lead.expectedRevenue)}</span></div>
              <div className="text-[13px] text-ink-3">{erp.partners.find((p) => p.id === lead.partnerId)?.name} · {lead.contactName} · probabilidad {lead.probability} %</div>
              {lead.risks && <div className="mt-2 flex flex-wrap gap-1.5">{lead.risks.map((r) => <span key={r} className="rounded-full bg-warn-bg px-2 py-0.5 text-[12px] text-warn">{r}</span>)}</div>}
              <div className="mt-4 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Historial</div>
              <ol className="mt-2 space-y-2">
                <AnimatePresence initial={false}>
                  {[...(lead.log ?? [])].reverse().slice(0, 3).map((m, i) => (
                    <motion.li key={m.at + i} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={cx('rounded-xl px-3 py-2 text-[13px] ring-1', m.source === 'voz' ? 'bg-gold/10 ring-gold/40' : 'bg-canvas ring-line')}>
                      <div className="text-[11.5px] text-ink-3">{m.source === 'voz' ? '🎙 Nota de voz · ' : ''}{m.by}</div><div className="line-clamp-2 text-ink-2">{m.text}</div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ol>
            </>
          )}
        </div>
      </AppWindow>
      <div className="space-y-3">
        <Reveal t={t} at={400}><AgentPulse code="HUM" label="El comercial aprueba cada cambio" active={note.actions.some((a) => a.status === 'proposed')} done={note.actions.every((a) => a.status !== 'proposed')} /></Reveal>
        {note.actions.map((a) => (
          <div key={a.id} className={cx('rounded-2xl px-4 py-3 ring-1 transition-colors duration-500', a.status === 'applied' ? 'bg-[#16a34a]/12 ring-[#16a34a]/40' : 'bg-white/[0.04] ring-white/10')}>
            <div className="flex items-center justify-between gap-2"><span className="text-[13.5px] font-medium text-white">{a.title}</span>{a.status === 'applied' ? <CheckCircle2 className="size-4 text-[#86efac]" /> : <span className="text-[11.5px] text-muted animate-pulse">pendiente</span>}</div>
            <div className="text-[12px] text-muted">{a.description}</div>
          </div>
        ))}
        {acts.length > 0 && <div className="text-[12px] text-muted">{acts.length} actividades añadidas a la agenda</div>}
      </div>
    </div>
  );
}

function Agenda({ t, highlight }: { t: number; highlight: () => string[] }) {
  const acts = useStudio((s) => s.erp.activities ?? []);
  const partners = useStudio((s) => s.erp.partners);
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d.toISOString().slice(0, 10); });
  const hi = highlight();
  const later = acts.filter((a) => !a.done && a.dueDate > days[6] && hi.includes(a.id));
  const first = acts.find((a) => hi.includes(a.id));
  return (
    <div className="relative grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <AppWindow section="Asistente comercial › Agenda de la semana" className="h-full">
        <div className="grid h-full grid-cols-7 divide-x divide-line">
          {days.map((d, i) => (
            <div key={d} className={cx('p-2', i === 0 && 'bg-gold/[0.05]')}>
              <div className="mb-2 text-center"><div className="text-[11px] uppercase text-ink-3">{new Date(`${d}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'short' })}</div><div className={cx('text-[18px] font-semibold', i === 0 ? 'text-[#8a6100]' : 'text-ink')}>{new Date(`${d}T12:00:00`).getDate()}</div></div>
              <div className="space-y-1.5">
                {acts.filter((a) => !a.done && a.dueDate === d).map((a, k) => (
                  <Reveal key={a.id} t={t} at={hi.includes(a.id) ? 900 + k * 500 : 0}>
                    <div className={cx('rounded-lg px-2 py-1.5 text-[11.5px] leading-tight ring-1', hi.includes(a.id) ? 'bg-gold/20 text-ink ring-gold shadow-[0_0_0_3px_rgb(230_168_23/0.2)]' : 'bg-canvas text-ink-2 ring-line')}>
                      <div className="flex items-center gap-1 font-semibold [&>svg]:size-3">{TYPE_ICON[a.type]}{a.type}</div>
                      <div className="line-clamp-2">{a.summary.split(' · ')[0]}</div>
                      <div className="truncate text-ink-3">{partners.find((p) => p.id === a.partnerId)?.name}</div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          ))}
        </div>
      </AppWindow>
      <div className="space-y-3">
        {later.map((a) => <Reveal key={a.id} t={t} at={1200}><div className="rounded-2xl bg-white/[0.05] p-4 ring-1 ring-white/10"><div className="text-[12px] text-muted">Más adelante</div><div className="text-[14px] font-semibold text-white">{a.summary}</div><div className="text-[12.5px] capitalize text-secondary">{longDate(a.dueDate)}</div></div></Reveal>)}
        <Reveal t={t} at={2600}><div className="rounded-2xl bg-[#16a34a]/12 p-4 text-[13.5px] text-[#86efac] ring-1 ring-[#16a34a]/40"><CheckCircle2 className="mb-1 size-5" />De una nota de voz a un CRM al día y una agenda con fechas, sin teclear.</div></Reveal>
      </div>
      <AnimatePresence>
        {first && t >= 3400 && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute bottom-2 right-2 z-20 flex w-[330px] items-start gap-3 rounded-2xl bg-white p-3.5 text-ink shadow-2xl ring-1 ring-gold/50">
            <span className="flex size-9 items-center justify-center rounded-xl bg-gold text-navy"><Bell className="size-5" /></span>
            <div><div className="text-[13px] font-semibold">Recordatorio · {first.type}</div><div className="text-[12.5px] text-ink-3">{first.summary}</div><div className="text-[11.5px] capitalize text-ink-3">{longDate(first.dueDate)} · 09:00</div></div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function buildVoiceScenario(sampleId: string): DemoScenario {
  const sample = VOICE_SAMPLES.find((v) => v.id === sampleId)!;
  const ref = makeNoteRef();
  const createdActs = () => (S().voiceNotes.find((n) => n.id === ref.id)?.actions ?? []).filter((a) => a.kind === 'create_activity' && a.resultId).map((a) => a.resultId!);
  const isNew = sampleId === 'v-cies';
  return {
    id: `crm-${sampleId}`, title: isNew ? 'CRM · Nueva oportunidad dictada' : 'CRM · Actualización por voz tras una visita', subtitle: sample.title, reference: 'C03 Voz + C04 CRM · ayuda al comercial',
    prepare: () => { S().resetCrmDemo(); ref.id = ''; },
    finale: [
      { label: 'Abrir el Asistente comercial', to: () => '/comercial' },
      { label: 'Ver la oportunidad en Odoo', to: () => { const n = S().voiceNotes.find((x) => x.id === ref.id); const id = n?.parse.leadId ?? n?.actions.find((a) => a.kind === 'create_lead')?.resultId; return id ? `/odoo/crm/${id}` : '/odoo/crm'; } },
    ],
    scenes: [
      { id: 'dictate', section: 'Voz', where: { label: 'Asistente comercial', to: '/comercial' }, title: isNew ? 'Una conversación en la feria' : 'El comercial sale de la visita', narration: 'Pulsa el micrófono y cuenta lo que ha pasado, como se lo contaría a un compañero. El agente de Voz transcribe mientras habla.', agents: ['C03'], duration: 1700 + sample.transcript.split(' ').length * 170 + 1800, Component: ({ t }) => <Dictation t={t} text={sample.transcript} context={sample.context} /> },
      { id: 'structure', section: 'Estructura', where: { label: 'Asistente comercial', to: '/comercial' }, title: 'De la voz a datos', narration: 'Cliente, cantidades, importes, riesgos y próximas acciones: cada dato señalado en lo que dijo el comercial, con las fechas habladas convertidas en fechas reales.', agents: ['C03'], duration: 8500, enter: () => { ref.id = S().processVoiceNote(sample.transcript, 'ejemplo', sampleId); }, Component: ({ t }) => <Structure t={t} noteRef={ref} /> },
      { id: 'context', section: 'CRM', where: { label: 'ERP Odoo › CRM', to: '/odoo/crm' }, title: 'Se cruza con el CRM', narration: 'El agente de CRM identifica al cliente por el contacto mencionado (no por un nombre parecido), recupera la oportunidad abierta y el historial de pedidos.', agents: ['C04', 'C07'], duration: 8000, Component: ({ t }) => <CrmContext t={t} noteRef={ref} /> },
      { id: 'proposal', section: 'Propuesta', where: { label: 'Asistente comercial', to: '/comercial' }, title: isNew ? 'Una oportunidad nueva y su siguiente paso' : 'Qué cambia en la oportunidad', narration: isNew ? 'No había nada abierto con este cliente: se propone crear la oportunidad con el importe dictado y la visita de la semana que viene.' : 'Sube la cantidad, pasa a negociación, aparece un competidor y quedan dos acciones con fecha. Todo propuesto, nada guardado aún.', agents: ['C04'], duration: 8000, Component: ({ t }) => <Proposal t={t} noteRef={ref} /> },
      { id: 'odoo', section: 'Odoo', where: { label: 'ERP Odoo › CRM', to: '/odoo/crm' }, title: 'El CRM se actualiza con su aprobación', narration: 'El comercial aprueba y la oportunidad se actualiza en Odoo, con la nota de voz en el historial. Reintentar no duplica nada.', agents: ['HUM', 'C04', 'ERP'],
        duration: 7500, at: [0, 1, 2].map((k) => ({ t: 1200 + k * 1300, run: () => { const n = S().voiceNotes.find((x) => x.id === ref.id); const a = n?.actions.filter((x) => x.status === 'proposed')[0]; if (n && a) S().applyCrmAction(n.id, a.id); } })), Component: ({ t }) => <OdooLead t={t} noteRef={ref} /> },
      { id: 'agenda', section: 'Agenda', where: { label: 'Asistente comercial › Agenda', to: '/comercial' }, title: 'La agenda ya está hecha', narration: 'Las acciones aparecen en la agenda con su fecha y recordatorio. El comercial llega a la siguiente visita sin tareas pendientes de anotar.', agents: ['C04'], duration: 7000, Component: ({ t }) => <Agenda t={t} highlight={createdActs} /> },
    ],
  };
}

// ── Preparar una reunión (ficha 360) ───────────────────────────────────────
const AFTER_MEETING = 'Reunión con Irene de Marina Norte: si la oferta del SP-118 encaja, firmarán la serie anual. Les mando la oferta revisada el viernes.';

function MeetingAlert({ t }: { t: number }) {
  const act = useStudio((s) => (s.erp.activities ?? []).find((a) => a.id === 'act-201'));
  return (
    <div className="relative flex h-full items-center justify-center">
      <AnimatePresence>{t >= 600 && (
        <motion.div initial={{ opacity: 0, y: -30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', duration: 0.7, bounce: 0.25 }} className="w-full max-w-[560px] rounded-3xl bg-white p-6 text-ink shadow-2xl">
          <div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-gold text-navy"><CalendarDays className="size-6" /></span><div><div className="text-[13px] text-ink-3">Recordatorio · mañana 10:00</div><div className="text-[20px] font-semibold">{act?.summary ?? 'Reunión con Marina Norte'}</div></div></div>
          <Reveal t={t} at={1800}><p className="mt-4 text-[14.5px] text-ink-2">¿Qué ha pasado con este cliente desde la última vez? Pedidos, ofertas abiertas, entregas, oportunidades… normalmente son 20 minutos buscando en el ERP y el correo.</p></Reveal>
          <Reveal t={t} at={3200}><div className="mt-4 flex items-center gap-2 rounded-xl bg-navy px-4 py-3 text-white"><Sparkles className="size-5 text-gold" /><span className="text-[14px]">MTI prepara la ficha del cliente automáticamente</span></div></Reveal>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}

function Gather({ t }: { t: number }) {
  const erp = useStudio((s) => s.erp);
  const requests = useStudio((s) => s.requests);
  const ids = new Set(['p-marina', 'p-marina-irene', 'p-marina-log']);
  const docs: CloudDoc[] = [
    ...erp.saleOrders.map((o) => ({ id: o.id, label: o.name, sub: `sale.order · ${erp.partners.find((p) => p.id === o.partnerId)?.name}`, kind: 'order' as const })),
    ...erp.leads.map((l) => ({ id: l.id, label: l.name, sub: `crm.lead · ${l.stage}`, kind: 'order' as const })),
    ...erp.pickings.map((p) => ({ id: p.id, label: p.name, sub: 'stock.picking', kind: 'picking' as const })),
    ...requests.map((r) => ({ id: r.id, label: r.ref, sub: `Oferta · ${r.customer.company}`, kind: 'job' as const })),
  ];
  const selected = [...erp.saleOrders.filter((o) => ids.has(o.partnerId)).map((o) => o.id), ...erp.leads.filter((l) => l.partnerId === 'p-marina').map((l) => l.id), ...erp.pickings.filter((p) => ids.has(p.partnerId)).map((p) => p.id), ...requests.filter((r) => r.customer.company === 'Marina Norte').map((r) => r.id)];
  return <BrainCloud t={t} docs={docs} selected={selected} rejected={[]} query="Marina Norte · últimos 12 meses" centerLabel="C04 + C07" centerSub="ERP, ofertas y CRM" scanAt={1000} matchAt={3600} flyAt={4600} selectedTitle="Todo sobre Marina Norte" rejectedTitle="" />;
}

function BriefDoc({ t }: { t: number }) {
  const erp = useStudio((s) => s.erp);
  const requests = useStudio((s) => s.requests);
  const c = customer360(erp, 'p-marina', requests);
  return (
    <AppWindow section="Asistente comercial › Ficha 360 · Marina Norte" className="h-full">
      <div className="grid h-full gap-5 p-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-2.5">
          {[['Pedidos confirmados', c.revenue12m, eur], ['Pipeline abierto', c.pipeline, eur], ['Ofertas de fabricación', c.rfqs.length, String], ['Presupuestos abiertos', c.open.length, String]].map(([k, v, f], i) => (
            <Reveal key={k as string} t={t} at={400 + i * 400}><div className="rounded-xl bg-canvas px-4 py-3 ring-1 ring-line"><div className="text-[12px] text-ink-3">{k as string}</div><div className="text-[22px] font-semibold tabular"><CountUp t={t} from={400 + i * 400} value={v as number} format={f === eur ? eur : (n) => String(Math.round(n))} /></div></div></Reveal>
          ))}
        </div>
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">Puntos a tratar mañana</div>
          <ul className="mt-2 space-y-2">{c.talking.map((x, i) => <Reveal key={x} t={t} at={2200 + i * 700} x={20} y={0}><li className="flex gap-2 rounded-xl bg-gold/[0.08] px-3 py-2.5 text-[14px] text-ink-2 ring-1 ring-gold/30"><Target className="mt-0.5 size-4 shrink-0 text-[#8a6100]" />{x}</li></Reveal>)}</ul>
          <Reveal t={t} at={2200 + c.talking.length * 700 + 300}><p className="mt-3 text-[12.5px] text-ink-3">Fuentes: Odoo (pedidos, entregas, CRM) y expedientes de ofertas. Ficha generada en segundos.</p></Reveal>
        </div>
      </div>
    </AppWindow>
  );
}

function AfterMeeting({ t, noteRef: ref }: { t: number; noteRef: NoteRef }) {
  const note = useNote(ref);
  return (
    <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="rounded-2xl bg-white/[0.04] p-6 ring-1 ring-white/10">
        <div className="flex items-center gap-2 text-[13px] text-gold-light"><Mic className="size-4" />Nota de voz tras la reunión</div>
        <div className="mt-3 text-[18px] leading-relaxed text-white"><Typewriter t={t} from={400} text={AFTER_MEETING} cps={45} /></div>
      </div>
      <div className="space-y-3">
        {(note?.actions ?? []).map((a, i) => (
          <Reveal key={a.id} t={t} at={3800 + i * 600}>
            <div className={cx('rounded-2xl px-4 py-3 ring-1', a.status === 'applied' ? 'bg-[#16a34a]/12 ring-[#16a34a]/40' : 'bg-white/[0.05] ring-white/10')}>
              <div className="flex items-center justify-between gap-2 text-[13.5px] font-medium text-white">{a.title}{a.status === 'applied' && <CheckCircle2 className="size-4 text-[#86efac]" />}</div>
              <div className="text-[12px] text-muted">{a.description}</div>
            </div>
          </Reveal>
        ))}
        <Reveal t={t} at={6500}><div className="rounded-2xl bg-[#16a34a]/12 p-4 text-[13.5px] text-[#86efac] ring-1 ring-[#16a34a]/40">Antes: ficha preparada sola. Después: CRM y agenda actualizados por voz.</div></Reveal>
      </div>
    </div>
  );
}

export function buildBriefingScenario(): DemoScenario {
  const ref = makeNoteRef();
  return {
    id: 'crm-brief', title: 'CRM · Preparar una reunión', subtitle: 'Ficha 360 automática y actualización por voz al salir', reference: 'C04 CRM + C07 Conocimiento + C03 Voz',
    prepare: () => { S().resetCrmDemo(); ref.id = ''; },
    finale: [{ label: 'Abrir el Asistente comercial', to: () => '/comercial' }, { label: 'Ver la oportunidad de Marina Norte', to: () => '/odoo/crm/l-118' }],
    scenes: [
      { id: 'alert', section: 'Agenda', where: { label: 'Asistente comercial › Agenda', to: '/comercial' }, title: 'Mañana hay reunión', narration: 'La agenda avisa de la reunión con Marina Norte. Preparar el contexto suele llevar tiempo y se hace con prisas.', agents: ['C04'], duration: 6000, Component: MeetingAlert },
      { id: 'gather', section: 'Cerebro', where: { label: 'Conocimiento', to: '/conocimiento' }, title: 'Se reúne todo lo del cliente', narration: 'Pedidos, entregas, oportunidades y ofertas de fabricación en curso: los agentes recogen lo relevante de cada sistema y descartan lo que no es de este cliente.', agents: ['C04', 'C07'], duration: 8000, Component: Gather },
      { id: 'brief', section: 'Ficha 360', where: { label: 'Asistente comercial › Preparar una reunión', to: '/comercial' }, title: 'La ficha, lista para la reunión', narration: 'Cifras clave y puntos a tratar, cada uno ligado a su registro. El comercial entra a la reunión sabiendo qué está abierto y qué proponer.', agents: ['C04', 'C07'], duration: 8000, Component: BriefDoc },
      { id: 'after', section: 'Voz', where: { label: 'Asistente comercial', to: '/comercial' }, title: 'Al salir, una nota de voz', narration: 'Treinta segundos de voz y el CRM queda al día: nota en la oportunidad y la acción del viernes en la agenda.', agents: ['C03', 'C04', 'HUM'], duration: 8500,
        enter: () => { ref.id = S().processVoiceNote(AFTER_MEETING, 'ejemplo'); },
        at: [{ t: 4600, run: () => { const n = S().voiceNotes.find((x) => x.id === ref.id); n?.actions.forEach((a) => S().applyCrmAction(n.id, a.id)); } }],
        Component: ({ t }) => <AfterMeeting t={t} noteRef={ref} /> },
    ],
  };
}
