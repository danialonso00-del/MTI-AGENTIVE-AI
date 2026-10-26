import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import {
  CheckCircle2, Info, Maximize2, Minimize2, RotateCcw, Search, Settings2, TriangleAlert, X, XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useStudio } from '@/store/useStudio';
import { cx } from '@/lib/format';
import { useMotionOff } from '@/lib/useMotion';
import { Kbd, Segmented } from '@/components/ui';
import { MtiLogo, BrandLogo } from './Brand';
import { CommandPalette } from './CommandPalette';
import { MobileNav, Sidebar, sidebarWidth } from './Sidebar';

const CRUMBS: [RegExp, string][] = [
  [/^\/$/, 'Panel de operaciones'],
  [/^\/bandeja/, 'Bandeja unificada'],
  [/^\/fabricacion\/nueva/, 'Ofertas · Nueva solicitud'],
  [/^\/fabricacion\/[^/]+/, 'Ofertas · Expediente'],
  [/^\/fabricacion/, 'Ofertas de fabricación'],
  [/^\/aprobaciones/, 'Aprobaciones'],
  [/^\/comercial/, 'Asistente comercial · CRM por voz'],
  [/^\/licitaciones\/.+/, 'Licitaciones · Estudio de oferta'],
  [/^\/licitaciones/, 'Licitaciones públicas'],
  [/^\/odoo/, 'ERP Odoo · Bandeja operativa y registros'],
  [/^\/piezas/, 'Ingeniería · Piezas y planos'],
  [/^\/conocimiento/, 'Ingeniería · Conocimiento'],
  [/^\/recursos/, 'Ingeniería · Recursos y carga de taller'],
  [/^\/agentes/, 'Inteligencia · Agentes'],
  [/^\/analitica/, 'Inteligencia · Analítica'],
  [/^\/ejecuciones\/.+/, 'Auditoría · Replay'],
  [/^\/ejecuciones/, 'Auditoría y ejecuciones'],
  [/^\/integraciones/, 'Plataforma · Integraciones'],
  [/^\/ajustes/, 'Plataforma · Ajustes'],
  [/^\/catalogo/, 'Catálogo de casos'],
  [/^\/casos\/.+/, 'Inteligencia · Casos de uso · Ficha'],
  [/^\/casos/, 'Inteligencia · Casos de uso'],
  [/^\/demo/, 'Demo guiada · elegir escenario'],
  [/^\/presentacion/, 'Presentación'],
];

function Topbar({ onSearch }: { onSearch: () => void }) {
  const { pathname } = useLocation();
  const ui = useStudio((s) => s.ui);
  const setUi = useStudio((s) => s.setUi);
  const crumb = CRUMBS.find(([re]) => re.test(pathname))?.[1] ?? '';
  const [settings, setSettings] = useState(false);
  return (
    <header className="no-print sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/[0.06] bg-navy-light/95 px-4 text-white backdrop-blur md:px-5">
      <Link to="/" className="md:hidden" aria-label="Inicio"><MtiLogo height={18} /></Link>
      <div className="hidden min-w-0 flex-1 items-center gap-2 md:flex">
        <span className="truncate text-[13.5px] font-medium text-white">{crumb}</span>
      </div>
      <div className="flex-1 md:hidden" />
      <button onClick={onSearch} className="group flex h-9 items-center gap-2 rounded-[10px] bg-white/[0.06] px-3 text-[13px] text-muted ring-1 ring-white/10 transition-colors hover:bg-white/[0.09] hover:text-white lg:w-[300px]" aria-label="Buscar (Ctrl+K)">
        <Search className="size-4" />
        <span className="hidden lg:inline">Buscar solicitudes, registros…</span>
        <span className="ml-auto hidden lg:inline-flex"><Kbd>Ctrl K</Kbd></span>
      </button>
      <div className="hidden sm:block">
        <Segmented dark size="sm" label="Modo" value={ui.mode} onChange={(mode) => setUi({ mode })}
          options={[{ value: 'work', label: 'Trabajar', title: 'Ejecutar los pasos con acciones del usuario' }, { value: 'guided', label: 'Demo guiada', title: 'Reproducir la historia con controles de presentación' }]} />
      </div>
      <button onClick={() => setUi({ meeting: !ui.meeting })} className="hidden h-9 items-center gap-1.5 rounded-[10px] px-2.5 text-[13px] text-secondary ring-1 ring-white/10 hover:bg-white/[0.07] hover:text-white lg:flex" title="Modo reunión: amplía escena y resultado, oculta controles técnicos">
        {ui.meeting ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />} Reunión
      </button>
      <span className="hidden items-center gap-1.5 rounded-full bg-gold/12 px-2.5 py-1 text-[12px] font-medium text-gold-light ring-1 ring-gold/30 xl:inline-flex" title="Todos los conectores funcionan en modo demo con datos de ejemplo">
        <span className="size-1.5 rounded-full bg-gold" /> Demo · datos de ejemplo
      </span>
      <div className="relative">
        <button onClick={() => setSettings((v) => !v)} className="flex size-9 items-center justify-center rounded-[10px] text-secondary ring-1 ring-white/10 hover:bg-white/[0.07] hover:text-white" aria-label="Ajustes" aria-expanded={settings}>
          <Settings2 className="size-4" />
        </button>
        <AnimatePresence>{settings && <SettingsPopover onClose={() => setSettings(false)} />}</AnimatePresence>
      </div>
    </header>
  );
}

