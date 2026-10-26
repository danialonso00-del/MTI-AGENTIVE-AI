// Recorridos declarativos: cada caso de uso es datos (escenas + visual). El mismo motor los anima.
import type { CloudDoc } from './BrainCloud';

export type Tone = 'ok' | 'warn' | 'err' | 'info' | 'gold' | null;
export type Fmt = 'eur' | 'min' | 'pct' | 'num' | 'kwh' | 'h' | 'km' | 'kg';

export type FlowVisual =
  | { kind: 'inbound'; channel: 'email' | 'whatsapp' | 'call' | 'iot' | 'form' | 'erp' | 'portal' | 'system'; from: string; subject: string; body: string; meta?: string[]; logo?: string }
  | { kind: 'read'; window: string; docTitle: string; text: string; marks: { needle: string; label: string; value: string; tone?: Tone }[] }
  | { kind: 'call'; window: string; caller: string; labels?: { cliente: string; agente: string }; lines: { who: 'cliente' | 'agente'; text: string }[]; fields: { label: string; value: string }[]; handoff?: string; privacy?: string }
  | { kind: 'cloud'; center: string; centerSub: string; query: string; docs: CloudDoc[]; selected: string[]; rejected: { id: string; reason: string }[]; selectedTitle: string; footer?: string }
  | { kind: 'pipeline'; stages: { name: string; agent: string; output: string }[] }
  | { kind: 'table'; window: string; columns: string[]; rows: (string | number)[][]; tones?: Tone[]; totals?: { label: string; value: string }[]; note?: string }
  | { kind: 'bars'; title: string; bars: { label: string; value: number; compare?: number }[]; compareLabel?: string; valueLabel?: string; format: Fmt; headline?: { label: string; value: number; format: Fmt; sub?: string }; note?: string }
  | { kind: 'plan'; title: string; horizon: number; unit: string; ticks?: string[]; lanes: string[]; before: PlanTask[]; after?: PlanTask[]; switchAt?: number; note?: string; afterNote?: string }
  | { kind: 'route'; title: string; depot: { x: number; y: number; label: string }; stops: { x: number; y: number; label: string; kg: number }[]; routes: { vehicle: string; order: number[]; km: number; kg: number; capacity: number }[]; baselineKm: number; packing?: { truck: string; boxes: { label: string; w: number; h: number }[]; widthCm: number; lengthCm: number } }
  | { kind: 'audio'; window: string; levels: number[]; segmentS: number; incidents: { at: number; len: number; label: string; tone: Tone }[] }
  | { kind: 'decision'; title: string; checks: { level: 'ok' | 'warning' | 'error'; text: string }[]; stamp: string; stampSub: string; by: string }
  | { kind: 'output'; window: string; logo?: string; recordTitle: string; badge?: string; fields: [string, string][]; lines?: { columns: string[]; rows: string[][] }; side?: { title: string; text: string }; final?: string };

export interface PlanTask { lane: string; label: string; start: number; end: number; late?: boolean; urgent?: boolean }

export interface FlowStep {
  id: string; section: string; title: string; narration: string; agents: string[]; /** Si se omite se calcula a partir del visual. */ duration?: number; visual: FlowVisual;
  where?: { label: string; to: string };
}

export interface Flow {
  id: string; title: string; subtitle: string; reference: string;
  steps: FlowStep[];
  finale?: { label: string; to: string }[];
}
