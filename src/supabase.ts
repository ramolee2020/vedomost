import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SyncClient } from './sync';

const URL = import.meta.env.VITE_SUPABASE_URL as string;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const makeClient = (code: string) =>
  createClient(URL, KEY, { auth: { persistSession: false }, global: { headers: { 'x-club-code': code } } });

export async function checkCode(code: string) {
  const { data, error } = await makeClient(code).rpc('club_ok');
  if (error) throw error;
  return data === true;
}

export const toSyncClient = (c: SupabaseClient): SyncClient => ({
  upsert: async (t, rows) => ({ error: (await c.from(t).upsert(rows)).error }),
  selectAll: async t => {
    const r = await c.from(t).select('*');
    // numeric из PostgREST может прийти строкой
    const data = t === 'results' ? r.data?.map(x => ({ ...x, value: x.value === null ? null : Number(x.value) })) ?? null : r.data;
    return { data, error: r.error };
  },
});
