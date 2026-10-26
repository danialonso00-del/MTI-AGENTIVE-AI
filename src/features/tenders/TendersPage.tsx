import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronDown, Clock3, FileSignature, FileText, Gavel, Radar, Search, ShieldCheck, Users, XCircle } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Badge, Button, Card, CardHeader, EmptyState, Input, RouteTabs, Stat, Textarea } from '@/components/ui';
import { BrandLogo } from '@/components/layout/Brand';
import { BAJA_HISTORY, COMPANY, PRICE_BASE_VERSION, TENDERS, type Tender } from '@/fixtures/tenders';
import { DEFAULT_TENDER_PARAMS, estimateTender, screenTender, type TenderEstimate } from '@/services/tenders/tenderEngine';
import { useStudio } from '@/store/useStudio';
import { cx, dateEs, eur, num } from '@/lib/format';

export const PORTAL_LOGO: Record<Tender['portal'], { src: string; name: string }> = {
  PLACSP: { src: '/brands/placsp.svg', name: 'Plataforma de Contratación del Sector Público' },
  TED: { src: '/brands/ted.png', name: 'TED · Diario Oficial de la UE' },
};

export default function TendersPage() {
  const { id, tab } = useParams();
  if (id) {
    const t = TENDERS.find((x) => x.id === id);
    if (!t) return <Navigate to="/licitaciones" replace />;
    return <TenderDetail t={t} tab={tab ?? 'resumen'} />;
  }
  return <TenderList />;
}

