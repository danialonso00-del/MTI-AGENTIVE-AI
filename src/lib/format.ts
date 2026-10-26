const nf = (d: number) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: 'always' } as Intl.NumberFormatOptions);

export const num = (n: number, d = 2) => nf(d).format(n);
/** Número con decimales solo si los tiene (hasta d). */
export const numSmart = (n: number, d = 3) =>
  new Intl.NumberFormat('es-ES', { maximumFractionDigits: d, useGrouping: 'always' } as Intl.NumberFormatOptions).format(n);
export const eur = (n: number) => `${nf(2).format(n)} €`;
export const minutes = (n: number) => `${numSmart(n, 1)} min`;
export const hours = (minutesValue: number) => `${numSmart(minutesValue / 60, 3)} h`;
export const pct = (n: number, d = 1) => `${nf(d).format(n)} %`;

export function dateEs(iso: string) {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function dateTimeEs(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} · ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
}

export function relativeEs(iso: string, now = Date.now()) {
  const diff = (now - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'ahora';
  if (diff < 3600) return `hace ${Math.round(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.round(diff / 3600)} h`;
  return dateEs(iso);
}

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

let counter = 0;
export const uid = (prefix = 'id') => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;
