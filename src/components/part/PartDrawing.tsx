// Plano técnico de ejemplo generado desde DrawingSpec. Las anclas (tb.*, notes, dims.*) permiten
// resaltar la zona exacta de la que procede una evidencia.
import type { DrawingSpec } from '@/fixtures/drawings';
import { dateEs } from '@/lib/format';

const INK = '#0b1222';
const DIM = '#1d4ed8';
const HL = 'rgba(230,168,23,0.22)';
const HL_STROKE = '#c8921a';

function holesPrismatic(L: number, W: number, n: number, inset = 12) {
  const perSide = Math.ceil(n / 2);
  const pts: [number, number][] = [];
  for (let s = 0; s < 2; s++) {
    const y = s === 0 ? inset : W - inset;
    const count = s === 0 ? perSide : n - perSide;
    for (let i = 0; i < count; i++) {
      const x = count === 1 ? L / 2 : inset + ((L - 2 * inset) * i) / (count - 1);
      pts.push([x, y]);
    }
  }
  return pts;
}
export const holePositions = (f: DrawingSpec['features']) =>
  f.family === 'torneado'
    ? Array.from({ length: f.holes.count }, (_, i) => {
        const a = (i / f.holes.count) * Math.PI * 2 + Math.PI / 2;
        const r = f.widthMm * 0.375;
        return [f.widthMm / 2 + r * Math.cos(a), f.widthMm / 2 + r * Math.sin(a)] as [number, number];
      })
    : holesPrismatic(f.lengthMm, f.widthMm, f.holes.count);

function DimH({ x1, x2, y, label, off = -22 }: { x1: number; x2: number; y: number; label: string; off?: number }) {
  const yy = y + off;
  return (
    <g stroke={DIM} strokeWidth={0.8} fill="none">
      <line x1={x1} y1={y} x2={x1} y2={yy - 4 * Math.sign(off)} />
      <line x1={x2} y1={y} x2={x2} y2={yy - 4 * Math.sign(off)} />
      <line x1={x1} y1={yy} x2={x2} y2={yy} markerStart="url(#d-arr)" markerEnd="url(#d-arr)" />
      <text x={(x1 + x2) / 2} y={yy - 4} textAnchor="middle" fill={DIM} stroke="none" fontSize={12} fontFamily="Inter, sans-serif">{label}</text>
    </g>
  );
}
function DimV({ y1, y2, x, label, off = -22 }: { y1: number; y2: number; x: number; label: string; off?: number }) {
  const xx = x + off;
  return (
    <g stroke={DIM} strokeWidth={0.8} fill="none">
      <line x1={x} y1={y1} x2={xx - 4 * Math.sign(off)} y2={y1} />
      <line x1={x} y1={y2} x2={xx - 4 * Math.sign(off)} y2={y2} />
      <line x1={xx} y1={y1} x2={xx} y2={y2} markerStart="url(#d-arr)" markerEnd="url(#d-arr)" />
      <text x={xx - 5} y={(y1 + y2) / 2} textAnchor="middle" fill={DIM} stroke="none" fontSize={12} fontFamily="Inter, sans-serif" transform={`rotate(-90 ${xx - 5} ${(y1 + y2) / 2})`}>{label}</text>
    </g>
  );
}

