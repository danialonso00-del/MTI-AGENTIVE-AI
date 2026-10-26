import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import {
  forwardRef, useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode,
  type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react';
import { NavLink } from 'react-router-dom';
import type { RunState, StepStatus } from '@/domain/types';
import { cx } from '@/lib/format';

// ── Botones ────────────────────────────────────────────────────────────────

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dark' | 'outline-dark';
const variants: Record<Variant, string> = {
  primary: 'bg-gold text-navy hover:bg-gold-light active:bg-gold-dark shadow-[0_1px_0_rgb(255_255_255/0.35)_inset,0_1px_2px_rgb(10_15_30/0.2)] font-semibold',
  secondary: 'bg-white text-ink border border-line-strong hover:border-ink-3/50 hover:bg-[#f8fafc] font-medium',
  ghost: 'text-ink-2 hover:bg-ink/5 font-medium',
  danger: 'bg-white text-err border border-err/30 hover:bg-err-bg font-medium',
  dark: 'bg-navy text-white hover:bg-navy-mid font-medium',
  'outline-dark': 'text-secondary border border-white/15 hover:bg-white/8 hover:text-white font-medium',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  iconRight?: ReactNode;
  /** Motivo visible cuando el botón está deshabilitado. */
  disabledReason?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, iconRight, className, children, disabled, disabledReason, title, ...rest }, ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      title={disabled && disabledReason ? disabledReason : title}
      aria-disabled={disabled || undefined}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-[10px] whitespace-nowrap select-none',
        'transition-[background-color,border-color,color,transform,box-shadow] duration-150 ease-[var(--ease-out)]',
        'active:scale-[0.97] disabled:opacity-45 disabled:cursor-not-allowed disabled:active:scale-100',
        size === 'sm' && 'h-8 px-3 text-[13px]',
        size === 'md' && 'h-9 px-3.5 text-sm',
        size === 'lg' && 'h-11 px-5 text-[15px]',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {icon && <span className="shrink-0 [&>svg]:size-4">{icon}</span>}
      {children}
      {iconRight && <span className="shrink-0 [&>svg]:size-4">{iconRight}</span>}
    </button>
  );
});

export function IconButton({ label, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cx('inline-flex size-8 items-center justify-center rounded-lg text-ink-3 transition-colors hover:bg-ink/5 hover:text-ink active:scale-95 disabled:opacity-40 [&>svg]:size-4', className)}
      {...rest}
    >
      {children}
    </button>
  );
}

// ── Badges y estados ───────────────────────────────────────────────────────

type Tone = 'neutral' | 'gold' | 'ok' | 'warn' | 'err' | 'info' | 'dark';
const tones: Record<Tone, string> = {
  neutral: 'bg-ink/[0.05] text-ink-2 ring-ink/10',
  gold: 'bg-gold/15 text-[#8a6100] ring-gold/40',
  ok: 'bg-ok-bg text-ok ring-ok/20',
  warn: 'bg-warn-bg text-warn ring-warn/25',
  err: 'bg-err-bg text-err ring-err/20',
  info: 'bg-info-bg text-info ring-info/20',
  dark: 'bg-white/10 text-secondary ring-white/15',
};

export function Badge({ tone = 'neutral', children, className, dot }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[12px] font-medium ring-1 ring-inset whitespace-nowrap', tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export const RUN_STATE: Record<RunState, { label: string; tone: Tone }> = {
  received: { label: 'Recibida', tone: 'info' },
  extracting: { label: 'Extrayendo', tone: 'gold' },
  retrieving: { label: 'Buscando histórico', tone: 'gold' },
  estimating: { label: 'Estimando', tone: 'gold' },
  reviewing: { label: 'En revisión', tone: 'gold' },
  approved: { label: 'Aprobada', tone: 'ok' },
  draft_created: { label: 'Borrador en ERP', tone: 'ok' },
  needs_input: { label: 'Requiere dato', tone: 'warn' },
  failed: { label: 'Error', tone: 'err' },
  cancelled: { label: 'Cancelada', tone: 'neutral' },
};

export const STEP_STATUS: Record<StepStatus, { label: string; tone: Tone }> = {
  idle: { label: 'Pendiente', tone: 'neutral' },
  running: { label: 'En curso', tone: 'gold' },
  completed: { label: 'Completado', tone: 'ok' },
  needs_input: { label: 'Requiere acción', tone: 'warn' },
  failed: { label: 'Error', tone: 'err' },
};

export function StatePill({ state }: { state: RunState }) {
  const s = RUN_STATE[state];
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
}

// ── Superficies ────────────────────────────────────────────────────────────

