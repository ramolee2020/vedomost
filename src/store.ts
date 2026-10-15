import { get, set } from 'idb-keyval';
import type { PendingOp, Rows, Snapshot, TableName } from './types';
import { mergeRows } from './merge';

export interface Persist {
  load(): Promise<{ snapshot: Snapshot; pending: PendingOp[] } | undefined>;
  save(data: { snapshot: Snapshot; pending: PendingOp[] }): Promise<void>;
}
export const TABLES: TableName[] = ['groups', 'exercises', 'athletes', 'sessions', 'results'];
export const emptySnapshot = (): Snapshot => ({ groups: {}, exercises: {}, athletes: {}, sessions: {}, results: {} });
export const idbPersist: Persist = { load: () => get('vedomost-v1'), save: d => set('vedomost-v1', d) };

/** Локальный источник истины: снимок всех таблиц + очередь неотправленных строк. */
export class Store {
  snapshot: Snapshot = emptySnapshot();
  pending: PendingOp[] = [];
  version = 0;
  private listeners = new Set<() => void>();
  private saving: Promise<void> = Promise.resolve();
  constructor(private persist: Persist) {}

  async load() {
    const d = await this.persist.load();
    if (d) { this.snapshot = { ...emptySnapshot(), ...d.snapshot }; this.pending = d.pending; }
    this.changed(false);
  }
  put<K extends TableName>(table: K, row: Omit<Rows[K], 'updated_at'>) {
    const full = { ...row, updated_at: new Date().toISOString() } as Rows[K];
    (this.snapshot as any)[table] = { ...this.snapshot[table], [full.id]: full };
    if (!this.pending.some(p => p.table === table && p.id === full.id)) this.pending = [...this.pending, { table, id: full.id }];
    this.changed();
  }
  applyRemote(table: TableName, rows: any[]) {
    const ids = new Set(this.pending.filter(p => p.table === table).map(p => p.id));
    (this.snapshot as any)[table] = mergeRows(this.snapshot[table] as any, rows, ids);
    this.changed();
  }
  clearPending(ops: PendingOp[]) {
    this.pending = this.pending.filter(p => !ops.some(o => o.table === p.table && o.id === p.id));
    this.changed();
  }
  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  flush() { return this.saving; }
  private changed(save = true) {
    this.version++;
    if (save) {
      const data = { snapshot: this.snapshot, pending: this.pending };
      this.saving = this.saving.then(() => this.persist.save(data)).catch(() => {});
    }
    this.listeners.forEach(f => f());
  }
}
