import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, ArrowRight, CalendarDays, Check, CheckCircle2, Copy, FileText, Mic, MicOff, Phone, Sparkles, Target, Users, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Activity } from '@/domain/erp';
import { LEAD_STAGES, orderTotal } from '@/domain/erp';
import { Badge, Button, Card, CardHeader, EmptyState, Select, Textarea } from '@/components/ui';
import { BarList } from '@/components/ui/charts';
import { VOICE_SAMPLES } from '@/fixtures/voice';
import { customer360 } from '@/services/crm/voiceNote';
import { useStudio, type VoiceNote } from '@/store/useStudio';
import { useSpeech } from '@/lib/useSpeech';
import { useMotionOff } from '@/lib/useMotion';
import { cx, dateEs, dateTimeEs, eur } from '@/lib/format';
import { MultiHighlight } from '../demo/kit';

const TYPE_ICON: Record<Activity['type'], React.ReactNode> = { Llamada: <Phone />, Reunión: <Users />, Email: <FileText />, Tarea: <Check /> };
const todayIso = () => new Date().toISOString().slice(0, 10);

export function Waveform({ active, bars = 28, className }: { active: boolean; bars?: number; className?: string }) {
  const motionOff = useMotionOff();
  return (
    <div className={cx('flex h-10 items-center gap-[3px]', className)} aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} className={cx('w-[3px] rounded-full', active ? 'bg-gold' : 'bg-ink/15')}
          style={{ height: active && !motionOff ? undefined : 6, animation: active && !motionOff ? `wave 0.9s ${(i % 7) * 0.08}s ease-in-out infinite alternate` : undefined }} />
      ))}
      <style>{'@keyframes wave { from { height: 4px } to { height: 34px } }'}</style>
    </div>
  );
}

