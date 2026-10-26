// Biblioteca de casos de uso: filtros por departamento, sector, proceso, agente y tecnología.
import { useMemo, type ReactNode } from 'react';
import { AgentChip, AgentIcon } from '@/components/agents/AgentIcon';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Boxes, Briefcase, Calculator, ExternalLink, Headphones, Info, Landmark, Mail, MessageSquare, Mic, PhoneCall, Play, Radio, Search, ShieldCheck, Truck, Wallet, X } from 'lucide-react';
import { AGENTS } from '@/fixtures/agents';
import { BrandLogo } from '@/components/layout/Brand';
import { Button, Input, Select } from '@/components/ui';
import { cx } from '@/lib/format';
import { DEPARTMENTS, PROCESSES, SECTORS, TECHS, USE_CASES, deptById, type Channel, type DeptId, type UseCase } from '@/features/demo/useCases';
import { FLOWS } from '@/features/demo/flows';
import { SCENARIOS } from '@/features/demo/scenarios';

const DEPT_ICON: Record<DeptId, ReactNode> = { ventas: <Briefcase />, ofertas: <Calculator />, operaciones: <Truck />, atencion: <Headphones />, calidad: <ShieldCheck />, finanzas: <Wallet /> };
const CHANNEL: Record<Channel, { icon: ReactNode; label: string }> = {
  email: { icon: <Mail />, label: 'Correo' }, whatsapp: { icon: <MessageSquare />, label: 'WhatsApp' }, voz: { icon: <Mic />, label: 'Voz' }, portal: { icon: <Landmark />, label: 'Portal' },
  erp: { icon: <Boxes />, label: 'Evento ERP' }, llamada: { icon: <PhoneCall />, label: 'Llamada' }, chat: { icon: <MessageSquare />, label: 'Pregunta' }, sistema: { icon: <Radio />, label: 'Sistema' },
};
const agentName = (code: string) => AGENTS.find((a) => a.code === code)?.name ?? code;
const FILTER_KEYS = ['q', 'dept', 'sector', 'proc', 'agent', 'tech'] as const;

export default function UseCasesPage() {
  const { caseId } = useParams();
  const uc = caseId ? USE_CASES.find((u) => u.id === caseId) : undefined;
  return uc ? <CaseDetail uc={uc} /> : <Library />;
}

