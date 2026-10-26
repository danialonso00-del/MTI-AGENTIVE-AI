import { cx } from '@/lib/format';

/** Logo MTI auténtico (copia local de mingothings.com/logo-mti.png, recortado sin alterar). */
export function MtiLogo({ className, height = 22 }: { className?: string; height?: number }) {
  return <img src="/brands/mti-logo-cropped.png" alt="MTI" height={height} style={{ height, width: 'auto' }} className={cx('select-none', className)} draggable={false} />;
}

/** Logo de herramienta con fondo neutro; sin asset verificable → placa neutral con el nombre (no simula un logo). */
export function BrandLogo({ src, name, size = 28, className, plate = true }: { src?: string; name: string; size?: number; className?: string; plate?: boolean }) {
  if (!src) {
    return (
      <span
        title={`${name} · placa neutral (sin logo verificado)`}
        className={cx('inline-flex items-center justify-center rounded-lg border border-dashed border-line-strong bg-canvas px-1.5 font-mono text-[10.5px] font-semibold uppercase tracking-wide text-ink-3', className)}
        style={{ minWidth: size, height: size }}
      >
        {name.split(/[\s/]/)[0].slice(0, 6)}
      </span>
    );
  }
  return (
    <span className={cx('inline-flex shrink-0 items-center justify-center', plate && 'rounded-lg bg-white ring-1 ring-ink/10', className)} style={{ width: size, height: size, padding: plate ? size * 0.16 : 0 }}>
      <img src={src} alt={name} className="max-h-full max-w-full object-contain" draggable={false} />
    </span>
  );
}