export default function SalesAssistantPage() {
  const notes = useStudio((s) => s.voiceNotes ?? []);
  const erp = useStudio((s) => s.erp);
  const process = useStudio((s) => s.processVoiceNote);
  const speech = useSpeech();
  const [text, setText] = useState('');
  const [source, setSource] = useState<VoiceNote['source']>('texto');
  const [sampleId, setSampleId] = useState<string | undefined>();
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  const motionOff = useMotionOff();

  useEffect(() => { if (speech.listening || speech.text) { setText(speech.text); setSource('micrófono'); } }, [speech.text, speech.listening]);
  useEffect(() => () => clearInterval(timer.current), []);

  const playSample = (id: string) => {
    const s = VOICE_SAMPLES.find((v) => v.id === id)!;
    clearInterval(timer.current);
    setSampleId(id); setSource('ejemplo');
    if (motionOff) { setText(s.transcript); return; }
    setPlaying(true); setText('');
    const words = s.transcript.split(' ');
    let i = 0;
    timer.current = setInterval(() => {
      i += 2;
      setText(words.slice(0, i).join(' '));
      if (i >= words.length) { clearInterval(timer.current); setPlaying(false); }
    }, 90);
  };

  const submit = () => {
    const id = process(text.trim(), source, sampleId);
    setSelected(id); setText(''); setSampleId(undefined); speech.setFinalText('');
  };
  const note = notes.find((n) => n.id === selected) ?? notes[0];
  const recording = speech.listening || playing;

  return (
    <div className="mx-auto max-w-[1680px] space-y-5 px-4 py-5 md:px-6">
      <div>
        <p className="text-[13px] font-medium text-[#8a6100]">Operaciones · C03 Voz + C04 CRM</p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight md:text-[32px]">Asistente comercial</h1>
        <p className="mt-1 max-w-3xl text-[14.5px] text-ink-3">Al salir de una visita, dicta lo que ha pasado. Los agentes lo convierten en cambios del CRM —etapa, importe, riesgos, próximas acciones con fecha— y tú decides qué se guarda.</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <div className="tech-grid flex flex-wrap items-center gap-5 px-5 py-5 text-white">
              <button onClick={() => (speech.listening ? speech.stop() : speech.start())} disabled={playing}
                aria-label={speech.listening ? 'Detener dictado' : 'Dictar nota de voz'}
                className={cx('relative flex size-16 shrink-0 items-center justify-center rounded-full transition-colors', speech.listening ? 'bg-[#dc2626] text-white' : 'bg-gold text-navy hover:bg-gold-light', 'disabled:opacity-50')}>
                {speech.listening && !motionOff && <span className="absolute inset-0 animate-ping rounded-full bg-[#dc2626]/40" />}
                {speech.listening ? <MicOff className="relative size-7" /> : <Mic className="relative size-7" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold">{speech.listening ? 'Escuchando… habla con normalidad' : playing ? 'Reproduciendo nota de ejemplo…' : 'Dicta una nota o elige un ejemplo'}</div>
                <div className="text-[12.5px] text-muted">{speech.supported ? 'Reconocimiento de voz del navegador (es-ES). El audio lo procesa el servicio del navegador.' : 'Tu navegador no ofrece dictado: usa un ejemplo o escribe.'}</div>
                <Waveform active={recording} className="mt-2" />
              </div>
            </div>
            <div className="space-y-3 p-4">
              <div className="flex flex-wrap gap-2">
                {VOICE_SAMPLES.map((v) => (
                  <button key={v.id} onClick={() => playSample(v.id)} disabled={recording} className={cx('rounded-xl px-3 py-2 text-left ring-1 transition-colors disabled:opacity-50', sampleId === v.id ? 'bg-gold/10 ring-gold/50' : 'bg-white ring-line hover:ring-line-strong')}>
                    <div className="flex items-center gap-1.5 text-[13px] font-medium"><Mic className="size-3.5 text-[#8a6100]" />{v.title}</div>
                    <div className="text-[11.5px] text-ink-3">{v.context} · {v.durationS} s</div>
                  </button>
                ))}
              </div>
              {speech.error && <p className="rounded-lg bg-warn-bg px-3 py-2 text-[12.5px] text-warn">{speech.error}</p>}
              <Textarea value={text} onChange={(e) => { setText(e.target.value); setSource('texto'); }} rows={4} placeholder="La transcripción aparece aquí; también puedes escribir o corregir el texto." aria-label="Transcripción de la nota" />
              <div className="flex justify-end">
                <Button variant="primary" icon={<Sparkles />} disabled={!text.trim() || recording} disabledReason={recording ? 'Espera a que termine el dictado' : 'Dicta o escribe una nota'} onClick={submit} data-testid="process-note">Procesar con agentes</Button>
              </div>
            </div>
          </Card>

          {note ? <NoteResult note={note} /> : <Card><EmptyState icon={<Mic />} title="Aún no hay notas">Dicta tu primera nota o prueba con un ejemplo.</EmptyState></Card>}
          <Briefing />
        </div>

        <div className="space-y-4">
          <Agenda />
          <Card>
            <CardHeader title="Embudo comercial" icon={<Target />} subtitle="Oportunidades abiertas por etapa (importe)" actions={<Link to="/odoo/crm" className="text-[13px] font-medium text-[#8a6100] hover:underline">CRM</Link>} />
            <div className="p-4"><BarList rows={LEAD_STAGES.filter((s) => s !== 'Ganado').map((s) => ({ key: s, label: `${s} · ${erp.leads.filter((l) => l.stage === s).length}`, value: erp.leads.filter((l) => l.stage === s).reduce((a, l) => a + l.expectedRevenue, 0) }))} format={eur} color="#2a78d6" /></div>
          </Card>
          {notes.length > 0 && (
            <Card>
              <CardHeader title="Notas de voz" subtitle={`${notes.length} procesadas`} />
              <ul className="divide-y divide-line">{notes.slice(0, 8).map((n) => (
                <li key={n.id}><button onClick={() => setSelected(n.id)} className={cx('w-full px-4 py-2.5 text-left hover:bg-gold/[0.04]', note?.id === n.id && 'bg-gold/[0.06]')}>
                  <div className="flex items-center justify-between gap-2 text-[12px] text-ink-3"><span>{n.parse.partnerName ?? 'Sin cliente'}</span><span>{dateTimeEs(n.at)}</span></div>
                  <div className="line-clamp-1 text-[13px]">{n.transcript}</div>
                </button></li>
              ))}</ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function NoteResult({ note }: { note: VoiceNote }) {
  const apply = useStudio((s) => s.applyCrmAction);
  const reject = useStudio((s) => s.rejectCrmAction);
  const lead = useStudio((s) => s.erp.leads.find((l) => l.id === note.parse.leadId));
  const p = note.parse;
  const fragments = [...p.extracted, ...p.risks, ...p.activities.map((a) => ({ fragment: a.fragment }))].map((x) => x.fragment).filter(Boolean);
  const pending = note.actions.filter((a) => a.status === 'proposed');
  return (
    <Card data-testid="note-result">
      <CardHeader title="Lo que han entendido los agentes" icon={<Sparkles />} subtitle={`${note.source === 'micrófono' ? 'Dictado' : note.source === 'ejemplo' ? 'Nota de ejemplo' : 'Texto'} · ${dateTimeEs(note.at)}`}
        actions={pending.length > 1 && <Button size="sm" variant="primary" icon={<Check />} onClick={() => pending.forEach((a) => apply(note.id, a.id))}>Aprobar todo</Button>} />
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div>
          <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Transcripción</div>
          <MultiHighlight className="block rounded-xl bg-canvas p-3 text-[14px] leading-relaxed text-ink-2 ring-1 ring-line" text={note.transcript} marks={fragments.map((f) => ({ needle: f, on: true }))} />
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {p.partnerName ? <Badge tone="ok"><CheckCircle2 className="size-3" />{p.partnerName}</Badge> : <Badge tone="warn">Cliente sin identificar</Badge>}
            {p.contactName && <Badge tone="neutral">{p.contactName}</Badge>}
            {lead ? <Link to={`/odoo/crm/${lead.id}`}><Badge tone="info">{lead.name} · {lead.stage}</Badge></Link> : p.partnerName && <Badge tone="gold">Sin oportunidad abierta</Badge>}
          </div>
          {p.discarded.map((d) => <p key={d.name} className="text-[12px] text-ink-3">Descartado «{d.name}»: {d.reason}</p>)}
          <dl className="grid grid-cols-2 gap-2">{p.extracted.filter((e) => !['Cliente', 'Contacto'].includes(e.label)).map((e) => <div key={e.label} className="rounded-lg bg-canvas px-2.5 py-1.5 ring-1 ring-line"><dt className="text-[11.5px] text-ink-3">{e.label}</dt><dd className="text-[13px] font-medium">{e.value}</dd></div>)}</dl>
          {p.risks.map((r) => <div key={r.label} className="flex items-center gap-2 rounded-lg bg-warn-bg px-2.5 py-1.5 text-[12.5px] text-warn"><AlertTriangle className="size-3.5" />{r.label}: {r.value}</div>)}
          {!p.partnerName && <p className="rounded-lg bg-info-bg px-3 py-2 text-[12.5px] text-info">No se ha identificado un cliente del CRM: no se propone ninguna escritura. Menciona la empresa en la nota.</p>}
        </div>
      </div>
      {note.actions.length > 0 && (
        <div className="border-t border-line">
          <div className="px-4 pt-3 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Cambios propuestos en el CRM</div>
          <ul className="divide-y divide-line">
            {note.actions.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3" data-crm-action={a.kind}>
                <span className="flex size-8 items-center justify-center rounded-lg bg-navy text-white [&>svg]:size-4">{a.kind === 'create_activity' ? <CalendarDays /> : <Target />}</span>
                <div className="min-w-0 flex-1"><div className="text-[14px] font-medium">{a.title}</div><div className="text-[12.5px] text-ink-3">{a.description}</div></div>
                {a.status === 'proposed' ? (
                  <>
                    <Button size="sm" variant="primary" icon={<Check />} onClick={() => apply(note.id, a.id)}>Aprobar</Button>
                    <Button size="sm" variant="ghost" icon={<X />} onClick={() => reject(note.id, a.id)}>Descartar</Button>
                  </>
                ) : a.status === 'applied' ? <Badge tone="ok"><CheckCircle2 className="size-3" />Guardado en el CRM</Badge> : <Badge tone="neutral">Descartado</Badge>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

function Agenda() {
  const acts = useStudio((s) => s.erp.activities ?? []);
  const partners = useStudio((s) => s.erp.partners);
  const complete = useStudio((s) => s.completeActivity);
  const open = [...acts].filter((a) => !a.done).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const t = todayIso();
  const groups: [string, Activity[]][] = [['Vencidas', open.filter((a) => a.dueDate < t)], ['Hoy', open.filter((a) => a.dueDate === t)], ['Próximas', open.filter((a) => a.dueDate > t)]];
  return (
    <Card>
      <CardHeader title="Agenda" icon={<CalendarDays />} subtitle={`${open.length} actividades pendientes`} />
      <div className="space-y-3 p-4">
        {groups.map(([g, list]) => list.length > 0 && (
          <div key={g}>
            <div className={cx('mb-1.5 text-[11.5px] font-semibold uppercase tracking-wider', g === 'Vencidas' ? 'text-err' : 'text-ink-3')}>{g}</div>
            <ul className="space-y-1.5">
              <AnimatePresence initial={false}>
                {list.map((a) => (
                  <motion.li key={a.id} layout initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} className="flex items-start gap-2.5 rounded-xl bg-canvas px-3 py-2 ring-1 ring-line" data-activity={a.id}>
                    <button onClick={() => complete(a.id)} aria-label={`Completar ${a.summary}`} className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md ring-1 ring-line-strong hover:bg-ok-bg hover:ring-ok"><Check className="size-3 text-transparent hover:text-ok" /></button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[13px] font-medium"><span className="text-ink-3 [&>svg]:size-3.5">{TYPE_ICON[a.type]}</span>{a.summary}</div>
                      <div className="text-[11.5px] text-ink-3">{new Date(`${a.dueDate}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} · {partners.find((p) => p.id === a.partnerId)?.name}{a.source === 'voz' && ' · desde nota de voz'}</div>
                    </div>
                    {a.leadId && <Link to={`/odoo/crm/${a.leadId}`} aria-label="Abrir oportunidad"><ArrowRight className="size-4 text-ink-3" /></Link>}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        ))}
        {open.length === 0 && <p className="py-4 text-center text-[13px] text-ink-3">Agenda al día.</p>}
      </div>
    </Card>
  );
}

function Briefing() {
  const erp = useStudio((s) => s.erp);
  const requests = useStudio((s) => s.requests);
  const toast = useStudio((s) => s.toast);
  const companies = erp.partners.filter((p) => p.isCompany);
  const [pid, setPid] = useState('p-marina');
  const c = useMemo(() => customer360(erp, pid, requests), [erp, pid, requests]);
  const text = `Ficha de cliente · ${c.partner.name}\nPedidos confirmados: ${eur(c.revenue12m)} · pipeline abierto: ${eur(c.pipeline)}\n${c.talking.map((t) => `· ${t}`).join('\n')}`;
  return (
    <Card>
      <CardHeader title="Preparar una reunión" icon={<Users />} subtitle="Ficha 360 del cliente compuesta por C04 y C07 con datos del ERP y de las ofertas"
        actions={<div className="flex gap-2"><Select value={pid} onChange={(e) => setPid(e.target.value)} className="h-8 max-w-[220px] py-1 text-[13px]" aria-label="Cliente">{companies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select><Button size="sm" icon={<Copy />} onClick={() => { navigator.clipboard?.writeText(text); toast('info', 'Ficha copiada'); }}>Copiar</Button></div>} />
      <div className="grid gap-4 p-4 lg:grid-cols-3">
        <div className="space-y-2">
          {[['Pedidos confirmados', eur(c.revenue12m)], ['Pipeline abierto', eur(c.pipeline)], ['Presupuestos abiertos', String(c.open.length)], ['Ofertas de fabricación', String(c.rfqs.length)], ['Actividades pendientes', String(c.acts.length)]].map(([k, v]) => (
            <div key={k} className="flex justify-between rounded-lg bg-canvas px-3 py-2 text-[13px] ring-1 ring-line"><span className="text-ink-3">{k}</span><b className="tabular">{v}</b></div>
          ))}
        </div>
        <div className="lg:col-span-2">
          <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Puntos a tratar</div>
          {c.talking.length === 0 ? <p className="text-[13px] text-ink-3">Sin temas abiertos con este cliente.</p> : <ul className="space-y-1.5">{c.talking.map((t) => <li key={t} className="flex gap-2 text-[13.5px] text-ink-2"><Sparkles className="mt-0.5 size-3.5 shrink-0 text-[#8a6100]" />{t}</li>)}</ul>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {c.orders.slice(-4).map((o) => <Link key={o.id} to={`/odoo/ventas/${o.id}`} className="rounded-lg bg-canvas px-2 py-1 text-[12px] ring-1 ring-line hover:ring-gold/50">{o.name} · {eur(orderTotal(o))}</Link>)}
            {c.rfqs.map((r) => <Link key={r.id} to={`/fabricacion/${r.id}`} className="rounded-lg bg-gold/10 px-2 py-1 text-[12px] ring-1 ring-gold/30 hover:ring-gold/60">{r.ref}</Link>)}
          </div>
          <p className="mt-3 text-[12px] text-ink-3">Última actualización: {dateEs(new Date().toISOString())} · datos de la demo</p>
        </div>
      </div>
    </Card>
  );
}
