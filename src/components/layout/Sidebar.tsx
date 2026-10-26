// Navegación de producto: módulos agrupados, contadores en vivo y barra plegable.
// Los módulos siguen el mismo orden que la historia de la demo: entrada → documentos → conocimiento → oferta → revisión → ERP.
import { AnimatePresence, motion } from 'motion/react';
import {
  BarChart3, Boxes, LibraryBig, Brain, Gavel, Mic, Cable, CheckSquare, ChevronsLeft, ChevronsRight, Cog, Factory, History, Inbox, LayoutDashboard, Menu, Network, PenTool, Play, Presentation, Settings, X,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useStudio } from '@/store/useStudio';
import { pendingApprovals } from '@/store/selectors';
import { cx } from '@/lib/format';
import { MtiLogo } from './Brand';

interface Item { to: string; label: string; icon: ReactNode; end?: boolean; badge?: number; badgeTone?: 'gold' | 'warn' }
interface Group { title: string; items: Item[] }

function useGroups(): Group[] {
  const requests = useStudio((s) => s.requests);
  const inbox = useStudio((s) => s.erp.inbox);
  const activities = useStudio((s) => s.erp.activities);
  const screened = useStudio((s) => s.portalScreenedAt);
  return useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const due = (activities ?? []).filter((a) => !a.done && a.dueDate <= today).length;
    const unread = requests.filter((r) => r.state === 'received').length + inbox.filter((i) => i.state === 'new').length;
    const approvals = pendingApprovals(requests, inbox).count;
    const openOffers = requests.filter((r) => r.state !== 'draft_created').length;
    return [
      { title: 'Operaciones', items: [
        { to: '/', label: 'Panel', icon: <LayoutDashboard />, end: true },
        { to: '/bandeja', label: 'Bandeja', icon: <Inbox />, badge: unread },
        { to: '/fabricacion', label: 'Ofertas', icon: <Factory />, badge: openOffers },
        { to: '/licitaciones', label: 'Licitaciones', icon: <Gavel />, badge: screened ? undefined : 12 },
        { to: '/comercial', label: 'Asistente comercial', icon: <Mic />, badge: due, badgeTone: 'warn' },
        { to: '/aprobaciones', label: 'Aprobaciones', icon: <CheckSquare />, badge: approvals, badgeTone: 'warn' },
        { to: '/odoo', label: 'ERP Odoo', icon: <Boxes /> },
      ] },
      { title: 'Ingeniería', items: [
        { to: '/piezas', label: 'Piezas y planos', icon: <PenTool /> },
        { to: '/conocimiento', label: 'Conocimiento', icon: <Brain /> },
        { to: '/recursos', label: 'Recursos y carga', icon: <Cog /> },
      ] },
      { title: 'Inteligencia', items: [
        { to: '/casos', label: 'Casos de uso', icon: <LibraryBig /> },
        { to: '/agentes', label: 'Agentes', icon: <Network /> },
        { to: '/analitica', label: 'Analítica', icon: <BarChart3 /> },
        { to: '/ejecuciones', label: 'Auditoría', icon: <History /> },
      ] },
      { title: 'Plataforma', items: [
        { to: '/integraciones', label: 'Integraciones', icon: <Cable /> },
        { to: '/ajustes', label: 'Ajustes', icon: <Settings /> },
      ] },
    ];
  }, [requests, inbox, activities, screened]);
}

function NavItem({ item, collapsed, onNavigate }: { item: Item; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <NavLink to={item.to} end={item.end} onClick={onNavigate} title={collapsed ? item.label : undefined}
      className={({ isActive }) => cx('group relative flex items-center gap-3 rounded-[10px] text-[13.5px] font-medium transition-colors', collapsed ? 'h-10 justify-center' : 'h-9 px-3',
        isActive ? 'text-white' : 'text-muted hover:bg-white/[0.05] hover:text-white')}>
      {({ isActive }) => (
        <>
          {isActive && <motion.span layoutId="side-active" className="absolute inset-0 rounded-[10px] bg-white/[0.08] ring-1 ring-white/10" transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }} />}
          {isActive && <motion.span layoutId="side-bar" className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-gold" transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }} />}
          <span className={cx('relative shrink-0 [&>svg]:size-[18px]', isActive && 'text-gold')}>{item.icon}</span>
          {!collapsed && <span className="relative flex-1 truncate">{item.label}</span>}
          {!!item.badge && (
            <span className={cx('relative rounded-full font-semibold tabular', collapsed ? 'absolute right-1 top-1 size-2 bg-gold text-[0px]' : 'px-1.5 text-[11px]',
              !collapsed && (item.badgeTone === 'warn' ? 'bg-[#f59e0b]/20 text-[#fcd34d]' : 'bg-gold/20 text-gold-light'))}>{item.badge}</span>
          )}
        </>
      )}
    </NavLink>
  );
}

