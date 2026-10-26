import { AnimatePresence, motion } from 'motion/react';
import { AgentChip } from '@/components/agents/AgentIcon';
import { ArrowUpRight, ChevronLeft, ChevronRight, Pause, Play, RotateCcw, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { MtiLogo } from '@/components/layout/Brand';
import { Segmented } from '@/components/ui';
import { useStudio } from '@/store/useStudio';
import { cx } from '@/lib/format';
import { useMotionOff } from '@/lib/useMotion';
import { EASE } from './kit';
import { SCENARIOS } from './scenarios';

const TICK = 60;

export default function DemoPlayer() {
  const { scenarioId } = useParams();
  const factory = SCENARIOS.find((s) => s.id === scenarioId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const scenario = useMemo(() => factory?.build(), [scenarioId]);
  const nav = useNavigate();
  const speed = useStudio((s) => s.ui.speed);
  const setUi = useStudio((s) => s.setUi);
  const motionOff = useMotionOff();
  const [ready, setReady] = useState(false);
  const [idx, setIdx] = useState(0);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(true);
  const done = useRef(new Set<string>());
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const enqueue = useCallback((fn: () => unknown) => {
    queue.current = queue.current.then(fn).catch((e) => console.error(e));
    return queue.current;
  }, []);

  // Preparar: estado inicial limpio del escenario.
  useEffect(() => {
    if (!scenario) return;
    done.current.clear();
    scenario.prepare();
    setIdx(0); setT(0); setPlaying(true); setReady(true);
  }, [scenario]);

  // Garantiza que el trabajo real de todas las escenas hasta `i` se ha ejecutado, en orden.
  const ensure = useCallback((i: number) => {
    if (!scenario) return;
    enqueue(async () => {
      for (let j = 0; j <= i; j++) {
        const sc = scenario.scenes[j];
        if (sc.enter && !done.current.has(`${sc.id}:enter`)) { done.current.add(`${sc.id}:enter`); await sc.enter(); }
        if (j < i) for (const [k, a] of (sc.at ?? []).entries()) {
          if (!done.current.has(`${sc.id}:at${k}`)) { done.current.add(`${sc.id}:at${k}`); await a.run(); }
        }
      }
    });
  }, [scenario, enqueue]);

  useEffect(() => { if (ready) ensure(idx); }, [idx, ready, ensure]);

  const scene = scenario?.scenes[idx];

  // Acciones temporizadas de la escena actual.
  useEffect(() => {
    if (!scene) return;
    (scene.at ?? []).forEach((a, k) => {
      const key = `${scene.id}:at${k}`;
      if ((t >= a.t || motionOff) && !done.current.has(key)) { done.current.add(key); enqueue(a.run); }
    });
  }, [t, scene, enqueue, motionOff]);

  // Reloj.
  useEffect(() => {
    if (!playing || !ready) return;
    const iv = setInterval(() => setT((x) => x + TICK * speed), TICK);
    return () => clearInterval(iv);
  }, [playing, speed, ready]);

  useEffect(() => {
    if (!scenario || !scene) return;
    if (t >= scene.duration) {
      if (idx < scenario.scenes.length - 1) { setIdx(idx + 1); setT(0); } else setPlaying(false);
    }
  }, [t, scene, idx, scenario]);

  const go = useCallback((i: number) => {
    if (!scenario) return;
    const k = Math.max(0, Math.min(scenario.scenes.length - 1, i));
    setIdx(k); setT(0);
  }, [scenario]);

  const stepBy = useCallback((delta: number) => {
    if (!scenario) return;
    setIdx((i) => Math.max(0, Math.min(scenario.scenes.length - 1, i + delta)));
    setT(0);
  }, [scenario]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); setPlaying((p) => !p); }
      if (e.key === 'ArrowRight') stepBy(1);
      if (e.key === 'ArrowLeft') stepBy(-1);
      if (e.key === 'Escape') nav('/demo');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stepBy, nav]);

  if (!factory || !scenario) return <Navigate to="/demo" replace />;
  if (!ready || !scene) return <div className="tech-grid fixed inset-0" />;

  const sections = scenario.scenes.map((s) => s.section).filter((s, i, a) => a.indexOf(s) === i);
  const last = idx === scenario.scenes.length - 1;
  const finished = last && t >= scene.duration;
  const displayT = motionOff ? 1e9 : t;
  const Scene = scene.Component;

  return (
    <div className="tech-grid fixed inset-0 z-[60] flex flex-col overflow-hidden text-white">
      {/* Cabecera */}
      <header className="flex h-14 shrink-0 items-center gap-4 border-b border-white/[0.07] px-4 md:px-6">
        <Link to="/" aria-label="Inicio"><MtiLogo height={18} /></Link>
        <div className="hidden min-w-0 md:block">
          <div className="truncate text-[13.5px] font-semibold">{scenario.title}</div>
          <div className="truncate text-[11.5px] text-muted">{scenario.reference} · demo con datos de ejemplo · el motor ejecuta cada paso de verdad</div>
        </div>
        <nav className="mx-auto hidden items-center gap-1 lg:flex" aria-label="Secciones">
          {sections.map((s, i) => {
            const first = scenario.scenes.findIndex((x) => x.section === s);
            const active = s === scene.section;
            const passed = sections.indexOf(scene.section) > i;
            return (
              <button key={s} onClick={() => go(first)} className={cx('relative rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors', active ? 'text-navy' : passed ? 'text-gold-light hover:bg-white/5' : 'text-muted hover:bg-white/5 hover:text-white')}>
                {active && <motion.span layoutId="demo-section" className="absolute inset-0 rounded-full bg-gold" transition={{ type: 'spring', duration: 0.5, bounce: 0.15 }} />}
                <span className="relative">{s}</span>
              </button>
            );
          })}
        </nav>
        <button onClick={() => nav('/demo')} className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] text-secondary ring-1 ring-white/10 hover:bg-white/10 hover:text-white lg:ml-0" aria-label="Salir de la demo"><X className="size-4" /> Salir</button>
      </header>

      {/* Escenario + narración */}
      <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 md:p-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:overflow-hidden">
        <div className="relative min-h-[520px] xl:min-h-0">
          <AnimatePresence mode="wait">
            <motion.div key={scene.id} className="h-full" initial={{ opacity: 0, x: 60, scale: 0.98 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -60, scale: 0.98 }} transition={{ duration: 0.5, ease: EASE }}>
              <Scene t={displayT} />
            </motion.div>
          </AnimatePresence>
        </div>
        <aside className="flex flex-col gap-4 xl:min-h-0">
          <AnimatePresence mode="wait">
            <motion.div key={scene.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, ease: EASE }} className="rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10">
              <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-gold-light">
                <span className="rounded-md bg-gold/15 px-1.5 py-0.5 font-mono">{String(idx + 1).padStart(2, '0')}/{String(scenario.scenes.length).padStart(2, '0')}</span>{scene.section}
              </div>
              <h1 className="mt-3 text-[24px] font-semibold leading-tight tracking-tight">{scene.title}</h1>
              <p className="mt-3 text-[15.5px] leading-relaxed text-secondary">{scene.narration}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {scene.agents.map((c, i) => (
                  <motion.span key={c} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + i * 0.08, type: 'spring', bounce: 0.4 }}>
                    <AgentChip code={c} />
                  </motion.span>
                ))}
              </div>
              <Link to={scene.where.to} className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] text-muted hover:text-gold-light">En el software: {scene.where.label} <ArrowUpRight className="size-3.5" /></Link>
            </motion.div>
          </AnimatePresence>
          {finished && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-gold/10 p-4 ring-1 ring-gold/40">
              <div className="text-[14px] font-semibold text-gold-light">Recorrido completado</div>
              <div className="mt-3 flex flex-col gap-2">
                {scenario.finale.map((f) => <Link key={f.label} to={f.to()} className="flex items-center justify-between rounded-xl bg-white/[0.06] px-3 py-2 text-[13.5px] ring-1 ring-white/10 hover:bg-white/10">{f.label}<ArrowUpRight className="size-4 text-gold-light" /></Link>)}
                <Link to="/demo" className="rounded-xl px-3 py-2 text-[13px] text-secondary hover:text-white">← Elegir otra demo</Link>
              </div>
            </motion.div>
          )}
        </aside>
      </div>

      {/* Controles */}
      <footer className="shrink-0 border-t border-white/[0.07] px-4 pb-3 pt-2.5 md:px-6">
        <div className="mb-2.5 flex gap-1" aria-label="Progreso">
          {scenario.scenes.map((s, i) => (
            <button key={s.id} onClick={() => go(i)} title={s.title} className="group h-4 flex-1 py-1.5" aria-label={`Ir a: ${s.title}`}>
              <span className="block h-1 overflow-hidden rounded-full bg-white/10 group-hover:bg-white/20">
                <span className="block h-full rounded-full bg-gold" style={{ width: i < idx ? '100%' : i === idx ? `${Math.min(100, (t / s.duration) * 100)}%` : '0%' }} />
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => go(idx - 1)} disabled={idx === 0} className="flex size-9 items-center justify-center rounded-[10px] ring-1 ring-white/15 hover:bg-white/10 disabled:opacity-30" aria-label="Escena anterior"><ChevronLeft className="size-5" /></button>
          <button onClick={() => { if (finished) { go(0); setPlaying(true); } else setPlaying((p) => !p); }} className="flex h-9 items-center gap-2 rounded-[10px] bg-gold px-4 text-[14px] font-semibold text-navy hover:bg-gold-light" aria-label={playing ? 'Pausa' : 'Reproducir'}>
            {finished ? <><RotateCcw className="size-4" /> Repetir</> : playing ? <><Pause className="size-4" /> Pausa</> : <><Play className="size-4" /> Reproducir</>}
          </button>
          <button onClick={() => go(idx + 1)} disabled={last} className="flex size-9 items-center justify-center rounded-[10px] ring-1 ring-white/15 hover:bg-white/10 disabled:opacity-30" aria-label="Escena siguiente"><ChevronRight className="size-5" /></button>
          <Segmented dark size="sm" label="Velocidad" value={String(speed) as '0.5' | '1' | '2'} onChange={(v) => setUi({ speed: Number(v) as 0.5 | 1 | 2 })} options={[{ value: '0.5', label: '0,5×' }, { value: '1', label: '1×' }, { value: '2', label: '2×' }]} />
          <span className="ml-auto hidden text-[12px] text-muted md:inline">Espacio: pausa · ← → escenas · Esc: salir</span>
        </div>
      </footer>
    </div>
  );
}
