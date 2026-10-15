import type { TableName } from './types';
import { Store, TABLES } from './store';

export interface SyncClient {
  upsert(table: TableName, rows: object[]): Promise<{ error: unknown }>;
  selectAll(table: TableName): Promise<{ data: object[] | null; error: unknown }>;
}

/** Отправляет очередь, затем подтягивает все таблицы. Бросает ошибку, если сети нет. */
export async function syncOnce(store: Store, client: SyncClient) {
  for (const table of TABLES) {
    const ops = store.pending.filter(p => p.table === table);
    if (!ops.length) continue;
    const rows = ops.map(o => (store.snapshot[table] as any)[o.id]).filter(Boolean);
    const sent = new Map(rows.map((r: any) => [r.id, r.updated_at]));
    const { error } = await client.upsert(table, rows);
    if (error) throw error;
    // строку, изменённую во время отправки, оставляем в очереди
    store.clearPending(ops.filter(o => (store.snapshot[table] as any)[o.id]?.updated_at === sent.get(o.id)));
  }
  for (const table of TABLES) {
    const { data, error } = await client.selectAll(table);
    if (error) throw error;
    store.applyRemote(table, data ?? []);
  }
}