function Library() {
  const [params, setParams] = useSearchParams();
  const f = Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? ''])) as Record<(typeof FILTER_KEYS)[number], string>;
  const set = (k: (typeof FILTER_KEYS)[number], v: string) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (v) next.set(k, v); else next.delete(k);
      return next;
    }, { replace: true });
  };
  const active = FILTER_KEYS.filter((k) => f[k]).length;
  const results = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return USE_CASES.filter((u) =>
      (!f.dept || u.departments.includes(f.dept as DeptId)) && (!f.sector || u.sector === f.sector) && (!f.proc || u.processes.includes(f.proc)) &&
      (!f.agent || u.agents.includes(f.agent)) && (!f.tech || u.tech.includes(f.tech as UseCase['tech'][number])) &&
      (!q || [u.title, u.summary, u.client?.name ?? '', u.sector, ...u.processes, ...u.input, ...u.output].join(' ').toLowerCase().includes(q)));
  }, [f.q, f.dept, f.sector, f.proc, f.agent, f.tech]);
  const dept = f.dept ? deptById(f.dept as DeptId) : undefined;

  return (
    <div className="mx-auto max-w-[1680px] px-4 py-5 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-[#8a6100]">Biblioteca · presentación IA Agentiva v.02</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight md:text-[34px]">Casos de uso</h1>
          <p className="mt-1 max-w-3xl text-[14.5px] text-ink-3">Cada caso tiene un recorrido guiado y animado. Filtra por departamento, sector, proceso, agente o tecnología para encontrar el que encaja con el cliente.</p>
        </div>
        <div className="flex gap-2">
          {[[USE_CASES.length, 'recorridos'], [DEPARTMENTS.length, 'departamentos'], [new Set(USE_CASES.map((u) => u.sector)).size, 'sectores'], [8, 'agentes']].map(([n, l]) => (
            <div key={l} className="rounded-xl bg-white px-3.5 py-2 text-center ring-1 ring-line"><div className="text-[20px] font-semibold tabular">{n}</div><div className="text-[11.5px] text-ink-3">{l}</div></div>
          ))}
        </div>
      </div>

      {/* Departamentos */}
      <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-3 min-[1700px]:grid-cols-6" role="group" aria-label="Departamento">
        {DEPARTMENTS.map((d) => {
          const on = f.dept === d.id;
          const n = USE_CASES.filter((u) => u.departments.includes(d.id)).length;
          return (
            <button key={d.id} onClick={() => set('dept', on ? '' : d.id)} aria-pressed={on} data-dept={d.id}
              className={cx('group flex items-center gap-3 rounded-2xl p-3 text-left ring-1 transition-[background-color,box-shadow]', on ? 'bg-navy text-white ring-gold/60' : 'bg-white ring-line hover:ring-gold/50')}>
              <span className={cx('flex size-10 shrink-0 items-center justify-center rounded-xl [&>svg]:size-5', on ? 'bg-gold text-navy' : 'bg-gold/12 text-[#8a6100]')}>{DEPT_ICON[d.id]}</span>
              <span className="min-w-0"><span className="block text-[14px] font-semibold leading-tight">{d.name}</span><span className={cx('text-[12px]', on ? 'text-secondary' : 'text-ink-3')}>{n} casos</span></span>
            </button>
          );
        })}
      </div>
      <AnimatePresence mode="wait">{dept && <DepartmentPanel key={dept.id} d={dept} />}</AnimatePresence>

      {/* Filtros */}
      <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl bg-white p-2.5 ring-1 ring-line">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" />
          <Input aria-label="Buscar casos" placeholder="Buscar: albarán, pliego, voz, cámara…" value={f.q} onChange={(e) => set('q', e.target.value)} className="pl-9" />
        </div>
        <FilterSelect label="Sector" value={f.sector} onChange={(v) => set('sector', v)} options={SECTORS.filter((s) => USE_CASES.some((u) => u.sector === s))} />
        <FilterSelect label="Proceso" value={f.proc} onChange={(v) => set('proc', v)} options={PROCESSES} />
        <FilterSelect label="Agente" value={f.agent} onChange={(v) => set('agent', v)} options={AGENTS.filter((a) => a.kind === 'agent').map((a) => a.code)} format={(c) => `${c} · ${agentName(c)}`} />
        <FilterSelect label="Tecnología" value={f.tech} onChange={(v) => set('tech', v)} options={TECHS} />
        {active > 0 && <Button variant="ghost" size="sm" icon={<X />} onClick={() => setParams(new URLSearchParams(), { replace: true })}>Limpiar ({active})</Button>}
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <h2 className="text-[16px] font-semibold" data-testid="uc-count">{results.length} {results.length === 1 ? 'caso' : 'casos'}{dept ? ` en ${dept.name}` : ''}</h2>
        <Link to="/demo" className="text-[13px] font-medium text-[#8a6100] hover:underline">Ver todas las demos guiadas</Link>
      </div>
      {results.length === 0 ? (
        <div className="mt-6 rounded-2xl bg-white p-10 text-center text-[14px] text-ink-3 ring-1 ring-line">Ningún caso cumple estos filtros.</div>
      ) : (
        <motion.div layout className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          <AnimatePresence>{results.map((u) => <CaseCard key={u.id} u={u} />)}</AnimatePresence>
        </motion.div>
      )}
      <p className="mt-6 flex items-start gap-2 text-[12.5px] text-ink-3"><Info className="mt-0.5 size-4 shrink-0" />Los recorridos usan datos de ejemplo y empresas ficticias. Los logos identifican los casos de referencia de la presentación; las cifras de impacto que aparecen en las fichas son referencia comercial del documento, no métricas medidas en esta demo.</p>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options, format }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[]; format?: (v: string) => string }) {
  return (
    <div className="w-[calc(50%-4px)] sm:w-[190px]">
      <Select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={cx(value && 'ring-2 ring-gold/50')}>
        <option value="">{label}: todos</option>
        {options.map((o) => <option key={o} value={o}>{format ? format(o) : o}</option>)}
      </Select>
    </div>
  );
}

