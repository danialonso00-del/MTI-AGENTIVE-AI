// Renderizadores genéricos de escenas. Todo se dirige con el reloj `t` del reproductor.
import { AnimatePresence, motion } from 'motion/react';
import { AgentIcon } from '@/components/agents/AgentIcon';
import { AlertTriangle, ArrowRight, Bell, CheckCircle2, Cpu, Mail, MessageCircle, Phone, PhoneCall, Smartphone, Stamp, Thermometer, Truck } from 'lucide-react';
import { BrandLogo } from '@/components/layout/Brand';
import { cx, eur, num } from '@/lib/format';
import { AgentPulse, AppWindow, CountUp, MultiHighlight, prog, Reveal, ScanLine, Typewriter } from './kit';
import { BrainCloud } from './BrainCloud';
import type { Flow, FlowVisual, Fmt, Tone } from './flowTypes';
import type { DemoScenario } from './types';

export const fmt = (f: Fmt, v: number) => {
  switch (f) {
    case 'eur': return eur(v);
    case 'min': return `${num(v, 0)} min`;
    case 'pct': return `${num(v, 1)} %`;
    case 'kwh': return `${num(v, 0)} kWh`;
    case 'h': return `${num(v, 1)} h`;
    case 'km': return `${num(v, 0)} km`;
    case 'kg': return `${num(v, 0)} kg`;
    default: return num(v, 0);
  }
};
const toneText: Record<string, string> = { ok: 'text-ok', warn: 'text-warn', err: 'text-err', info: 'text-info', gold: 'text-[#8a6100]' };
const toneRing: Record<string, string> = { ok: 'ring-ok/40 bg-ok-bg/60', warn: 'ring-warn/40 bg-warn-bg/70', err: 'ring-err/40 bg-err-bg/70', info: 'ring-line bg-white', gold: 'ring-gold/50 bg-gold/10' };