export function PartDrawing({ spec, highlight, className }: { spec: DrawingSpec; highlight?: string | null; className?: string }) {
  const f = spec.features;
  const turned = f.family === 'torneado';
  // Vista superior
  const vx = 90, vy = 110, vw = 520, vh = 330;
  const s = Math.min(vw / f.lengthMm, vh / f.widthMm) * 0.82;
  const L = f.lengthMm * s, W = f.widthMm * s;
  const ox = vx + (vw - L) / 2, oy = vy + (vh - W) / 2;
  const holes = holePositions(f);
  // Vista lateral (sección)
  const sx = 690, sy = oy;
  const sL = Math.min(L, 330);
  const sScale = sL / f.lengthMm;
  const pocket = f.pocket;

  const hlRect = (id: string, x: number, y: number, w: number, h: number) =>
    highlight === id ? <rect key={id} x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx={6} fill={HL} stroke={HL_STROKE} strokeWidth={2} /> : null;

  // Cajetín
  const tbx = 663, tby = 600, tbw = 430, rowH = 24;
  const tbRows: [string, string, string][] = [
    ['tb.customer', 'CLIENTE', spec.customer],
    ['tb.partNumber', 'REFERENCIA', spec.partNumber],
    ['tb.name', 'DENOMINACIÓN', spec.partName],
    ['tb.material', 'MATERIAL', spec.materialText],
    ['tb.finish', 'ACABADO', spec.finishText],
    ['tb.tolerance', 'TOL. GENERAL', spec.generalTolerance],
  ];

  return (
    <svg viewBox="0 0 1123 794" className={className} role="img" aria-label={`Plano ${spec.partNumber} revisión ${spec.revision}`} style={{ background: '#fff' }}>
      <defs>
        <marker id="d-arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,1 L10,5 L0,9 z" fill={DIM} />
        </marker>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={INK} strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect x={14} y={14} width={1095} height={766} fill="none" stroke={INK} strokeWidth={1.5} />
      <rect x={24} y={24} width={1075} height={746} fill="none" stroke={INK} strokeWidth={0.6} />
      <text x={40} y={56} fontSize={20} fontWeight={700} fill={INK} fontFamily="Inter, sans-serif">{spec.partNumber} · {spec.partName}</text>
      <text x={40} y={76} fontSize={12} fill="#64748b" fontFamily="Inter, sans-serif">PLANO DE EJEMPLO · DATOS FICTICIOS · MTI Agentive AI Studio</text>

      {hlRect('dims.overall', ox - 40, oy - 40, L + 52, W + 52)}
      {hlRect('dims.height', sx - 8, sy - 28, sL + 52, f.heightMm * sScale + 36)}
      {/* Vista superior / frontal */}
      <text x={vx} y={vy - 8} fontSize={12} fill="#64748b" fontFamily="Inter, sans-serif">{turned ? 'VISTA FRONTAL' : 'VISTA SUPERIOR'}</text>
      {turned ? (
        <>
          <circle cx={ox + L / 2} cy={oy + W / 2} r={L / 2} fill="#f8fafc" stroke={INK} strokeWidth={1.6} />
          <circle cx={ox + L / 2} cy={oy + W / 2} r={f.widthMm * 0.375 * s} fill="none" stroke={INK} strokeWidth={0.6} strokeDasharray="10 3 2 3" />
          <DimH x1={ox} x2={ox + L} y={oy} label={`Ø${f.widthMm}`} />
        </>
      ) : (
        <>
          <rect x={ox} y={oy} width={L} height={W} rx={4 * s} fill="#f8fafc" stroke={INK} strokeWidth={1.6} />
          {pocket && (
            <>
              {highlight === 'dims.pocket' && <rect x={ox + (L - pocket.lengthMm * s) / 2 - 6} y={oy + (W - pocket.widthMm * s) / 2 - 6} width={pocket.lengthMm * s + 12} height={pocket.widthMm * s + 12} rx={8} fill={HL} stroke={HL_STROKE} strokeWidth={2} />}
              <rect x={ox + (L - pocket.lengthMm * s) / 2} y={oy + (W - pocket.widthMm * s) / 2} width={pocket.lengthMm * s} height={pocket.widthMm * s} rx={3 * s} fill="#eef2f7" stroke={INK} strokeWidth={1.2} />
              <DimH x1={ox + (L - pocket.lengthMm * s) / 2} x2={ox + (L + pocket.lengthMm * s) / 2} y={oy + (W - pocket.widthMm * s) / 2} label={`${pocket.lengthMm}`} off={-14} />
              <text x={ox + L / 2} y={oy + W / 2 + 5} textAnchor="middle" fontSize={12} fill={DIM} fontFamily="Inter, sans-serif">{`${pocket.lengthMm}×${pocket.widthMm} prof. ${pocket.depthMm}`}</text>
            </>
          )}
          <DimH x1={ox} x2={ox + L} y={oy} label={`${f.lengthMm}`} />
          <DimV y1={oy} y2={oy + W} x={ox} label={`${f.widthMm}`} />
        </>
      )}
      {holes.map(([hx, hy], i) => (
        <g key={i}>
          <circle cx={ox + hx * s} cy={oy + hy * s} r={(f.holes.diameterMm / 2) * s} fill="#fff" stroke={INK} strokeWidth={1.2} />
          <line x1={ox + hx * s - 9} y1={oy + hy * s} x2={ox + hx * s + 9} y2={oy + hy * s} stroke={INK} strokeWidth={0.4} />
          <line x1={ox + hx * s} y1={oy + hy * s - 9} x2={ox + hx * s} y2={oy + hy * s + 9} stroke={INK} strokeWidth={0.4} />
        </g>
      ))}
      {highlight === 'dims.holes' && holes.map(([hx, hy], i) => <circle key={`hh${i}`} cx={ox + hx * s} cy={oy + hy * s} r={(f.holes.diameterMm / 2) * s + 7} fill={HL} stroke={HL_STROKE} strokeWidth={1.5} />)}
      {holes[0] && (
        <g fontFamily="Inter, sans-serif">
          <line x1={ox + holes[0][0] * s + 4} y1={oy + holes[0][1] * s + 4} x2={ox + holes[0][0] * s + 40} y2={oy + W + 36} stroke={DIM} strokeWidth={0.8} />
          <text x={ox + holes[0][0] * s + 44} y={oy + W + 40} fontSize={12.5} fill={DIM}>{`${f.holes.count}× Ø${String(f.holes.diameterMm).replace('.', ',')}${f.holes.fit ? ` ${f.holes.fit}` : ''} pasantes`}</text>
        </g>
      )}

      {/* Sección lateral */}
      <text x={sx} y={vy - 8} fontSize={12} fill="#64748b" fontFamily="Inter, sans-serif">SECCIÓN A-A</text>
      <g>
        <rect x={sx} y={sy} width={sL} height={f.heightMm * sScale} fill="url(#hatch)" stroke={INK} strokeWidth={1.4} />
        {pocket && (
          <rect x={sx + (sL - pocket.lengthMm * sScale) / 2} y={sy - 0.5} width={pocket.lengthMm * sScale} height={(pocket.depthMm / f.heightMm) * (f.heightMm * sScale)} fill="#fff" stroke={INK} strokeWidth={1.2} />
        )}
        <DimV y1={sy} y2={sy + (f.heightMm * sScale)} x={sx + sL} label={`${f.heightMm}`} off={26} />
        {pocket && <DimV y1={sy} y2={sy + (pocket.depthMm / f.heightMm) * (f.heightMm * sScale)} x={sx + (sL - pocket.lengthMm * sScale) / 2} label={`${pocket.depthMm}`} off={-18} />}
      </g>

      {/* Notas */}
      {hlRect('notes', 40, 600, 590, 150)}
      <text x={40} y={616} fontSize={13} fontWeight={700} fill={INK} fontFamily="Inter, sans-serif">NOTAS</text>
      {spec.notes.map((n, i) => (
        <text key={i} x={40} y={640 + i * 22} fontSize={13} fill={INK} fontFamily="Inter, sans-serif">{`${i + 1}. ${n}`}</text>
      ))}

      {/* Tabla de revisiones */}
      {hlRect('tb.revisionTable', 803, 36, 290, 22 + spec.revisionHistory.length * 20)}
      <g fontFamily="Inter, sans-serif" fontSize={11.5}>
        <rect x={803} y={36} width={290} height={22 + spec.revisionHistory.length * 20} fill="none" stroke={INK} strokeWidth={0.8} />
        <text x={811} y={52} fontWeight={700} fill={INK}>REV · FECHA · DESCRIPCIÓN</text>
        {spec.revisionHistory.map((r, i) => (
          <text key={r.rev} x={811} y={72 + i * 20} fill={r.rev === spec.revision ? INK : '#64748b'} fontWeight={r.rev === spec.revision ? 600 : 400}>{`${r.rev} · ${dateEs(r.date)} · ${r.text}`}</text>
        ))}
      </g>

      {/* Cajetín */}
      <g fontFamily="Inter, sans-serif">
        <rect x={tbx} y={tby} width={tbw} height={tbRows.length * rowH + rowH * 2} fill="#fff" stroke={INK} strokeWidth={1.4} />
        {tbRows.map(([id, k, v], i) => (
          <g key={id}>
            {hlRect(id, tbx + 2, tby + i * rowH + 2, tbw - 4, rowH - 4)}
            <line x1={tbx} y1={tby + (i + 1) * rowH} x2={tbx + tbw} y2={tby + (i + 1) * rowH} stroke={INK} strokeWidth={0.6} />
            <text x={tbx + 8} y={tby + i * rowH + 16} fontSize={10.5} fill="#64748b">{k}</text>
            <text x={tbx + 120} y={tby + i * rowH + 16.5} fontSize={13} fontWeight={600} fill={INK}>{v}</text>
          </g>
        ))}
        <line x1={tbx + 120 - 8} y1={tby} x2={tbx + 120 - 8} y2={tby + tbRows.length * rowH} stroke={INK} strokeWidth={0.6} />
        {(() => {
          const y = tby + tbRows.length * rowH;
          const cells: [string, string, string, number][] = [['tb.revision', 'REV', spec.revision, 70], ['tb.date', 'FECHA', dateEs(spec.revisionDate), 110], ['tb.scale', 'ESCALA', spec.scale, 80], ['tb.drawn', 'DIBUJADO', 'Of. técnica', 170]];
          let x = tbx;
          return cells.map(([id, k, v, w]) => {
            const el = (
              <g key={id}>
                {hlRect(id, x + 2, y + 2, w - 4, rowH * 2 - 4)}
                <rect x={x} y={y} width={w} height={rowH * 2} fill="none" stroke={INK} strokeWidth={0.6} />
                <text x={x + 8} y={y + 15} fontSize={10.5} fill="#64748b">{k}</text>
                <text x={x + 8} y={y + 37} fontSize={id === 'tb.revision' ? 18 : 13} fontWeight={700} fill={INK}>{v}</text>
              </g>
            );
            x += w;
            return el;
          });
        })()}
      </g>
    </svg>
  );
}
