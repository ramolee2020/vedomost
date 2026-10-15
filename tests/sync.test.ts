import { describe, it, expect } from 'vitest';
import { Store, type Persist } from '../src/store';
import { syncOnce } from '../src/sync';

const persist: Persist = { load: async () => undefined, save: async () => {} };

describe('syncOnce', () => {
  it('pushes pending then pulls remote; clears pending only on success', async () => {
    const s = new Store(persist); await s.load();
    s.put('groups', { id: 'g1', name: 'Мои', sort: 1 });
    const pushed: any[] = [];
    const ok = {
      upsert: async (t: string, rows: object[]) => { pushed.push([t, rows]); return { error: null }; },
      selectAll: async (t: string) => ({ data: t === 'groups' ? [{ id: 'g2', name: 'Чужая', sort: 2, updated_at: '2026-10-10T00:00:00Z' }] : [], error: null }),
    };
    await syncOnce(s, ok);
    expect(pushed[0][0]).toBe('groups');
    expect(s.pending).toEqual([]);
    expect(s.snapshot.groups.g2.name).toBe('Чужая');
  });
  it('keeps pending when push fails (offline)', async () => {
    const s = new Store(persist); await s.load();
    s.put('groups', { id: 'g1', name: 'Мои', sort: 1 });
    const bad = { upsert: async () => ({ error: new Error('offline') }), selectAll: async () => ({ data: null, error: new Error('offline') }) };
    await expect(syncOnce(s, bad)).rejects.toThrow();
    expect(s.pending).toHaveLength(1);
  });
  it('keeps pending if row was edited during push', async () => {
    const s = new Store(persist); await s.load();
    s.put('groups', { id: 'g1', name: 'A', sort: 1 });
    const client = {
      upsert: async () => { await new Promise(r => setTimeout(r, 5)); s.put('groups', { id: 'g1', name: 'B', sort: 1 }); return { error: null }; },
      selectAll: async () => ({ data: [], error: null }),
    };
    await syncOnce(s, client);
    expect(s.pending).toEqual([{ table: 'groups', id: 'g1' }]);
  });
});
