import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SyncClient } from './sync';

const URL = import.meta.env.VITE_SUPABASE_URL as string;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Таблицы живут в общем проекте Supabase (вместе с OBIDAN), поэтому у них префикс ved_
const TABLE_PREFIX = 'ved_';

export const makeClient = (code: string) =>
  createClient(URL, KEY, { auth: { persistSession: false }, global: { headers: { 'x-club-code': code } } });

export async function checkCode(code: string) {
  const { data, error } = await makeClient(code).rpc('ved_club_ok');
  if (error) throw error;
  return data === true;
}

export const toSyncClient = (c: SupabaseClient): SyncClient => ({
  upsert: async (t, rows) => ({ error: (await c.from(TABLE_PREFIX + t).upsert(rows)).error }),
  selectAll: async t => {
    const r = await c.from(TABLE_PREFIX + t).select('*');
    // numeric из PostgREST может прийти строкой
    const data = t === 'results' ? r.data?.map(x => ({ ...x, value: x.value === null ? null : Number(x.value) })) ?? null : r.data;
    return { data, error: r.error };
  },
});
