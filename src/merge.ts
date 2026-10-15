/** Подмешивает удалённые строки: побеждает более поздний updated_at, неотправленные локальные правки не трогаются. */
export function mergeRows<T extends { id: string; updated_at: string }>(local: Record<string, T>, remote: T[], pendingIds: Set<string>) {
  const out = { ...local };
  for (const r of remote) {
    if (pendingIds.has(r.id)) continue;
    const l = out[r.id];
    if (!l || Date.parse(r.updated_at) > Date.parse(l.updated_at)) out[r.id] = r;
  }
  return out;
}
