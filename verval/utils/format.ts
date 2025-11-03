// src/utils/format.ts
export type Periodo = 'hoje' | '7d' | '30d' | 'mtd';

export function toneByValue(v?: number | null, { invert = false }: { invert?: boolean } = {}) {
  const n = Number(v ?? 0);
  const pos = n > 0;
  const neg = n < 0;
  const good = invert ? neg : pos;
  const bad  = invert ? pos : neg;
  if (good) return { text: '#059669', bg: '#ECFDF5', border: '#A7F3D0', icon: '#10B981' };
  if (bad)  return { text: '#E11D48', bg: '#FEF2F2', border: '#FECACA', icon: '#F43F5E' };
  return { text: '#111827', bg: '#F3F4F6', border: '#E5E7EB', icon: '#6B7280' };
}

export function currency(n: number, locale: string, code: string) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(Number(n || 0));
}

export function short(n: number) {
  return n >= 1_000_000_000 ? `${(n / 1_000_000_000).toFixed(1)}B`
    : n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
    : String(Math.round(n));
}

export function mapPeriodo(p: Periodo) {
  const d = new Date();
  const toIso = (dt: Date) =>
    new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()).toISOString().slice(0, 10);
  if (p === 'hoje') { const x = toIso(d); return { inicio: x, fim: x }; }
  if (p === '7d') { const start = new Date(d); start.setDate(start.getDate() - 6); return { inicio: toIso(start), fim: toIso(d) }; }
  if (p === '30d') { const start = new Date(d); start.setDate(start.getDate() - 29); return { inicio: toIso(start), fim: toIso(d) }; }
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  return { inicio: toIso(start), fim: toIso(d) };
}