function TenderList() {
  const screenedAt = useStudio((s) => s.portalScreenedAt);
  const screen = useStudio((s) => s.screenPortal);
  const work = useStudio((s) => s.tenders ?? {});
  const [f, setF] = useState<'aplica' | 'descartada' | 'todas'>('aplica');
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const results = useMemo(() => TENDERS.map((t) => screenTender(t)), []);
  const list = results.filter((r) => (!screenedAt || f === 'todas' || (f === 'aplica' ? r.applies : !r.applies)) && `${r.tender.title} ${r.tender.organismo} ${r.tender.expediente}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="mx-auto max-w-[1680px] space-y-5 px-4 py-5 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[13px] font-medium text-[#8a6100]">Operaciones · C02 Ofertas y licitaciones</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight md:text-[32px]">Licitaciones públicas</h1>
          <p className="mt-1 max-w-3xl text-[14.5px] text-ink-3">Los agentes vigilan los portales, filtran lo que aplica a tu empresa y preparan el estudio de costes y plazos de cada obra. La presentación siempre la firma una persona.</p>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-2.5 ring-1 ring-line">
          <img src="/brands/placsp.svg" alt="Plataforma de Contratación del Sector Público" className="h-7" />
          <span className="h-6 w-px bg-line" />
          <img src="/brands/ted.png" alt="TED" className="h-7" /><span className="text-[12px] leading-tight text-ink-3">TED<br />Diario Oficial UE</span>
          <Badge tone="gold">Fuente simulada</Badge>
        </div>
      </div>

      <Card>
        <CardHeader title={`Perfil de licitación · ${COMPANY.name}`} icon={<ShieldCheck />} subtitle="Criterios con los que el agente decide qué aplica" actions={<Button variant="primary" icon={<Radar />} onClick={screen} data-testid="screen-portal">{screenedAt ? 'Volver a leer los portales' : 'Leer portales y filtrar'}</Button>} />
        <div className="grid gap-4 p-4 md:grid-cols-4 text-[13px]">
          <div><div className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Actividad (CPV)</div><div className="flex flex-wrap gap-1">{COMPANY.cpvPrefixes.map((c) => <span key={c.code} title={c.label} className="rounded-md bg-canvas px-1.5 py-0.5 text-[12px] ring-1 ring-line"><b className="font-mono">{c.code}…</b> {c.label.split(',')[0]}</span>)}</div></div>
          <div><div className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Ámbito</div>{COMPANY.regions.join(' · ')}</div>
          <div><div className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Importe y plazos</div>{eur(COMPANY.minBudget)} – {eur(COMPANY.maxBudget)}<br />≥ {COMPANY.minPrepDays} días para preparar</div>
          <div><div className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Clasificación</div>{COMPANY.classifications.map((c) => `${c.grupo}-${c.subgrupo} cat. ${c.categoria}`).join(' · ')}</div>
        </div>
      </Card>

      {!screenedAt ? (
        <Card><EmptyState icon={<Radar />} title={`${TENDERS.length} anuncios nuevos en los portales`} action={<Button variant="primary" icon={<Radar />} onClick={screen}>Leer y filtrar</Button>}>El agente leerá los anuncios y descartará los que no encajan, explicando el motivo.</EmptyState></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            {([['aplica', `Aplican (${results.filter((r) => r.applies).length})`], ['descartada', `Descartadas (${results.filter((r) => !r.applies).length})`], ['todas', `Todas (${results.length})`]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setF(k)} className={cx('rounded-full px-3 py-1.5 text-[13px] font-medium ring-1', f === k ? 'bg-navy text-white ring-navy' : 'bg-white text-ink-2 ring-line')}>{l}</button>
            ))}
            <div className="relative ml-auto w-full max-w-[280px]"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" className="h-9 pl-9" aria-label="Buscar licitaciones" /></div>
          </div>
          <ul className="divide-y divide-line">
            {list.map((r) => {
              const w = work[r.tender.id];
              return (
                <li key={r.tender.id} className={cx('flex flex-wrap items-center gap-4 px-4 py-3.5', r.applies && 'cursor-pointer hover:bg-gold/[0.04]')} onClick={() => r.applies && r.tender.detailed && nav(`/licitaciones/${r.tender.id}`)} data-tender={r.tender.id}>
                  <BrandLogo src={PORTAL_LOGO[r.tender.portal].src} name={r.tender.portal} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-3"><span className="font-mono">{r.tender.expediente}</span>· {r.tender.organismo} · {r.tender.province}</div>
                    <div className="text-[14.5px] font-semibold">{r.tender.title}</div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {(r.applies ? r.passed.slice(0, 3) : r.rejected).map((x) => <span key={x} className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px]', r.applies ? 'bg-ok-bg text-ok' : 'bg-err-bg text-err')}>{r.applies ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}{x}</span>)}
                      {r.warnings.map((x) => <span key={x} className="inline-flex items-center gap-1 rounded-md bg-warn-bg px-1.5 py-0.5 text-[11.5px] text-warn"><AlertTriangle className="size-3" />{x}</span>)}
                    </div>
                  </div>
                  <div className="w-[130px] text-right"><div className="text-[15px] font-semibold tabular">{eur(r.tender.budget)}</div><div className="text-[12px] text-ink-3">{r.tender.months} meses · sin IVA</div></div>
                  <div className="w-[120px] text-right text-[12.5px]"><div className={cx('font-medium', r.daysLeft < 7 ? 'text-err' : 'text-ink-2')}><Clock3 className="mr-1 inline size-3.5" />{r.daysLeft} días</div><div className="text-ink-3">cierra {dateEs(r.tender.deadline)}</div></div>
                  <div className="w-[130px] text-right">
                    {w?.decision ? <Badge tone={w.decision.go && !w.decision.invalidatedAt ? 'ok' : 'neutral'}>{w.decision.go ? 'GO' : 'NO GO'}{w.decision.invalidatedAt ? ' · revisar' : ''}</Badge>
                      : r.applies ? (r.tender.detailed ? <Badge tone="gold">{w?.steps.length ? 'En estudio' : `Encaje ${r.score}`}</Badge> : <Badge tone="info">Aplica · sin pliegos</Badge>) : <Badge tone="neutral">Descartada</Badge>}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

function TenderDetail({ t, tab }: { t: Tender; tab: string }) {
  const work = useStudio((s) => s.tenders?.[t.id]);
  const analyze = useStudio((s) => s.analyzeTender);
  const params = work?.params ?? DEFAULT_TENDER_PARAMS;
  const e = useMemo(() => estimateTender(t, params), [t, params]);
  const s = screenTender(t);
  const analyzed = (work?.steps.length ?? 0) >= 5;
  return (
    <div className="mx-auto max-w-[1680px] px-4 py-5 md:px-6">
      <Link to="/licitaciones" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-ink"><ArrowLeft className="size-3.5" /> Licitaciones</Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <BrandLogo src={PORTAL_LOGO[t.portal].src} name={PORTAL_LOGO[t.portal].name} size={44} />
          <div className="min-w-0">
            <div className="text-[12.5px] text-ink-3"><span className="font-mono">{t.expediente}</span> · {t.organismo} · {t.procedure} · {PORTAL_LOGO[t.portal].name}</div>
            <h1 className="text-[22px] font-semibold tracking-tight md:text-[26px]">{t.title}</h1>
          </div>
        </div>
        {!analyzed ? <Button variant="primary" icon={<Gavel />} onClick={() => analyze(t.id)} data-testid="analyze-tender">Estudiar con agentes</Button>
          : work?.decision && !work.decision.invalidatedAt ? <Badge tone={work.decision.go ? 'ok' : 'neutral'}>Decisión {work.decision.go ? 'GO' : 'NO GO'} · {work.decision.by.split(' (')[0]}</Badge>
          : <Link to={`/licitaciones/${t.id}/oferta`}><Button variant="primary" icon={<FileSignature />}>Decidir oferta</Button></Link>}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Stat label="Presupuesto base (sin IVA)" value={eur(t.budget)} />
        <Stat label="Plazo de ejecución" value={`${t.months} meses`} sub={`${e.plazoDays} días hábiles`} />
        <Stat label="Cierre de ofertas" value={`${s.daysLeft} días`} sub={dateEs(t.deadline)} />
        <Stat label="Nuestra oferta" value={analyzed ? eur(e.totals.offer) : '—'} sub={analyzed ? `baja ${num(e.totals.bajaPct, 1)} %` : 'Pendiente de estudio'} tone="gold" />
        <Stat label="Plan de obra" value={analyzed ? `${Math.ceil(e.totalDays)} días` : '—'} sub={analyzed ? (e.totalDays <= e.plazoDays ? 'dentro de plazo' : 'supera el plazo') : ''} tone={analyzed ? (e.totalDays <= e.plazoDays ? 'ok' : 'warn') : undefined} />
      </div>
      <RouteTabs className="mt-4 border-b border-line pb-2" tabs={[['resumen', 'Resumen'], ['pliegos', 'Pliegos'], ['costes', 'Mediciones y costes'], ['plan', 'Planificación'], ['oferta', 'Oferta y decisión']].map(([k, l]) => ({ to: `/licitaciones/${t.id}/${k}`, label: l }))} />
      <div className="mt-4">
        {!analyzed && tab !== 'resumen' && tab !== 'pliegos' ? <Card><EmptyState icon={<Gavel />} title="Estudio pendiente" action={<Button variant="primary" onClick={() => analyze(t.id)}>Estudiar con agentes</Button>}>Los agentes leerán pliegos y mediciones y calcularán costes y plazos.</EmptyState></Card>
          : tab === 'resumen' ? <Summary t={t} />
          : tab === 'pliegos' ? <Pliegos t={t} />
          : tab === 'costes' ? <Costs t={t} e={e} />
          : tab === 'plan' ? <Plan t={t} e={e} />
          : <Offer t={t} e={e} />}
      </div>
    </div>
  );
}

function Summary({ t }: { t: Tender }) {
  const s = screenTender(t);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title="Criterios de adjudicación" subtitle="Según el PCAP" />
        <div className="space-y-2.5 p-4">
          {t.criteria.map((c) => (
            <div key={c.name}>
              <div className="mb-1 flex justify-between text-[13px]"><span>{c.name} <span className="text-ink-3">· {c.type}</span></span><b className="tabular">{c.weight} pts</b></div>
              <div className="h-2 overflow-hidden rounded-full bg-ink/[0.06]"><div className="h-full rounded-r-[4px]" style={{ width: `${c.weight}%`, background: c.type === 'precio' ? '#c8921a' : c.type === 'fórmula' ? '#2a78d6' : '#1baf7a' }} /></div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <CardHeader title="Por qué aplica" subtitle="Filtrado del agente C02" />
        <ul className="space-y-1.5 p-4 text-[13.5px]">{s.passed.map((x) => <li key={x} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" />{x}</li>)}{s.warnings.map((x) => <li key={x} className="flex gap-2 text-warn"><AlertTriangle className="mt-0.5 size-4 shrink-0" />{x}</li>)}</ul>
        <div className="border-t border-line px-4 py-3">
          <div className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-ink-3">Documentación del expediente</div>
          <ul className="space-y-1">{t.documents?.map((d) => <li key={d} className="flex items-center gap-2 text-[13px]"><FileText className="size-4 text-ink-3" />{d}</li>)}</ul>
        </div>
      </Card>
    </div>
  );
}

function Pliegos({ t }: { t: Tender }) {
  return (
    <Card>
      <CardHeader title="Datos clave extraídos de los pliegos" icon={<FileText />} subtitle="Cada dato con su cláusula de origen" />
      <ul className="divide-y divide-line">
        {t.pliego?.map((p) => (
          <li key={p.label} className="grid gap-2 px-4 py-3 md:grid-cols-[240px_minmax(0,1fr)]">
            <div><div className="text-[13.5px] font-semibold">{p.label}</div><div className="text-[13px] text-ink-2">{p.label.startsWith('Presupuesto') ? `${eur(t.budget)} ${p.value}` : p.value}</div></div>
            <blockquote className="rounded-lg border-l-[3px] border-gold bg-canvas px-3 py-2 text-[13px] italic text-ink-2">«{p.fragment}» <span className="not-italic text-ink-3">— {p.doc}</span></blockquote>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Costs({ t, e }: { t: Tender; e: TenderEstimate }) {
  const [open, setOpen] = useState<string | null>(e.chapters[0]?.name ?? null);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="PEM del proyecto" value={eur(e.totals.projectPEM)} sub="Mediciones × precios del proyecto" />
        <Stat label="Nuestro coste de ejecución" value={eur(e.totals.ownPEM)} sub={`Directo + ${5} % indirectos · ${num((e.totals.ownPEM / e.totals.projectPEM) * 100, 1)} % del proyecto`} />
        <Stat label="Con gastos generales de empresa" value={eur(e.totals.costWithGG)} sub="9 % de estructura · precio de equilibrio" />
        <Stat label="Baja máxima sin pérdidas" value={`${num(e.totals.breakEvenBaja, 1)} %`} sub="Por encima, se pierde dinero" tone="warn" />
      </div>
      <Card className="overflow-hidden">
        <CardHeader title="Mediciones valoradas por capítulo" subtitle={`Base de precios: ${PRICE_BASE_VERSION} · mano de obra, maquinaria, materiales y rendimientos`} />
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full min-w-[900px] text-[13.5px]">
            <thead className="bg-canvas text-[12px] text-ink-3"><tr><th className="px-4 py-2 text-left font-medium">Capítulo / partida</th><th className="px-3 py-2 text-right font-medium">Medición</th><th className="px-3 py-2 text-right font-medium">Precio proyecto</th><th className="px-3 py-2 text-right font-medium">Nuestro coste</th><th className="px-3 py-2 text-right font-medium">Desviación</th><th className="px-3 py-2 text-right font-medium">Importe proyecto</th><th className="px-3 py-2 text-right font-medium">Nuestro importe</th></tr></thead>
            <tbody>
              {e.chapters.map((c) => (
                <Fragment key={c.name}>
                  <tr className="cursor-pointer border-t border-line bg-canvas/50 font-semibold hover:bg-gold/[0.05]" onClick={() => setOpen(open === c.name ? null : c.name)}>
                    <td className="px-4 py-2.5"><ChevronDown className={cx('mr-1.5 inline size-4 transition-transform', open === c.name && 'rotate-180')} />{c.name}</td>
                    <td colSpan={4} className="px-3 py-2.5 text-right text-[12px] font-normal text-ink-3">{c.partidas} partidas · {num(c.workDays, 0)} días de equipo</td>
                    <td className="px-3 py-2.5 text-right tabular">{eur(c.project)}</td>
                    <td className="px-3 py-2.5 text-right tabular">{eur(c.cost)}</td>
                  </tr>
                  {open === c.name && e.partidas.filter((p) => p.chapter === c.name).map((p) => (
                    <tr key={p.code} className="border-t border-line">
                      <td className="px-4 py-2 pl-10"><div><span className="font-mono text-[12px] text-ink-3">{p.code}</span> {p.description}</div><div className="text-[11.5px] text-ink-3">{p.assumed ? <span className="text-warn">{p.assumed}</span> : `${p.source} · MO ${num(p.labour, 2)} + maq. ${num(p.machine, 2)} + mat. ${num(p.materials, 2)} €`}</div></td>
                      <td className="px-3 py-2 text-right tabular">{num(p.qty, 0)} {p.unit}</td>
                      <td className="px-3 py-2 text-right tabular">{eur(p.projectPrice)}</td>
                      <td className="px-3 py-2 text-right tabular">{eur(p.unitCost)}</td>
                      <td className={cx('px-3 py-2 text-right tabular', p.diffPct > 0 ? 'text-err' : 'text-ok')}>{p.diffPct > 0 ? '+' : ''}{num(p.diffPct, 1)} %</td>
                      <td className="px-3 py-2 text-right tabular">{eur(p.projectTotal)}</td>
                      <td className="px-3 py-2 text-right tabular">{eur(p.total)}</td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-line-strong bg-canvas/70 font-semibold"><tr><td className="px-4 py-2.5" colSpan={5}>Total ejecución material</td><td className="px-3 py-2.5 text-right tabular">{eur(e.totals.projectPEM)}</td><td className="px-3 py-2.5 text-right tabular">{eur(e.totals.ownPEM)}</td></tr></tfoot>
          </table>
        </div>
        <p className="border-t border-line px-4 py-2.5 text-[12px] text-ink-3">Presupuesto base de licitación = PEM del proyecto × 1,19 (13 % gastos generales + 6 % beneficio industrial) = {eur(t.budget)} sin IVA.</p>
      </Card>
    </div>
  );
}

function Plan({ t, e }: { t: Tender; e: TenderEstimate }) {
  const setParams = useStudio((s) => s.setTenderParams);
  const params = useStudio((s) => s.tenders?.[t.id]?.params ?? DEFAULT_TENDER_PARAMS);
  const span = Math.max(e.plazoDays, e.totalDays) * 1.05;
  const rows = Object.entries(e.schedule);
  return (
    <Card>
      <CardHeader title="Planificación por capítulos" subtitle="Duración = medición ÷ rendimiento ÷ equipos · precedencias y solapes del proyecto" />
      <div className="p-4">
        <div className="relative space-y-2.5">
          <div className="pointer-events-none absolute inset-y-0 z-10 border-l-2 border-dashed border-err" style={{ left: `calc(220px + (100% - 220px) * ${e.plazoDays / span})` }}><span className="absolute -top-1 right-1 whitespace-nowrap rounded bg-err px-1.5 py-0.5 text-[11px] font-medium text-white">Plazo {e.plazoDays} d</span></div>
          {rows.map(([name, s]) => {
            const crit = name === e.critical;
            const crews = 1 + (params.extraCrews[name] ?? 0);
            return (
              <div key={name} className="flex items-center gap-3">
                <div className="w-[208px] shrink-0">
                  <div className="truncate text-[13px] font-medium">{name}</div>
                  {!name.startsWith('Seguridad') && (
                    <div className="flex items-center gap-1.5 text-[11.5px] text-ink-3">{crews} equipo{crews > 1 ? 's' : ''}
                      <button className="rounded px-1 ring-1 ring-line hover:ring-gold" aria-label={`Añadir equipo en ${name}`} onClick={() => setParams(t.id, { extraCrews: { [name]: crews } }, `equipos de ${name}`)}>+</button>
                      {crews > 1 && <button className="rounded px-1 ring-1 ring-line hover:ring-gold" aria-label={`Quitar equipo en ${name}`} onClick={() => setParams(t.id, { extraCrews: { [name]: crews - 2 } }, `equipos de ${name}`)}>−</button>}
                    </div>
                  )}
                </div>
                <div className="relative h-7 flex-1 rounded-md bg-ink/[0.04]">
                  <div className={cx('absolute top-1 h-5 rounded-[5px] transition-[left,width] duration-700 ease-[var(--ease-out)]', name.startsWith('Seguridad') ? 'bg-ink/15' : crit ? 'bg-[#c8921a]' : 'bg-[#2a78d6]')} style={{ left: `${(s.start / span) * 100}%`, width: `${Math.max(1, ((s.end - s.start) / span) * 100)}%` }} title={`${name}: días ${Math.round(s.start)}–${Math.round(s.end)}`} />
                  <span className="absolute top-1.5 text-[11px] font-medium text-ink-2" style={{ left: `calc(${(s.end / span) * 100}% + 6px)` }}>{Math.round(s.end - s.start)} d</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4 text-[12.5px] text-ink-3"><span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[#c8921a]" />Camino crítico</span><span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-[#2a78d6]" />Capítulo</span><span>Total: <b className="text-ink">{Math.ceil(e.totalDays)} días hábiles</b> de {e.plazoDays}</span></div>
        {e.totalDays > e.plazoDays && <p className="mt-3 flex items-center gap-2 rounded-lg bg-warn-bg px-3 py-2 text-[13px] text-warn"><Users className="size-4" />El camino crítico ({e.critical}) no cabe: añade un equipo en ese capítulo para recuperar plazo.</p>}
      </div>
    </Card>
  );
}

function Offer({ t, e }: { t: Tender; e: TenderEstimate }) {
  const work = useStudio((s) => s.tenders?.[t.id]);
  const setParams = useStudio((s) => s.setTenderParams);
  const decide = useStudio((s) => s.decideTender);
  const prepare = useStudio((s) => s.prepareTenderDocs);
  const params = work?.params ?? DEFAULT_TENDER_PARAMS;
  const [comment, setComment] = useState('');
  const hist = BAJA_HISTORY.filter((h) => h.organismo === t.organismo);
  const d = work?.decision;
  const valid = d && !d.invalidatedAt;
  const docs = ['DEUC cumplimentado', 'Declaración responsable de clasificación y solvencia', `Memoria técnica (${t.criteria.filter((c) => c.type === 'juicio de valor').map((c) => c.weight).join('')} pts por juicio de valor)`, 'Oferta económica (sobre de criterios automáticos)', 'Plan de obra y programa de trabajos', `Compromiso de garantía definitiva (${eur(e.totals.guarantee)})`];
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="space-y-4">
        <Card>
          <CardHeader title="Oferta económica" icon={<Gavel />} subtitle="Precio = coste de ejecución × (1 + gastos generales 9 %) × (1 + margen)" />
          <div className="space-y-4 p-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-[13px]"><span>Margen objetivo</span><b className="tabular">{num(params.marginPct, 1)} %</b></div>
              <input type="range" min={0} max={15} step={0.5} value={params.marginPct} onChange={(ev) => setParams(t.id, { marginPct: Number(ev.target.value) }, 'margen modificado')} className="w-full accent-[#e6a817]" aria-label="Margen objetivo" />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Precio ofertado" value={eur(e.totals.offer)} sub="sin IVA" tone="gold" />
              <Stat label="Baja sobre licitación" value={`${num(e.totals.bajaPct, 1)} %`} sub={`media histórica ${num(e.totals.avgHist, 1)} %`} />
              <Stat label="Puntos de precio (est.)" value={`${num(e.totals.pricePoints, 1)} / ${e.totals.priceWeight}`} sub="vs. baja ganadora media" />
              <Stat label="Umbral anormalidad (est.)" value={`${num(e.totals.abnormalThreshold, 1)} %`} sub="media + 10 puntos" />
            </div>
            <div className="relative h-8 rounded-full bg-ink/[0.05]">
              {[['Equilibrio', e.totals.breakEvenBaja, '#b91c1c'], ['Media histórica', e.totals.avgHist, '#1baf7a'], ['Anormal', e.totals.abnormalThreshold, '#b45309']].map(([l, v, c]) => (
                <div key={l as string} className="absolute top-0 h-full border-l-2" style={{ left: `${Math.min(100, (Number(v) / 30) * 100)}%`, borderColor: c as string }}><span className="absolute top-full mt-0.5 -translate-x-1/2 whitespace-nowrap text-[11px] text-ink-3">{l as string} {num(Number(v), 1)} %</span></div>
              ))}
              <div className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold ring-4 ring-gold/25 transition-[left] duration-500" style={{ left: `${Math.min(100, Math.max(0, (e.totals.bajaPct / 30) * 100))}%` }} title="Nuestra baja" />
            </div>
            <div className="h-4" />
          </div>
        </Card>
        <Card>
          <CardHeader title="Comprobaciones" icon={<ShieldCheck />} subtitle="Agente C08 · Calidad" />
          <ul className="space-y-1.5 p-4 text-[13.5px]">{e.checks.map((c) => <li key={c.text} className={cx('flex gap-2', c.level === 'error' ? 'text-err' : c.level === 'warning' ? 'text-warn' : 'text-ink-2')}>{c.level === 'ok' ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}{c.text}</li>)}</ul>
        </Card>
        {hist.length > 0 && (
          <Card>
            <CardHeader title="Bajas ganadoras en este órgano" subtitle="Histórico de adjudicaciones (ficticio)" />
            <table className="w-full text-[13px]"><tbody>{hist.map((h) => <tr key={h.expediente} className="border-t border-line first:border-0"><td className="px-4 py-2 font-mono">{h.expediente}</td><td className="px-3 py-2 text-right tabular">{eur(h.budget)}</td><td className="px-3 py-2 text-right tabular">{num(h.bajaGanadora, 1)} %</td><td className="px-4 py-2 text-right text-ink-3">{h.licitadores} licitadores</td></tr>)}</tbody></table>
          </Card>
        )}
      </div>
      <div className="space-y-4">
        <Card>
          <CardHeader title="Decisión" icon={<FileSignature />} />
          <div className="space-y-3 p-4">
            <div className={cx('rounded-xl px-3 py-2.5 text-[13.5px] ring-1', e.go ? 'bg-ok-bg text-ok ring-ok/20' : 'bg-warn-bg text-warn ring-warn/25')}><b>Recomendación:</b> {e.recommendation}</div>
            {valid ? (
              <div className="rounded-xl bg-canvas px-3 py-2.5 text-[13px] ring-1 ring-line">Decisión <b>{d!.go ? 'GO' : 'NO GO'}</b> de {d!.by} · {eur(d!.offer)} · baja {num(d!.bajaPct, 1)} %{d!.comment && <div className="mt-1 italic text-ink-3">«{d!.comment}»</div>}</div>
            ) : d?.invalidatedAt ? <p className="rounded-lg bg-warn-bg px-3 py-2 text-[12.5px] text-warn">La decisión anterior se anuló porque cambiaron margen o equipos.</p> : null}
            {!valid && (
              <>
                <Textarea value={comment} onChange={(ev) => setComment(ev.target.value)} placeholder="Comentario para el comité de ofertas" rows={2} aria-label="Comentario de la decisión" />
                <div className="flex gap-2"><Button variant="primary" className="flex-1" onClick={() => decide(t.id, true, comment || undefined)} disabled={e.totalDays > e.plazoDays} disabledReason="El plan no cumple el plazo" data-testid="tender-go">Presentar (GO)</Button><Button variant="secondary" onClick={() => decide(t.id, false, comment || undefined)}>No presentar</Button></div>
              </>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Documentación" subtitle="Se prepara tras un GO vigente" actions={valid && d!.go && !work?.docsPrepared && <Button size="sm" variant="primary" onClick={() => prepare(t.id)}>Preparar</Button>} />
          <ul className="space-y-1.5 p-4">{docs.map((x) => <li key={x} className="flex items-center gap-2 text-[13px]">{work?.docsPrepared ? <CheckCircle2 className="size-4 text-ok" /> : <span className="size-4 rounded-full ring-1 ring-line-strong" />}{x}</li>)}</ul>
          <p className="border-t border-line px-4 py-2.5 text-[12px] text-ink-3">La presentación electrónica en {PORTAL_LOGO[t.portal].name} requiere la firma del apoderado: los agentes nunca la envían.</p>
        </Card>
      </div>
    </div>
  );
}