function DepartmentPanel({ d }: { d: (typeof DEPARTMENTS)[number] }) {
  const col = (i: number) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.12 * i, duration: 0.4 } });
  return (
    <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden" data-testid="dept-panel">
      <div className="tech-grid mt-3 rounded-[20px] p-5 text-white ring-1 ring-navy-border md:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div><p className="text-[12px] text-gold-light">{d.area} · cómo ayudamos</p><h2 className="text-[22px] font-semibold">{d.name}</h2><p className="text-[14px] text-secondary">{d.tagline}</p></div>
          <span className="font-mono text-[11.5px] text-muted">Presentación · diapositiva {d.slide}</span>
        </div>
        <div className="mt-5 grid items-stretch gap-3 lg:grid-cols-[1fr_auto_1.1fr_auto_1fr]">
          <motion.div {...col(0)} className="space-y-2">
            <div className="text-[11.5px] font-semibold uppercase tracking-wider text-[#fca5a5]">01 · El problema hoy</div>
            {d.problems.map((p) => <div key={p.title} className="rounded-xl bg-white/[0.05] px-3 py-2 ring-1 ring-white/10"><div className="text-[14px] font-semibold">{p.title}</div><div className="text-[12.5px] text-secondary">{p.sub}</div></div>)}
          </motion.div>
          <Arrow i={1} />
          <motion.div {...col(2)} className="flex flex-col">
            <div className="text-[11.5px] font-semibold uppercase tracking-wider text-gold-light">02 · Orquestador MTi + agentes</div>
            <div className="mt-2 flex flex-1 flex-col justify-center rounded-2xl bg-gold/10 p-4 ring-1 ring-gold/40">
              <div className="text-center"><div className="text-[16px] font-semibold">Orquestador MTi</div><div className="text-[12px] text-secondary">Detecta · encamina · actúa y explica</div></div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {d.agents.map((a, i) => (
                  <motion.div key={a} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.35 + i * 0.1 }} className="flex items-center gap-2 rounded-xl bg-navy/60 px-2.5 py-2 ring-1 ring-white/10">
                    <AgentIcon code={a} size={24} glow />
                    <span className="font-mono text-[11.5px] text-gold-light">{a}</span><span className="text-[13px] leading-tight">{agentName(a)}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
          <Arrow i={3} />
          <motion.div {...col(4)} className="space-y-2">
            <div className="text-[11.5px] font-semibold uppercase tracking-wider text-[#86efac]">03 · Outputs</div>
            {d.outputs.map((o) => <div key={o.title} className="rounded-xl bg-[#16a34a]/10 px-3 py-2 ring-1 ring-[#16a34a]/30"><div className="text-[14px] font-semibold">{o.title}</div><div className="text-[12.5px] text-secondary">{o.sub}</div></div>)}
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}

function Arrow({ i }: { i: number }) {
  return (
    <div className="hidden items-center lg:flex" aria-hidden>
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.12 * i + 0.1, duration: 0.4 }} className="relative h-[2px] w-10 origin-left bg-gradient-to-r from-white/10 to-gold">
        <motion.span className="absolute -top-[3px] size-2 rounded-full bg-gold shadow-[0_0_10px_#e6a817]" animate={{ x: [0, 32, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }} />
      </motion.div>
    </div>
  );
}

