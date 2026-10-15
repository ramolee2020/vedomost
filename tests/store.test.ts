import { describe, it, expect } from 'vitest';
import { Store, type Persist } from '../src/store';
import { mergeRows } from '../src/merge';

const memPersist = (): Persist & { data?: any } => {
  const p: any = { data: undefined };
  p.load = async () => p.data && structuredClone(p.data);
  p.save = async (d: any) => { p.data = structuredClone(d); };
  return p;
};

describe('Store', () => {
  it('put sets updated_at, queues op and persists; survives reload', async () => {
    const persist = memPersist();
    const s = new Store(persist);
    await s.load();
    s.put('results', { id: 'r1', session_id: 's', athlete_id: 'a', exercise_id: 'e', value: 0, updated_by: 'Рамиль' });
    await s.flush();
    const s2 = new Store(persist);
    await s2.load();
    expect(s2.snapshot.results.r1.value).toBe(0);
    expect(s2.pending).toEqual([{ table: 'results', id: 'r1' }]);
    expect(s2.snapshot.results.r1.updated_at).toMatch(/^\d{4}-/);
  });
  it('does not duplicate pending op for the same row', async () => {
    const s = new Store(memPersist()); await s.load();
    s.put('groups', { id: 'g', name: 'A', sort: 1 });
    s.put('groups', { id: 'g', name: 'B', sort: 1 });
    expect(s.pending).toHaveLength(1);
  });
});

describe('mergeRows', () => {
  const row = (id: string, t: string, v: number) => ({ id, updated_at: t, v });
  it('newer remote wins, older remote ignored', () => {
    const local = { a: row('a', '2026-10-01T00:00:00Z', 1), b: row('b', '2026-10-05T00:00:00Z', 1) };
    const out = mergeRows(local, [row('a', '2026-10-02T00:00:00Z', 2), row('b', '2026-10-03T00:00:00Z', 2), row('c', '2026-10-01T00:00:00Z', 3)], new Set());
    expect(out.a.v).toBe(2); expect(out.b.v).toBe(1); expect(out.c.v).toBe(3);
  });
  it('pending local row never overwritten', () => {
    const out = mergeRows({ a: row('a', '2026-10-01T00:00:00Z', 1) }, [row('a', '2026-10-09T00:00:00Z', 2)], new Set(['a']));
    expect(out.a.v).toBe(1);
  });
  it('compares timestamps by time, not by string format', () => {
    const out = mergeRows({ a: row('a', '2026-10-01T10:00:00.000Z', 1) }, [row('a', '2026-10-01T12:00:00+00:00', 2)], new Set());
    expect(out.a.v).toBe(2);
  });
});
