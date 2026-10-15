export function parseValue(s: string): number | null {
  const t = s.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export const formatValue = (v: number | null) => (v === null ? '' : String(v).replace('.', ','));

export type Trend = 'up' | 'down' | 'same' | null;

export function progressLine(values: (number | null)[]): { text: string; trend: Trend } {
  const vs = values.filter((v): v is number => v !== null);
  if (vs.length === 0) return { text: '—', trend: null };
  const text = vs.map(formatValue).join(' → ');
  if (vs.length === 1) return { text, trend: null };
  const d = vs[vs.length - 1] - vs[0];
  return { text, trend: d > 0 ? 'up' : d < 0 ? 'down' : 'same' };
}