function SidebarBody({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const groups = useGroups();
  const ui = useStudio((s) => s.ui);
  const company = useStudio((s) => s.settings?.company ?? 'Talleres Delta');
  const initials = ui.user.split(' ').filter((w) => /^[A-ZÁÉÍÓÚ]/.test(w)).slice(0, 2).map((w) => w[0]).join('');
  return (
    <div className="flex h-full flex-col">
      <div className={cx('flex h-14 shrink-0 items-center gap-2.5', collapsed ? 'justify-center' : 'px-4')}>
        <Link to="/" onClick={onNavigate} aria-label="Panel"><MtiLogo height={collapsed ? 15 : 19} /></Link>
        {!collapsed && <div className="min-w-0 leading-tight"><div className="truncate text-[13px] font-semibold text-white">Agentive AI Studio</div><div className="truncate text-[11.5px] text-muted">{company} · entorno demo</div></div>}
      </div>
      <nav className={cx('flex-1 space-y-4 overflow-y-auto pb-3 pt-2 scroll-dark', collapsed ? 'px-2' : 'px-3')} aria-label="Navegación principal">
        {groups.map((g) => (
          <div key={g.title}>
            {!collapsed ? <div className="mb-1 px-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-muted/70">{g.title}</div> : <div className="mx-auto mb-1.5 h-px w-6 bg-white/10" />}
            <div className="space-y-0.5">{g.items.map((it) => <NavItem key={it.to} item={it} collapsed={collapsed} onNavigate={onNavigate} />)}</div>
          </div>
        ))}
      </nav>
      <div className={cx('shrink-0 space-y-1.5 border-t border-white/[0.07] py-3', collapsed ? 'px-2' : 'px-3')}>
        <Link to="/demo" onClick={onNavigate} title="Demo guiada" className={cx('flex items-center gap-2.5 rounded-[10px] bg-gold font-semibold text-navy transition-colors hover:bg-gold-light', collapsed ? 'h-10 justify-center' : 'h-9 px-3 text-[13.5px]')}><Play className="size-4" />{!collapsed && 'Demo guiada'}</Link>
        <NavItem item={{ to: '/presentacion', label: 'Presentación', icon: <Presentation /> }} collapsed={collapsed} onNavigate={onNavigate} />
        <Link to="/ajustes" onClick={onNavigate} className={cx('flex items-center gap-2.5 rounded-[10px] py-1.5 hover:bg-white/[0.05]', collapsed ? 'justify-center' : 'px-2')} title={ui.user}>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-dark text-[12px] font-bold text-navy">{initials || 'U'}</span>
          {!collapsed && <span className="min-w-0 leading-tight"><span className="block truncate text-[12.5px] font-medium text-white">{ui.user.split(' (')[0]}</span><span className="block truncate text-[11px] text-muted">{ui.role ?? 'Usuario'}</span></span>}
        </Link>
      </div>
    </div>
  );
}

export function Sidebar() {
  const collapsed = Boolean(useStudio((s) => s.ui.sidebarCollapsed));
  const setUi = useStudio((s) => s.setUi);
  return (
    <aside className={cx('no-print fixed inset-y-0 left-0 z-40 hidden border-r border-white/[0.06] bg-navy transition-[width] duration-300 ease-[var(--ease-out)] md:block', collapsed ? 'w-[72px]' : 'w-[248px]')}>
      <SidebarBody collapsed={collapsed} />
      <button onClick={() => setUi({ sidebarCollapsed: !collapsed })} aria-label={collapsed ? 'Expandir menú' : 'Plegar menú'}
        className="absolute -right-3 top-[68px] flex size-6 items-center justify-center rounded-full bg-navy-mid text-muted ring-1 ring-white/15 hover:text-white">
        {collapsed ? <ChevronsRight className="size-3.5" /> : <ChevronsLeft className="size-3.5" />}
      </button>
    </aside>
  );
}

export const sidebarWidth = (collapsed: boolean) => (collapsed ? 'md:pl-[72px]' : 'md:pl-[248px]');

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const items = [
    { to: '/', label: 'Panel', icon: <LayoutDashboard />, end: true },
    { to: '/bandeja', label: 'Bandeja', icon: <Inbox /> },
    { to: '/fabricacion', label: 'Ofertas', icon: <Factory /> },
    { to: '/odoo', label: 'Odoo', icon: <Boxes /> },
  ];
  return (
    <>
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-white/10 bg-navy px-1 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 md:hidden" aria-label="Navegación principal">
        {items.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('flex min-w-[60px] flex-col items-center gap-0.5 rounded-lg px-1 py-1 text-[11px] font-medium', isActive ? 'text-gold' : 'text-muted')}>
            <span className="[&>svg]:size-5">{n.icon}</span>{n.label}
          </NavLink>
        ))}
        <button onClick={() => setOpen(true)} className="flex min-w-[60px] flex-col items-center gap-0.5 rounded-lg px-1 py-1 text-[11px] font-medium text-muted"><Menu className="size-5" />Más</button>
      </nav>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[70] md:hidden">
            <motion.div className="absolute inset-0 bg-navy/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside className="absolute inset-y-0 left-0 w-[280px] bg-navy" initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}>
              <button onClick={() => setOpen(false)} className="absolute right-3 top-4 text-muted" aria-label="Cerrar menú"><X className="size-5" /></button>
              <SidebarBody collapsed={false} onNavigate={() => setOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