// ── Entrada por canal ──
function Inbound({ v, t, agent }: { v: Extract<FlowVisual, { kind: 'inbound' }>; t: number; agent?: string }) {
  const icon = { email: <Mail />, whatsapp: <MessageCircle />, call: <PhoneCall />, iot: <Thermometer />, form: <Smartphone />, erp: <Cpu />, portal: <Cpu />, system: <Cpu /> }[v.channel];
  const logo = v.logo ?? (v.channel === 'email' ? '/brands/gmail.svg' : v.channel === 'whatsapp' ? '/brands/whatsapp.svg' : v.channel === 'erp' ? '/brands/odoo.svg' : undefined);
  return (
    <div className="relative grid h-full items-center gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex justify-center">
        {v.channel === 'call' ? (
          <div className="w-[320px] rounded-[38px] bg-[#0b0f19] p-3 ring-1 ring-white/15 shadow-[0_40px_90px_-30px_rgb(0_0_0/0.9)]">
            <div className="rounded-[28px] bg-navy-mid px-6 py-10 text-center">
              <div className="text-[12px] text-muted">{t < 2600 ? 'Llamada entrante' : 'En curso · Agente de Voz'}</div>
              <div className="mt-6 flex justify-center"><span className="relative flex size-24 items-center justify-center">{t < 2600 && <span className="absolute inset-0 animate-ping rounded-full bg-[#16a34a]/30" />}<span className={cx('relative flex size-20 items-center justify-center rounded-full', t < 2600 ? 'bg-[#16a34a]' : 'bg-gold')}><Phone className="size-9 text-white" /></span></span></div>
              <div className="mt-5 font-mono text-[18px] text-white">{v.from}</div>
              <div className="mt-1 text-[13px] text-secondary">{v.subject}</div>
              {t >= 2600 && <div className="mt-4 font-mono text-[13px] text-gold-light">● En vivo · {clock(Math.floor(Math.min(t - 2600, 47000) / 1000))}</div>}
            </div>
          </div>
        ) : v.channel === 'whatsapp' ? (
          <div className="w-[330px] overflow-hidden rounded-[36px] bg-[#0b141a] p-2.5 ring-1 ring-white/15">
            <div className="flex items-center gap-2 rounded-t-[28px] bg-[#075e54] px-4 py-3"><BrandLogo src="/brands/whatsapp.svg" name="WhatsApp" size={24} plate={false} /><div><div className="text-[14px] font-semibold text-white">{v.from}</div><div className="text-[11px] text-white/70">{v.subject}</div></div></div>
            <div className="h-[300px] bg-[#efe7dc] p-3"><Reveal t={t} at={1400}><div className="max-w-[260px] rounded-xl rounded-tl-sm bg-white px-3 py-2 text-[14px] text-ink shadow-sm">{v.body}</div></Reveal></div>
          </div>
        ) : v.channel === 'iot' || v.channel === 'form' ? (
          <Reveal t={t} at={600}>
            <div className="w-[360px] rounded-3xl bg-white p-5 text-ink shadow-2xl">
              <div className="flex items-center gap-3"><span className={cx('flex size-12 items-center justify-center rounded-2xl text-white [&>svg]:size-6', v.channel === 'iot' ? 'bg-err' : 'bg-navy')}>{icon}</span><div><div className="text-[12px] text-ink-3">{v.from}</div><div className="text-[17px] font-semibold">{v.subject}</div></div></div>
              <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-2">{v.body}</p>
              {v.meta && <div className="mt-3 flex flex-wrap gap-1.5">{v.meta.map((m) => <span key={m} className="rounded-full bg-canvas px-2 py-0.5 text-[12px] ring-1 ring-line">{m}</span>)}</div>}
            </div>
          </Reveal>
        ) : (
          <AppWindow section={v.channel === 'email' ? 'Bandeja MTI · correo entrante' : v.channel === 'erp' ? 'Odoo · evento del ERP' : 'Evento del sistema'} className="w-full max-w-[720px]" right={logo && <BrandLogo src={logo} name={v.channel} size={20} plate={false} />}>
            <div className="p-2">
              <Reveal t={t} at={800} y={-24}>
                <div className="rounded-xl bg-gold/[0.1] px-4 py-3.5 ring-1 ring-gold/40">
                  <div className="flex items-center gap-2 text-[13px] text-ink"><b>{v.from}</b><span className="rounded bg-gold px-1.5 text-[10.5px] font-bold text-navy">NUEVO</span></div>
                  <div className="text-[15px] font-semibold text-ink">{v.subject}</div>
                  <div className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-2">{v.body}</div>
                  {v.meta && <div className="mt-2 flex flex-wrap gap-1.5">{v.meta.map((m) => <span key={m} className="rounded-md bg-white px-2 py-0.5 font-mono text-[11.5px] text-ink-2 ring-1 ring-line">{m}</span>)}</div>}
                </div>
              </Reveal>
            </div>
          </AppWindow>
        )}
      </div>
      <div className="space-y-3">
        <Reveal t={t} at={2600}><AgentPulse code={agent ?? (v.channel === 'call' ? 'C03' : 'C01')} label={v.channel === 'call' ? 'Atiende y transcribe en vivo' : v.channel === 'iot' ? 'Evento detectado' : v.channel === 'form' ? 'Recibe la pregunta y comprueba permisos' : 'Detecta y clasifica la entrada'} active={t < 4600} done={t >= 4600} /></Reveal>
        <Reveal t={t} at={4200}><div className="rounded-2xl bg-white/[0.05] p-4 text-[13px] text-secondary ring-1 ring-white/10">Entrada registrada con su canal, hora y origen. El orquestador decide qué especialistas intervienen.</div></Reveal>
      </div>
      <AnimatePresence>{t >= 800 && t < 4000 && v.channel !== 'call' && (
        <motion.div initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 80 }} className="absolute right-2 top-2 z-20 flex w-[300px] items-start gap-3 rounded-2xl bg-white p-3 text-ink shadow-2xl ring-1 ring-gold/50">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gold text-navy"><Bell className="size-5" /></span>
          <div className="min-w-0"><div className="text-[13px] font-semibold">Nueva entrada · {v.channel}</div><div className="truncate text-[12.5px] text-ink-3">{v.subject}</div></div>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
}

// ── Lectura de documento ──
function Read({ v, t }: { v: Extract<FlowVisual, { kind: 'read' }>; t: number }) {
  const at = (i: number) => 1200 + i * 800;
  return (
    <AppWindow section={v.window} className="h-full">
      <div className="grid h-full lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="relative overflow-hidden bg-[#eef1f6] p-5">
          <ScanLine t={t} from={200} dur={1000} />
          <div className="mx-auto max-w-[640px] rounded-md bg-white p-6 shadow-lg">
            <div className="border-b border-ink/70 pb-2 text-[13px] font-bold text-ink">{v.docTitle}</div>
            <MultiHighlight className="mt-3 block whitespace-pre-wrap text-[14px] leading-[1.75] text-ink-2" text={v.text} marks={v.marks.map((m, i) => ({ needle: m.needle, on: t >= at(i), active: t >= at(i) && t < at(i + 1) }))} />
          </div>
        </div>
        <div className="space-y-2 border-l border-line bg-[#f8fafc] p-4">
          <div className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Datos extraídos</div>
          {v.marks.map((m, i) => (
            <Reveal key={m.label + i} t={t} at={at(i) + 250} x={24} y={0}>
              <div className={cx('rounded-xl px-3 py-2 ring-1', toneRing[m.tone ?? 'info'])}>
                <div className={cx('text-[11.5px]', m.tone && m.tone !== 'info' ? toneText[m.tone] : 'text-ink-3')}>{m.label}</div>
                <div className="text-[14px] font-semibold text-ink">{m.value}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </AppWindow>
  );
}

// ── Conversación telefónica ──
function Call({ v, t }: { v: Extract<FlowVisual, { kind: 'call' }>; t: number }) {
  const at = (i: number) => 600 + i * 1500;
  const fieldsAt = (i: number) => at(v.lines.length) + i * 450;
  return (
    <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <AppWindow section={v.window} className="h-full" right={<span className="font-mono text-[12px] text-err">● En vivo</span>}>
        <div className="flex h-full flex-col p-5">
          <div className="mb-3 flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-full bg-navy text-white"><Phone className="size-5" /></span><div><div className="font-mono text-[14px] text-ink">{v.caller}</div><div className="flex h-5 items-center gap-[3px]">{Array.from({ length: 30 }, (_, i) => <span key={i} className="w-[3px] rounded-full bg-gold" style={{ height: 3 + Math.abs(Math.sin(t / 140 + i)) * 14 }} />)}</div></div></div>
          <div className="space-y-2.5">
            {v.lines.map((l, i) => (
              <Reveal key={i} t={t} at={at(i)} x={l.who === 'cliente' ? -20 : 20} y={0}>
                <div className={cx('max-w-[80%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed', l.who === 'cliente' ? 'rounded-tl-sm bg-canvas text-ink ring-1 ring-line' : 'ml-auto rounded-tr-sm bg-navy text-white')}>
                  <div className={cx('mb-0.5 flex items-center gap-1.5 text-[11px]', l.who === 'cliente' ? 'text-ink-3' : 'text-gold-light')}>{l.who === 'agente' && /C0\d/.test(v.labels?.agente ?? 'C03') && <AgentIcon code={(v.labels?.agente ?? 'C03').match(/C0\d/)![0]} size={16} />}{l.who === 'cliente' ? (v.labels?.cliente ?? 'Llamante') : (v.labels?.agente ?? 'Agente de Voz · C03')}</div>{l.text}
                </div>
              </Reveal>
            ))}
          </div>
          {v.privacy && <div className="mt-auto pt-3 text-[12px] text-ink-3">{v.privacy}</div>}
        </div>
      </AppWindow>
      <div className="space-y-2">
        <div className="text-[11.5px] font-semibold uppercase tracking-wider text-gold-light">Registro estructurado</div>
        {v.fields.map((f, i) => (
          <Reveal key={f.label} t={t} at={fieldsAt(i)} x={24} y={0}><div className="rounded-xl bg-white/[0.06] px-3 py-2 ring-1 ring-white/10"><div className="text-[11.5px] text-muted">{f.label}</div><div className="text-[14px] font-semibold text-white">{f.value}</div></div></Reveal>
        ))}
        {v.handoff && <Reveal t={t} at={fieldsAt(v.fields.length) + 300}><div className="rounded-2xl bg-gold/12 p-3 text-[13px] text-white ring-1 ring-gold/40"><ArrowRight className="mb-1 size-4 text-gold-light" />{v.handoff}</div></Reveal>}
      </div>
    </div>
  );
}

// ── Cadena de especialistas ──
function Pipeline({ v, t }: { v: Extract<FlowVisual, { kind: 'pipeline' }>; t: number }) {
  const at = (i: number) => 500 + i * 1100;
  const active = v.stages.findIndex((_, i) => t < at(i + 1));
  return (
    <div className="flex h-full flex-col justify-center">
      <ol className="relative mx-auto w-full max-w-[860px] space-y-2.5">
        <span className="absolute bottom-6 left-[27px] top-6 w-[2px] bg-white/10" aria-hidden />
        <motion.span className="absolute left-[27px] top-6 w-[2px] origin-top bg-gold" aria-hidden
          style={{ height: `calc((100% - 48px) * ${Math.min(1, prog(t, 500, (v.stages.length - 1) * 1100))})` }} />
        {v.stages.map((s, i) => {
          const on = t >= at(i);
          const cur = i === active;
          return (
            <li key={s.name} className="relative grid grid-cols-[56px_200px_minmax(0,1fr)] items-center gap-3">
              <span className={cx('relative z-10 flex size-14 items-center justify-center rounded-2xl bg-navy ring-2 transition-[box-shadow,opacity,filter] duration-500', on ? (cur ? 'ring-gold shadow-[0_0_30px_-6px_rgb(230_168_23/0.8)]' : 'ring-[#16a34a]/70') : 'opacity-50 ring-white/10 grayscale')}>
                <AgentIcon code={s.agent} size={36} glow={cur} />
                {on && !cur && <CheckCircle2 className="absolute -right-1.5 -top-1.5 size-5 rounded-full bg-navy text-[#4ade80]" />}
              </span>
              <div className={cx('rounded-xl px-3 py-2 ring-1 transition-colors duration-500', on ? 'bg-white/[0.07] ring-white/15' : 'bg-white/[0.02] ring-white/5')}>
                <div className="font-mono text-[11px] text-gold-light">{s.agent} · {String(i + 1).padStart(2, '0')}</div>
                <div className={cx('text-[15px] font-semibold', on ? 'text-white' : 'text-muted')}>{s.name}</div>
              </div>
              <Reveal t={t} at={at(i) + 350} x={-16} y={0}>
                <div className="flex items-center gap-2 text-[14px] text-white"><ArrowRight className="size-4 shrink-0 text-gold" />{s.output}</div>
              </Reveal>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── Tabla ──
function Table({ v, t }: { v: Extract<FlowVisual, { kind: 'table' }>; t: number }) {
  const at = (i: number) => 500 + i * 420;
  const end = at(v.rows.length);
  return (
    <AppWindow section={v.window} className="max-h-full self-start">
      <div className="flex flex-col p-5">
        <div className="overflow-hidden rounded-xl ring-1 ring-line">
          <table className="w-full text-[13.5px]">
            <thead className="bg-canvas text-[12px] text-ink-3"><tr>{v.columns.map((c, i) => <th key={c} className={cx('px-3 py-2 font-medium', i ? 'text-right' : 'text-left')}>{c}</th>)}</tr></thead>
            <tbody>
              {v.rows.map((r, i) => t >= at(i) && (
                <motion.tr key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }} className={cx('border-t border-line', v.tones?.[i] === 'warn' && 'bg-warn-bg/70', v.tones?.[i] === 'err' && 'bg-err-bg/70', v.tones?.[i] === 'ok' && 'bg-ok-bg/50', v.tones?.[i] === 'gold' && 'bg-gold/10')}>
                  {r.map((c, j) => <td key={j} className={cx('px-3 py-2', j ? 'text-right tabular' : 'font-medium text-ink', v.tones?.[i] && j === r.length - 1 && toneText[v.tones[i]!])}>{c}</td>)}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {v.totals && <Reveal t={t} at={end + 200} className="mt-3"><div className="flex flex-wrap justify-end gap-3">{v.totals.map((x) => <div key={x.label} className="rounded-xl bg-navy px-4 py-2 text-white"><div className="text-[11.5px] text-muted">{x.label}</div><div className="text-[18px] font-semibold tabular text-gold-light">{x.value}</div></div>)}</div></Reveal>}
        {v.note && <Reveal t={t} at={end + 600} className="pt-3"><p className="text-[12.5px] text-ink-3">{v.note}</p></Reveal>}
      </div>
    </AppWindow>
  );
}

// ── Barras ──
function Bars({ v, t }: { v: Extract<FlowVisual, { kind: 'bars' }>; t: number }) {
  const max = Math.max(...v.bars.flatMap((b) => [b.value, b.compare ?? 0])) || 1;
  const at = (i: number) => 400 + i * 450;
  return (
    <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="self-start rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="text-[11.5px] font-semibold uppercase tracking-wider text-gold-light">{v.title}</div>
          {v.compareLabel && <div className="flex gap-3 text-[12px] text-secondary"><span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-white/30" />{v.compareLabel}</span><span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-gold" />{v.valueLabel ?? 'Valor'}</span></div>}</div>
        <div className="space-y-3">
          {v.bars.map((b, i) => (
            <Reveal key={b.label} t={t} at={at(i)}>
              <div className="flex items-baseline justify-between text-[13px]"><span className="text-white">{b.label}</span><span className="font-semibold tabular text-gold-light">{fmt(v.format, b.value)}{b.compare != null && <span className="ml-2 font-normal text-muted">vs {fmt(v.format, b.compare)}</span>}</span></div>
              {b.compare != null && <div className="mt-1 h-2 rounded-r-[4px] bg-white/25" style={{ width: `${(b.compare / max) * 100}%` }} />}
              <motion.div className="mt-1 h-2.5 rounded-r-[4px] bg-gold" initial={{ width: 0 }} animate={{ width: `${(b.value / max) * 100}%` }} transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }} />
            </Reveal>
          ))}
        </div>
      </div>
      <div className="flex flex-col justify-center gap-3">
        {v.headline && <Reveal t={t} at={at(v.bars.length) + 200}><div className="rounded-2xl bg-gold/12 p-5 ring-1 ring-gold/40"><div className="text-[12px] text-gold-light">{v.headline.label}</div><div className="text-[36px] font-semibold leading-none tracking-tight text-white"><CountUp t={t} from={at(v.bars.length) + 200} value={v.headline.value} format={(x) => fmt(v.headline!.format, x)} /></div>{v.headline.sub && <div className="mt-1 text-[12.5px] text-secondary">{v.headline.sub}</div>}</div></Reveal>}
        {v.note && <Reveal t={t} at={at(v.bars.length) + 900}><p className="rounded-xl bg-white/[0.04] px-3 py-2 text-[12.5px] text-secondary ring-1 ring-white/10">{v.note}</p></Reveal>}
      </div>
    </div>
  );
}

// ── Planificación ──
function Plan({ v, t }: { v: Extract<FlowVisual, { kind: 'plan' }>; t: number }) {
  const switched = Boolean(v.after && v.switchAt != null && t >= v.switchAt);
  const tasks = switched ? v.after! : v.before;
  return (
    <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <AppWindow section={v.title} className="max-h-full self-start">
        <div className="space-y-3 p-5">
          <div className="ml-[150px] flex justify-between text-[11px] text-ink-3">{(v.ticks ?? Array.from({ length: Math.ceil(v.horizon) + 1 }, (_, i) => `${v.unit} ${i}`)).map((x, i) => <span key={i}>{x}</span>)}</div>
          {v.lanes.map((lane, li) => (
            <Reveal key={lane} t={t} at={300 + li * 250}>
              <div className="flex items-center gap-3">
                <div className="w-[138px] shrink-0 text-[13px] font-medium text-ink">{lane}</div>
                <div className="relative h-9 flex-1 rounded-md bg-ink/[0.04]">
                  {tasks.filter((x) => x.lane === lane).map((x) => (
                    <motion.div key={x.label} layout transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }} title={x.label}
                      className={cx('absolute top-1 flex h-7 items-center overflow-hidden rounded-[5px] px-1.5 text-[11px] font-medium text-white', x.urgent ? 'bg-err' : x.late ? 'bg-[#b45309]' : 'bg-[#2a78d6]')}
                      style={{ left: `${(x.start / v.horizon) * 100}%`, width: `${Math.max(2, ((x.end - x.start) / v.horizon) * 100)}%` }}>
                      <span className="truncate">{x.label}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </Reveal>
          ))}
          <div className="flex gap-4 pt-2 text-[12px] text-ink-3"><span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[#2a78d6]" />A tiempo</span><span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[#b45309]" />Con retraso</span>{v.after && <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-err" />Urgente</span>}</div>
        </div>
      </AppWindow>
      <div className="space-y-3">
        {v.note && <Reveal t={t} at={1200}><div className="rounded-2xl bg-white/[0.05] p-4 text-[13.5px] text-secondary ring-1 ring-white/10">{v.note}</div></Reveal>}
        <AnimatePresence>{switched && v.afterNote && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-[#dc2626]/12 p-4 text-[13.5px] text-white ring-1 ring-[#f87171]/40"><AlertTriangle className="mb-1 size-5 text-[#fca5a5]" />{v.afterNote}</motion.div>}</AnimatePresence>
      </div>
    </div>
  );
}

// ── Rutas y carga ──
function Route({ v, t }: { v: Extract<FlowVisual, { kind: 'route' }>; t: number }) {
  const colors = ['#e6a817', '#60a5fa', '#34d399'];
  const total = v.routes.reduce((a, r) => a + r.km, 0);
  return (
    <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="relative rounded-2xl bg-white/[0.03] ring-1 ring-white/10">
        <svg viewBox="0 0 100 70" className="h-full w-full" aria-label={v.title}>
          {v.routes.map((r, ri) => {
            const pts = [v.depot, ...r.order.map((i) => v.stops[i]), v.depot];
            const d = pts.map((p, k) => `${k ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
            const p = prog(t, 1600 + ri * 1400, 1600);
            return <path key={r.vehicle} d={d} fill="none" stroke={colors[ri % 3]} strokeWidth={0.6} strokeLinejoin="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - p} />;
          })}
          {v.stops.map((s, i) => (
            <g key={s.label} opacity={t >= 300 + i * 120 ? 1 : 0} style={{ transition: 'opacity .4s' }}>
              <circle cx={s.x} cy={s.y} r={1.3} fill="#fff" stroke="#0a0f1e" strokeWidth={0.3} />
              <text x={s.x + 1.8} y={s.y + 0.8} fontSize={2.2} fill="#cbd5e1">{s.label}</text>
            </g>
          ))}
          <rect x={v.depot.x - 1.8} y={v.depot.y - 1.8} width={3.6} height={3.6} rx={0.6} fill="#e6a817" />
          <text x={v.depot.x + 2.4} y={v.depot.y + 0.8} fontSize={2.4} fontWeight={700} fill="#fff">{v.depot.label}</text>
        </svg>
      </div>
      <div className="space-y-2.5">
        <div className="text-[11.5px] font-semibold uppercase tracking-wider text-gold-light">{v.title}</div>
        {v.routes.map((r, ri) => (
          <Reveal key={r.vehicle} t={t} at={1600 + ri * 1400}>
            <div className="rounded-xl bg-white/[0.06] px-3 py-2.5 ring-1 ring-white/10">
              <div className="flex items-center gap-2 text-[13.5px] font-semibold text-white"><Truck className="size-4" style={{ color: colors[ri % 3] }} />{r.vehicle} · {num(r.km, 0)} km</div>
              <div className="text-[12px] text-secondary">{r.order.map((i) => v.stops[i].label).join(' → ')}</div>
              <div className="mt-1.5 h-1.5 rounded-full bg-white/10"><div className="h-full rounded-full" style={{ width: `${(r.kg / r.capacity) * 100}%`, background: colors[ri % 3] }} /></div>
              <div className="mt-0.5 text-[11px] text-muted">Carga {num(r.kg, 0)} / {num(r.capacity, 0)} kg</div>
            </div>
          </Reveal>
        ))}
        <Reveal t={t} at={1600 + v.routes.length * 1400 + 400}>
          <div className="rounded-2xl bg-gold/12 p-4 ring-1 ring-gold/40"><div className="text-[12px] text-gold-light">Kilómetros totales</div><div className="text-[30px] font-semibold text-white">{num(total, 0)} km</div><div className="text-[12.5px] text-secondary">frente a {num(v.baselineKm, 0)} km con el reparto manual (ilustrativo, heurística, no óptimo garantizado)</div></div>
        </Reveal>
        {v.packing && (
          <Reveal t={t} at={1600 + v.routes.length * 1400 + 1000}>
            <div className="rounded-xl bg-white/[0.04] p-3 ring-1 ring-white/10">
              <div className="mb-1.5 text-[12px] text-secondary">Carga de {v.packing.truck} (vista en planta)</div>
              <div className="relative w-full rounded bg-white/10" style={{ aspectRatio: `${v.packing.lengthCm}/${v.packing.widthCm}` }}>
                {(() => { let x = 0; let y = 0; let rowH = 0; return v.packing.boxes.map((b, i) => { if (x + b.w > v.packing!.lengthCm) { x = 0; y += rowH; rowH = 0; } const el = <div key={i} title={b.label} className="absolute rounded-[2px] bg-gold/70 ring-1 ring-navy" style={{ left: `${(x / v.packing!.lengthCm) * 100}%`, top: `${(y / v.packing!.widthCm) * 100}%`, width: `${(b.w / v.packing!.lengthCm) * 100}%`, height: `${(b.h / v.packing!.widthCm) * 100}%` }} />; x += b.w; rowH = Math.max(rowH, b.h); return el; }); })()}
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </div>
  );
}

// ── Audio ──
const clock = (s: number) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const ss = s % 60; return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(ss).padStart(2, '0')}`; };
function Audio({ v, t }: { v: Extract<FlowVisual, { kind: 'audio' }>; t: number }) {
  const cursor = Math.min(1, prog(t, 400, 5200));
  const n = v.levels.length;
  return (
    <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <AppWindow section={v.window} className="h-full">
        <div className="p-5">
          <div className="relative flex h-48 items-center gap-[2px] rounded-xl bg-navy px-3">
            {v.levels.map((l, i) => {
              const inc = v.incidents.find((x) => i >= x.at && i < x.at + x.len);
              const h = Math.max(2, ((l + 60) / 60) * 100);
              return <span key={i} className={cx('flex-1 rounded-sm transition-colors', i / n <= cursor ? (inc ? (inc.tone === 'err' ? 'bg-[#f87171]' : 'bg-[#fbbf24]') : 'bg-[#60a5fa]') : 'bg-white/15')} style={{ height: `${h}%` }} />;
            })}
            <span className="absolute inset-y-2 w-[2px] bg-gold shadow-[0_0_10px_#e6a817]" style={{ left: `calc(12px + (100% - 24px) * ${cursor})` }} />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[11px] text-ink-3"><span>{clock(0)}</span><span>{clock(n * v.segmentS)}</span></div>
          <div className="mt-4 space-y-2">
            {v.incidents.map((x) => (
              <Reveal key={x.label} t={t} at={400 + (x.at / n) * 5200}>
                <div className={cx('flex items-center justify-between rounded-xl px-3 py-2 text-[13.5px] ring-1', x.tone === 'err' ? 'bg-err-bg text-err ring-err/20' : 'bg-warn-bg text-warn ring-warn/25')}>
                  <span className="flex items-center gap-2"><AlertTriangle className="size-4" />{x.label}</span>
                  <span className="font-mono text-[12px]">{clock(x.at * v.segmentS)}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </AppWindow>
      <div className="space-y-3">
        <Reveal t={t} at={300}><AgentPulse code="C03" label="Escucha y segmenta el audio" active={cursor < 1} done={cursor >= 1} /></Reveal>
        <Reveal t={t} at={5800}><div className="rounded-2xl bg-white/[0.05] p-4 text-[13.5px] text-secondary ring-1 ring-white/10">{v.incidents.length} incidencias en {Math.round((n * v.segmentS) / 60)} minutos. El operador revisa solo esos fragmentos, no la grabación completa.</div></Reveal>
      </div>
    </div>
  );
}

// ── Decisión ──
function Decision({ v, t }: { v: Extract<FlowVisual, { kind: 'decision' }>; t: number }) {
  const stampAt = 600 + v.checks.length * 500 + 700;
  return (
    <div className="flex h-full items-center justify-center">
      <div className="relative w-full max-w-[720px] rounded-3xl bg-white p-7 text-ink shadow-2xl">
        <div className="text-[12px] font-semibold uppercase tracking-wider text-ink-3">Revisión humana</div>
        <h2 className="mt-1 text-[22px] font-semibold">{v.title}</h2>
        <ul className="mt-4 space-y-2">{v.checks.map((c, i) => <Reveal key={c.text} t={t} at={600 + i * 500}><li className={cx('flex gap-2 rounded-xl px-3 py-2 text-[14px]', c.level === 'ok' ? 'bg-ok-bg/60 text-ink-2' : c.level === 'warning' ? 'bg-warn-bg text-[#7c3d06]' : 'bg-err-bg text-err')}>{c.level === 'ok' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}{c.text}</li></Reveal>)}</ul>
        <AnimatePresence>{t >= stampAt && (
          <motion.div initial={{ opacity: 0, scale: 2.2, rotate: -25 }} animate={{ opacity: 1, scale: 1, rotate: -8 }} transition={{ type: 'spring', duration: 0.6, bounce: 0.35 }} className="absolute -right-4 -top-6 flex items-center gap-2 rounded-2xl border-4 border-ok bg-white px-4 py-2 text-ok shadow-xl">
            <Stamp className="size-6" /><div><div className="text-[20px] font-black uppercase">{v.stamp}</div><div className="font-mono text-[11px]">{v.stampSub}</div></div>
          </motion.div>
        )}</AnimatePresence>
        <Reveal t={t} at={stampAt + 600}><p className="mt-4 text-[13px] text-ink-3">Decide: {v.by}. La acción queda registrada con sus fuentes y su versión.</p></Reveal>
      </div>
    </div>
  );
}

// ── Registro de salida ──
function Output({ v, t }: { v: Extract<FlowVisual, { kind: 'output' }>; t: number }) {
  return (
    <div className="grid h-full items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <AppWindow section={v.window} className="max-h-full" right={v.logo && <BrandLogo src={v.logo} name="sistema" size={22} />}>
        <div className="p-5">
          <Reveal t={t} at={400}><div className="flex items-center justify-between gap-3"><h2 className="text-[22px] font-semibold text-ink">{v.recordTitle}</h2>{v.badge && <span className="rounded-full bg-ok-bg px-2.5 py-0.5 text-[12px] font-medium text-ok">{v.badge}</span>}</div></Reveal>
          <div className="mt-3 grid gap-x-8 text-[13.5px] 2xl:grid-cols-2">
            {v.fields.map(([k, val], i) => <Reveal key={k} t={t} at={800 + i * 300}><div className="flex justify-between gap-3 border-b border-line py-1.5"><span className="text-ink-3">{k}</span><span className="text-right font-medium text-ink">{val}</span></div></Reveal>)}
          </div>
          {v.lines && <Reveal t={t} at={800 + v.fields.length * 300 + 200}><table className="mt-4 w-full text-[13px]"><thead><tr className="border-b border-line text-[12px] text-ink-3">{v.lines.columns.map((c, i) => <th key={c} className={cx('py-1.5 font-medium', i ? 'text-right' : 'text-left')}>{c}</th>)}</tr></thead><tbody>{v.lines.rows.map((r, i) => <tr key={i} className="border-b border-line">{r.map((c, j) => <td key={j} className={cx('py-1.5', j ? 'text-right tabular' : 'text-ink')}>{c}</td>)}</tr>)}</tbody></table></Reveal>}
        </div>
      </AppWindow>
      <div className="flex flex-col gap-3">
        {v.side && <Reveal t={t} at={1800}><div className="rounded-2xl bg-white p-4 text-ink shadow-xl"><div className="mb-2 text-[12.5px] font-semibold text-ink-3">{v.side.title}</div>{t >= 2100 && <Typewriter t={t} from={2100} text={v.side.text} cps={120} className="block text-[13.5px] leading-relaxed text-ink-2" />}</div></Reveal>}
        {v.final && <Reveal t={t} at={5600}><div className="rounded-2xl bg-[#16a34a]/12 p-4 text-[13.5px] text-[#86efac] ring-1 ring-[#16a34a]/40"><CheckCircle2 className="mb-1 size-5" />{v.final}</div></Reveal>}
      </div>
    </div>
  );
}

export function FlowVisualView({ v, t, agents }: { v: FlowVisual; t: number; agents?: string[] }) {
  switch (v.kind) {
    case 'inbound': return <Inbound v={v} t={t} agent={agents?.[0]} />;
    case 'read': return <Read v={v} t={t} />;
    case 'call': return <Call v={v} t={t} />;
    case 'cloud': return <BrainCloud t={t} docs={v.docs} selected={v.selected} rejected={v.rejected} query={v.query} centerLabel={v.center} centerSub={v.centerSub} scanAt={1000} matchAt={3400} flyAt={4400} selectedTitle={v.selectedTitle} rejectedTitle="Descartados" footer={v.footer && t >= 5800 ? <div className="rounded-2xl bg-white/[0.04] p-3 text-[12.5px] text-secondary ring-1 ring-white/10">{v.footer}</div> : null} />;
    case 'pipeline': return <Pipeline v={v} t={t} />;
    case 'table': return <Table v={v} t={t} />;
    case 'bars': return <Bars v={v} t={t} />;
    case 'plan': return <Plan v={v} t={t} />;
    case 'route': return <Route v={v} t={t} />;
    case 'audio': return <Audio v={v} t={t} />;
    case 'decision': return <Decision v={v} t={t} />;
    case 'output': return <Output v={v} t={t} />;
  }
}

/** Duración de una escena según lo que tiene que mostrar (ms a 1×). */
export function autoDuration(v: FlowVisual): number {
  switch (v.kind) {
    case 'inbound': return 6500;
    case 'read': return 1200 + v.marks.length * 800 + 2400;
    case 'call': return 600 + v.lines.length * 1500 + v.fields.length * 450 + (v.handoff ? 800 : 0) + 2200;
    case 'cloud': return 8200;
    case 'pipeline': return 500 + v.stages.length * 1100 + 2600;
    case 'table': return 500 + v.rows.length * 420 + 2800;
    case 'bars': return 400 + v.bars.length * 450 + 3200;
    case 'plan': return (v.switchAt ?? 1500) + 4200;
    case 'route': return 1600 + v.routes.length * 1400 + (v.packing ? 3600 : 2800);
    case 'audio': return 8200;
    case 'decision': return 600 + v.checks.length * 500 + 700 + 2600;
    case 'output': return Math.max(v.final ? 7600 : 6500, v.side ? 2100 + (v.side.text.length / 120) * 1000 + 2000 : 0);
  }
}

export function buildFlowScenario(flow: Flow): DemoScenario {
  return {
    id: flow.id, title: flow.title, subtitle: flow.subtitle, reference: flow.reference,
    prepare: () => {},
    finale: [{ label: 'Ver la ficha del caso de uso', to: () => `/casos/${flow.id}` }, ...(flow.finale ?? []).map((f) => ({ label: f.label, to: () => f.to }))],
    scenes: flow.steps.map((s) => ({
      id: s.id, section: s.section, where: s.where ?? { label: 'Casos de uso', to: `/casos/${flow.id}` }, title: s.title, narration: s.narration, agents: s.agents, duration: s.duration ?? autoDuration(s.visual),
      Component: ({ t }: { t: number }) => <FlowVisualView v={s.visual} t={t} agents={s.agents} />,
    })),
  };
}
export type { Tone };