function SettingsPopover({ onClose }: { onClose: () => void }) {
  const ui = useStudio((s) => s.ui);
  const setUi = useStudio((s) => s.setUi);
  const resetDemo = useStudio((s) => s.resetDemo);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }} transition={{ duration: 0.16 }}
        className="absolute right-0 top-11 z-50 w-[300px] origin-top-right rounded-2xl bg-white p-4 text-ink shadow-[var(--shadow-pop)] ring-1 ring-ink/10">
        <div className="text-[13px] font-semibold">Movimiento</div>
        <p className="mb-2 mt-0.5 text-[12.5px] text-ink-3">Reducido sustituye las animaciones por cambios de estado instantáneos.</p>
        <Segmented size="sm" label="Movimiento" value={ui.motion} onChange={(motion) => setUi({ motion })} options={[{ value: 'system', label: 'Sistema' }, { value: 'reduced', label: 'Reducido' }, { value: 'full', label: 'Completo' }]} />
        <div className="mt-4 text-[13px] font-semibold">Modo</div>
        <div className="mt-2 sm:hidden"><Segmented size="sm" label="Modo" value={ui.mode} onChange={(mode) => setUi({ mode })} options={[{ value: 'work', label: 'Trabajar' }, { value: 'guided', label: 'Demo guiada' }]} /></div>
        <p className="mt-1 text-[12.5px] text-ink-3">Usuario: {ui.user}</p>
        <div className="mt-4 border-t border-line pt-3">
          {confirm ? (
            <div className="flex items-center gap-2">
              <span className="flex-1 text-[12.5px] text-ink-2">¿Restablecer todos los datos demo?</span>
              <button className="rounded-lg bg-err px-2.5 py-1.5 text-[12.5px] font-medium text-white" onClick={() => { resetDemo(); onClose(); }}>Restablecer</button>
              <button className="rounded-lg px-2 py-1.5 text-[12.5px] text-ink-3 hover:bg-ink/5" onClick={() => setConfirm(false)}>No</button>
            </div>
          ) : (
            <button className="flex items-center gap-2 text-[13px] font-medium text-ink-2 hover:text-ink" onClick={() => setConfirm(true)}><RotateCcw className="size-4" /> Restablecer datos de demostración</button>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 text-[12px] text-ink-3"><BrandLogo src="/brands/odoo.svg" name="Odoo" size={20} /> ERP: adapter demo local</div>
      </motion.div>
    </>
  );
}

function Toasts() {
  const toasts = useStudio((s) => s.toasts);
  const dismiss = useStudio((s) => s.dismissToast);
  const icon = { success: <CheckCircle2 className="size-4 text-ok" />, info: <Info className="size-4 text-info" />, warning: <TriangleAlert className="size-4 text-warn" />, error: <XCircle className="size-4 text-err" /> };
  return (
    <div className="no-print pointer-events-none fixed bottom-20 right-4 z-[90] flex w-[min(380px,calc(100vw-32px))] flex-col gap-2 md:bottom-5" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div key={t.id} layout initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
            className="pointer-events-auto flex items-start gap-2.5 rounded-xl bg-white px-3.5 py-3 text-[13.5px] text-ink shadow-[var(--shadow-pop)] ring-1 ring-ink/10">
            <span className="mt-0.5">{icon[t.kind]}</span>
            <span className="flex-1">{t.text}</span>
            <button onClick={() => dismiss(t.id)} className="text-ink-3 hover:text-ink" aria-label="Cerrar aviso"><X className="size-4" /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function AppShell() {
  const meeting = useStudio((s) => s.ui.meeting);
  const collapsed = Boolean(useStudio((s) => s.ui.sidebarCollapsed));
  const setUi = useStudio((s) => s.setUi);
  const motionOff = useMotionOff();
  const [search, setSearch] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    document.documentElement.dataset.motion = motionOff ? 'reduced' : 'full';
  }, [motionOff]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch(true); }
      if (e.key === 'Escape' && meeting && !search) setUi({ meeting: false });
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [meeting, search, setUi]);
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <MotionConfig reducedMotion={motionOff ? 'always' : 'never'}>
      <div className={cx('min-h-full transition-[padding] duration-300', !meeting && sidebarWidth(collapsed))}>
        {!meeting && <Sidebar />}
        {meeting ? (
          <div className="no-print sticky top-0 z-30 flex h-11 items-center gap-3 bg-navy px-4 text-white">
            <MtiLogo height={16} />
            <span className="text-[13px] text-secondary">Modo reunión</span>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-gold/12 px-2.5 py-0.5 text-[12px] text-gold-light ring-1 ring-gold/30">Demo · datos de ejemplo</span>
            <button onClick={() => setUi({ meeting: false })} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] text-secondary hover:bg-white/10 hover:text-white"><Minimize2 className="size-4" /> Salir <Kbd>Esc</Kbd></button>
          </div>
        ) : (
          <Topbar onSearch={() => setSearch(true)} />
        )}
        <main className="pb-24 md:pb-0">
          <Outlet />
        </main>
        {!meeting && <MobileNav />}
        <Toasts />
        <CommandPalette open={search} onClose={() => setSearch(false)} />
      </div>
    </MotionConfig>
  );
}