function Cover({ u, tall }: { u: UseCase; tall?: boolean }) {
  const ch = CHANNEL[u.channel];
  return (
    <div className={cx('relative overflow-hidden', tall ? 'h-56 md:h-72' : 'h-32')}>
      {u.client?.photo ? <img src={u.client.photo} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" /> : <div className="tech-grid absolute inset-0" />}
      <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/40 to-navy/10" />
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-navy/70 px-2.5 py-1 text-[11.5px] text-white ring-1 ring-white/15 backdrop-blur [&>svg]:size-3.5">{ch.icon}{ch.label}</div>
      {u.client?.logo && <img src={u.client.logo} alt={u.client.name} className="absolute right-3 top-3 h-8 max-w-[110px] rounded-md bg-white object-contain p-1 shadow" />}
      <div className="absolute bottom-2.5 left-3 right-3 flex flex-wrap gap-1.5">
        {u.departments.map((d) => <span key={d} className="rounded-md bg-gold/90 px-1.5 py-0.5 text-[11px] font-semibold text-navy">{deptById(d).name}</span>)}
      </div>
    </div>
  );
}

function CaseCard({ u }: { u: UseCase }) {
  const nav = useNavigate();
  return (
    <motion.article layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.25 }} data-case={u.id}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-card)] ring-1 ring-line transition-shadow hover:ring-gold/50">
      <Link to={`/casos/${u.id}`} className="block" aria-label={`Ficha: ${u.title}`}><Cover u={u} /></Link>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2 text-[11.5px] text-ink-3"><span>{u.sector}</span>{u.client && <span className="font-mono">{u.client.name}</span>}</div>
        <h3 className="mt-1 text-[16px] font-semibold leading-snug"><Link to={`/casos/${u.id}`} className="hover:underline">{u.title}</Link></h3>
        <p className="mt-1 line-clamp-3 text-[13px] text-ink-3">{u.summary}</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {u.agents.map((a) => <span key={a} title={agentName(a)} className="inline-flex items-center gap-1 rounded-md bg-navy py-0.5 pl-0.5 pr-1.5 font-mono text-[11px] text-gold-light"><AgentIcon code={a} size={16} />{a}</span>)}
          {u.tech.slice(0, 2).map((t) => <span key={t} className="rounded-md bg-ink/[0.05] px-1.5 py-0.5 text-[11px] text-ink-2">{t}</span>)}
        </div>
        <div className="mt-auto flex items-center gap-2 pt-4">
          <Button size="sm" variant="primary" icon={<Play />} onClick={() => nav(`/demo/${u.id}`)}>Ver recorrido</Button>
          <Link to={`/casos/${u.id}`} className="ml-auto flex items-center gap-1 text-[13px] font-medium text-[#8a6100]">Ficha <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></Link>
        </div>
      </div>
    </motion.article>
  );
}