export function Card({ children, className, ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-[14px] border border-line bg-white shadow-[var(--shadow-card)]', className)} {...rest}>{children}</div>;
}

export function CardHeader({ title, subtitle, actions, icon, className }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cx('flex items-start justify-between gap-3 border-b border-line px-4 py-3', className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <span className="mt-0.5 text-ink-3 [&>svg]:size-4">{icon}</span>}
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[12.5px] text-ink-3">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">{children}</div>;
}

export function Stat({ label, value, sub, tone, className }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'gold' | 'ok' | 'warn'; className?: string }) {
  return (
    <div className={cx('rounded-xl border border-line bg-white px-3.5 py-3', className)}>
      <div className="text-[12px] font-medium text-ink-3">{label}</div>
      <div className={cx('mt-1 text-[22px] font-semibold tracking-tight tabular', tone === 'gold' && 'text-[#9a6c00]', tone === 'ok' && 'text-ok', tone === 'warn' && 'text-warn')}>{value}</div>
      {sub && <div className="mt-0.5 text-[12px] text-ink-3">{sub}</div>}
    </div>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: ReactNode; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon && <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-ink/[0.04] text-ink-3 [&>svg]:size-5">{icon}</div>}
      <div className="text-[15px] font-semibold text-ink">{title}</div>
      {children && <div className="mt-1 max-w-sm text-[13.5px] text-ink-3">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded-md border border-line-strong bg-white px-1.5 py-px font-mono text-[11px] text-ink-3 shadow-[0_1px_0_#cfd7e3]">{children}</kbd>;
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx('font-mono text-[12.5px]', className)}>{children}</span>;
}

// ── Pestañas (rutas) ───────────────────────────────────────────────────────

export function RouteTabs({ tabs, className }: { tabs: { to: string; label: string; badge?: ReactNode; end?: boolean; icon?: ReactNode }[]; className?: string }) {
  return (
    <nav className={cx('flex gap-1 overflow-x-auto scroll-thin', className)} aria-label="Secciones">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) => cx(
            'relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors',
            isActive ? 'text-ink' : 'text-ink-3 hover:text-ink hover:bg-ink/[0.04]',
          )}
        >
          {({ isActive }) => (
            <>
              {t.icon && <span className="[&>svg]:size-4">{t.icon}</span>}
              {t.label}
              {t.badge}
              {isActive && <motion.span layoutId="tab-underline" className="absolute inset-x-2 -bottom-[9px] h-[2px] rounded-full bg-gold" transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }} />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export function Segmented<T extends string>({ value, onChange, options, size = 'md', dark, label }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; title?: string }[]; size?: 'sm' | 'md'; dark?: boolean; label: string;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className={cx('relative inline-flex rounded-[10px] p-0.5', dark ? 'bg-white/[0.07] ring-1 ring-white/10' : 'bg-ink/[0.05] ring-1 ring-ink/5')}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="radio"
            aria-checked={active}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cx(
              'relative z-10 rounded-lg font-medium transition-colors',
              size === 'sm' ? 'px-2.5 py-1 text-[12.5px]' : 'px-3 py-1.5 text-[13px]',
              active ? (dark ? 'text-navy' : 'text-ink') : dark ? 'text-secondary hover:text-white' : 'text-ink-3 hover:text-ink',
            )}
          >
            {active && <motion.span layoutId={`seg-${id}`} className={cx('absolute inset-0 -z-10 rounded-lg', dark ? 'bg-gold' : 'bg-white shadow-sm ring-1 ring-ink/10')} transition={{ type: 'spring', duration: 0.3, bounce: 0.12 }} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Formularios ────────────────────────────────────────────────────────────

const inputCls = 'w-full rounded-[10px] border border-line-strong bg-white px-3 py-2 text-[14px] text-ink placeholder:text-ink-3/70 transition-[border-color,box-shadow] focus:border-gold focus:outline-none focus:ring-3 focus:ring-gold/20 disabled:bg-[#f7f9fc] disabled:text-ink-2 disabled:border-line aria-[invalid=true]:border-err aria-[invalid=true]:ring-err/15';

export function Field({ label, hint, error, children, htmlFor, className }: { label: string; hint?: ReactNode; error?: string | null; children: ReactNode; htmlFor?: string; className?: string }) {
  const msg = error ? <p className="mt-1 text-[12.5px] text-err" role="alert">{error}</p> : hint ? <p className="mt-1 text-[12.5px] text-ink-3">{hint}</p> : null;
  if (!htmlFor) {
    // Sin id explícito: la etiqueta envuelve el control para asociarlos (accesibilidad y getByLabel).
    return (
      <div className={className}>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
          {children}
        </label>
        {msg}
      </div>
    );
  }
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</label>
      {children}
      {msg}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...rest }, ref) {
  return <input ref={ref} className={cx(inputCls, className)} {...rest} />;
});
export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cx(inputCls, 'pr-8', className)} {...rest}>{children}</select>;
}
export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(inputCls, 'min-h-[84px] resize-y leading-relaxed', className)} {...rest} />;
}

// ── Modal ──────────────────────────────────────────────────────────────────

export function Modal({ open, onClose, title, subtitle, children, footer, width = 560 }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; footer?: ReactNode; width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const t = setTimeout(() => ref.current?.querySelector<HTMLElement>('input,select,textarea,button:not([data-close])')?.focus(), 30);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div className="absolute inset-0 bg-navy/55 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} onClick={onClose} />
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-[var(--shadow-pop)] sm:rounded-2xl"
            style={{ maxWidth: width }}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
              <div>
                <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
                {subtitle && <p className="mt-0.5 text-[13px] text-ink-3">{subtitle}</p>}
              </div>
              <IconButton label="Cerrar" data-close onClick={onClose}><X /></IconButton>
            </div>
            <div className="overflow-y-auto px-5 py-4 scroll-thin">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-line bg-canvas/60 px-5 py-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Meter({ value, max = 1, tone = 'gold' }: { value: number; max?: number; tone?: 'gold' | 'ok' | 'ink' }) {
  const pctValue = Math.max(0, Math.min(1, value / max)) * 100;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/[0.07]">
      <div className={cx('h-full rounded-full transition-[width] duration-500 ease-[var(--ease-out)]', tone === 'gold' && 'bg-gold', tone === 'ok' && 'bg-ok', tone === 'ink' && 'bg-ink-2')} style={{ width: `${pctValue}%` }} />
    </div>
  );
}