function CaseDetail({ uc }: { uc: UseCase }) {
  const nav = useNavigate();
  const flow = FLOWS.find((f) => f.id === uc.id);
  const entry = SCENARIOS.find((s) => s.id === uc.id);
  const steps = flow ? flow.steps.map((s) => ({ title: s.title, text: s.narration, agents: s.agents })) : (entry?.steps ?? []).map((s) => ({ title: s, text: '', agents: [] as string[] }));
  const related = USE_CASES.filter((u) => u.id !== uc.id && u.departments.some((d) => uc.departments.includes(d))).slice(0, 4);
  const col = (i: number) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.1 + i * 0.15, duration: 0.45 } });

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-5 md:px-6">
      <Link to="/casos" className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink"><ArrowLeft className="size-4" />Casos de uso</Link>
      <div className="mt-3 overflow-hidden rounded-[20px] ring-1 ring-line">
        <div className="relative">
          <Cover u={uc} tall />
          <div className="absolute bottom-10 left-5 right-5 md:left-8">
            <p className="text-[12.5px] text-gold-light">{uc.sector}{uc.client ? ` · caso de referencia ${uc.client.name}` : ''}</p>
            <h1 className="mt-1 max-w-3xl text-[26px] font-semibold leading-tight tracking-tight text-white md:text-[32px]">{uc.title}</h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 bg-white p-4 md:px-8">
          <p className="min-w-[260px] flex-1 text-[14.5px] text-ink-2">{uc.summary}</p>
          <Button size="lg" variant="primary" icon={<Play />} onClick={() => nav(`/demo/${uc.id}`)} data-testid="play-case">Ver recorrido</Button>
          {uc.openIn && <Button size="lg" variant="secondary" icon={<ExternalLink />} onClick={() => nav(uc.openIn!.to)}>Abrir en {uc.openIn.label}</Button>}
        </div>
      </div>

      {/* Entrada → plataforma → salida */}
      <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1.2fr_1fr]">
        <motion.div {...col(0)} className="rounded-2xl bg-white p-4 ring-1 ring-line">
          <div className="text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">01 · Entrada</div>
          <ul className="mt-2 space-y-1.5">{uc.input.map((x) => <li key={x} className="flex items-center gap-2 rounded-lg bg-canvas px-3 py-2 text-[14px]">{CHANNEL[uc.channel].icon && <span className="text-ink-3 [&>svg]:size-4">{CHANNEL[uc.channel].icon}</span>}{x}</li>)}</ul>
        </motion.div>
        <motion.div {...col(1)} className="tech-grid rounded-2xl p-4 text-white ring-1 ring-navy-border">
          <div className="text-[11.5px] font-semibold uppercase tracking-wider text-gold-light">02 · Plataforma MTi · IA agentiva</div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {uc.agents.map((a) => <div key={a} className="flex items-center gap-2 rounded-xl bg-white/[0.06] px-2 py-2 ring-1 ring-white/10"><AgentIcon code={a} size={28} glow /><span className="font-mono text-[12px] text-gold-light">{a}</span><span className="text-[13.5px]">{agentName(a)}</span></div>)}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">{uc.tech.map((t) => <span key={t} className="rounded-full bg-gold/15 px-2 py-0.5 text-[12px] text-gold-light ring-1 ring-gold/30">{t}</span>)}</div>
        </motion.div>
        <motion.div {...col(2)} className="rounded-2xl bg-white p-4 ring-1 ring-line">
          <div className="text-[11.5px] font-semibold uppercase tracking-wider text-ok">03 · Salida</div>
          <ul className="mt-2 space-y-1.5">{uc.output.map((x) => <li key={x} className="rounded-lg bg-ok-bg/60 px-3 py-2 text-[14px]">{x}</li>)}</ul>
        </motion.div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-2xl bg-white p-5 ring-1 ring-line">
          <h2 className="text-[16px] font-semibold">El recorrido, paso a paso</h2>
          <ol className="mt-3 space-y-3">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-navy text-[12px] font-semibold text-gold-light">{i + 1}</span>
                <div className="min-w-0"><div className="flex flex-wrap items-center gap-2 text-[14.5px] font-semibold">{s.title}{s.agents.map((a) => <AgentChip key={a} code={a} name={false} dark={false} size="sm" className="font-normal" />)}</div>{s.text && <p className="text-[13.5px] text-ink-3">{s.text}</p>}</div>
              </li>
            ))}
          </ol>
        </section>
        <aside className="space-y-3">
          <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
            <h3 className="text-[13px] font-semibold text-ink-3">Clasificación</h3>
            <dl className="mt-2 space-y-2 text-[13.5px]">
              <Row k="Departamentos">{uc.departments.map((d) => <Link key={d} to={`/casos?dept=${d}`} className="mr-1.5 inline-block rounded-md bg-gold/15 px-1.5 py-0.5 text-[12.5px] text-[#8a6100] hover:underline">{deptById(d).name}</Link>)}</Row>
              <Row k="Sector"><Link to={`/casos?sector=${encodeURIComponent(uc.sector)}`} className="hover:underline">{uc.sector}</Link></Row>
              <Row k="Procesos">{uc.processes.join(' · ')}</Row>
              <Row k="Canal">{CHANNEL[uc.channel].label}</Row>
              {uc.slide && <Row k="Presentación">Diapositiva {uc.slide}</Row>}
            </dl>
          </div>
          {uc.impact && (
            <div className="rounded-2xl bg-gold/10 p-4 ring-1 ring-gold/40">
              <h3 className="text-[13px] font-semibold text-[#8a6100]">Impacto según el documento comercial</h3>
              <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[13.5px] text-ink-2">{uc.impact.map((x) => <li key={x}>{x}</li>)}</ul>
              <p className="mt-2 text-[12px] text-ink-3">Referencia comercial, no medida en esta demo.</p>
            </div>
          )}
          {uc.client?.logo && <div className="flex items-center gap-3 rounded-2xl bg-white p-4 ring-1 ring-line"><BrandLogo src={uc.client.logo} name={uc.client.name} size={44} /><div className="text-[13px] text-ink-3">Caso de referencia de la presentación. Los datos del recorrido son de ejemplo.</div></div>}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-6">
          <h2 className="text-[16px] font-semibold">Casos relacionados</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{related.map((u) => <CaseCard key={u.id} u={u} />)}</div>
        </section>
      )}
    </div>
  );
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return <div className="flex gap-3"><dt className="w-[104px] shrink-0 text-ink-3">{k}</dt><dd className="min-w-0 flex-1">{children}</dd></div>;
}
