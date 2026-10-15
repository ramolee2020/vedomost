# Приложение «Ведомость нормативов»: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** PWA для iPhone. Два тренера ведут ведомость сдачи нормативов ОФП: фамилии вводят диктовкой, результаты кнопками, смотрят прогресс ребёнка и выгружают ведомость в Word.

**Architecture:** Vite + React + TypeScript, одна страница, без роутера (экраны переключаются состоянием). Источник истины на устройстве — локальный стор (снимок в IndexedDB плюс очередь неотправленных изменений). Модуль sync пушит очередь в Supabase и подтягивает остальные изменения по `updated_at`. Доступ к Supabase по anon key и заголовку `x-club-code`, который проверяет RLS. Хостинг: GitHub Pages.

**Tech Stack:** Vite 5, React 18, TypeScript, vitest, `@supabase/supabase-js@2`, `idb-keyval`, `docx`, `vite-plugin-pwa`.

**Spec:** `docs/specs/2026-10-15-vedomost-app-design.md`

## Global Constraints

- Весь текст интерфейса на русском.
- Целевая платформа: iPhone Safari и PWA «На экран Домой». Ширина экрана от 375 px, кнопки не меньше 48 px по высоте.
- Оценок нет. Результат — число или пусто. Пусто значит «не сдавал», это не 0.
- Удаление только мягкое: флаг `deleted` (нужно для синхронизации).
- Все видят всё. Вход по общему коду клуба и имени тренера, ввод один раз на устройстве.
- Работа без сети: любая правка сначала сохраняется локально.
- Порядок упражнений и детей: упражнения по `sort`, дети по алфавиту (`localeCompare` с локалью `ru`).

## Review Focus

1. Продиктованный текст без запятых («Иванов Петя Сидорова Маша») не должен молча превращаться в одного ребёнка. Предпросмотр показывает список, и его можно править до сохранения (тест в Task 2 и UI в Task 6).
2. Ввод «0» обязан сохраниться как 0, а стёртое поле — как `null` (тест в Task 3).
3. Приложение закрыли без сети, потом открыли с сетью: очередь не теряется и отправляется (тест в Task 4).
4. Два тренера правят одну и ту же ячейку: побеждает более позднее `updated_at`, а локальная неотправленная правка не затирается при подтягивании данных (тест в Task 4).
5. Десятичные числа с запятой («1,20» м) парсятся как 1.2 (тест в Task 3).

---

## Файлы

```
vedomost-app/
  package.json, vite.config.ts, tsconfig.json, index.html
  public/icon-192.png, public/icon-512.png
  supabase/schema.sql          — таблицы, RLS, функция club_ok, сид групп
  src/types.ts                 — типы данных
  src/names.ts                 — parseNames (диктовка → список)
  src/values.ts                — parseValue, formatValue, progressLine
  src/store.ts                 — локальный стор + очередь
  src/merge.ts                 — слияние удалённых строк с локальными
  src/sync.ts                  — push/pull с Supabase
  src/supabase.ts              — создание клиента по коду
  src/exportDocx.ts            — сборка .docx ведомости
  src/useStore.ts              — React-хук подписки на стор
  src/App.tsx                  — переключение экранов
  src/screens/Login.tsx, Groups.tsx, GroupView.tsx, AddAthletes.tsx,
              SessionEntry.tsx, SessionTable.tsx, AthleteProgress.tsx
  src/styles.css
  tests/*.test.ts
  .github/workflows/deploy.yml
```

---

### Task 1: Каркас проекта, PWA, деплой

**Files:**
- Create: весь каркас (см. ниже), `.github/workflows/deploy.yml`, `src/types.ts`

**Interfaces:**
- Produces: `src/types.ts`

- [ ] **Step 1: Создать проект**

```bash
cd C:/claude-work/vedomost-app && git init -b main
npm create vite@5 . -- --template react-ts   # в непустой папке ответить «Ignore files and continue»
npm i @supabase/supabase-js@2 idb-keyval docx
npm i -D vitest vite-plugin-pwa
```

- [ ] **Step 2: vite.config.ts**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/vedomost/',
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    manifest: {
      name: 'Ведомость нормативов', short_name: 'Ведомость', lang: 'ru',
      start_url: '/vedomost/', display: 'standalone', background_color: '#ffffff', theme_color: '#1d4ed8',
      icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }],
    },
  })],
  test: { environment: 'node' },
});
```

В `package.json` scripts добавить `"test": "vitest run"`. Иконки сгенерировать скриптом Python (синий квадрат, белые буквы «ОФП»):

```bash
python -c "
from PIL import Image, ImageDraw, ImageFont
for s in (192,512):
    im=Image.new('RGB',(s,s),'#1d4ed8'); d=ImageDraw.Draw(im)
    f=ImageFont.truetype('arialbd.ttf', s//4); t='ОФП'
    w,h=d.textbbox((0,0),t,font=f)[2:]; d.text(((s-w)/2,(s-h)/2),t,fill='white',font=f)
    im.save(f'public/icon-{s}.png')"
```

- [ ] **Step 3: src/types.ts**

```ts
export type Unit = 'раз' | 'см' | 'м' | 'сек' | 'мин';
interface Base { id: string; updated_at: string; deleted?: boolean }
export interface Group extends Base { name: string; sort: number }
export interface Exercise extends Base { group_id: string; name: string; unit: Unit; sort: number }
export interface Athlete extends Base { group_id: string; full_name: string }
export interface Session extends Base { group_id: string; date: string /* YYYY-MM-DD */ }
export interface Result extends Base { session_id: string; athlete_id: string; exercise_id: string; value: number | null; updated_by: string }
export type TableName = 'groups' | 'exercises' | 'athletes' | 'sessions' | 'results';
export interface Rows { groups: Group; exercises: Exercise; athletes: Athlete; sessions: Session; results: Result }
export type Snapshot = { [K in TableName]: Record<string, Rows[K]> };
export interface PendingOp { table: TableName; id: string }
export const resultId = (s: string, a: string, e: string) => `${s}:${a}:${e}`;
```

- [ ] **Step 4: .github/workflows/deploy.yml**

```yaml
name: deploy
on: { push: { branches: [main] }, workflow_dispatch: {} }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci && npm test && npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
      - uses: actions/deploy-pages@v4
```

- [ ] **Step 5: Проверка:** `npm run build` проходит. Commit `chore: scaffold vite pwa`.

---

### Task 2: Разбор продиктованных фамилий

**Files:** Create `src/names.ts`, `tests/names.test.ts`

**Interfaces:** Produces `parseNames(text: string): string[]`

- [ ] **Step 1: Тест**

```ts
import { describe, it, expect } from 'vitest';
import { parseNames } from '../src/names';

describe('parseNames', () => {
  it('splits by commas and newlines', () => {
    expect(parseNames('иванов петя, Сидорова Маша\nПетров Коля')).toEqual(['Иванов Петя', 'Сидорова Маша', 'Петров Коля']);
  });
  it('splits by sentence dots that iOS dictation inserts', () => {
    expect(parseNames('Иванов Петя. Сидорова Маша.')).toEqual(['Иванов Петя', 'Сидорова Маша']);
  });
  it('drops empties, trims, collapses spaces, dedupes', () => {
    expect(parseNames(' ,  Иванов   Петя ,, иванов петя ')).toEqual(['Иванов Петя']);
  });
  it('keeps text without separators as one entry for manual fixing', () => {
    expect(parseNames('Иванов Петя Сидорова Маша')).toEqual(['Иванов Петя Сидорова Маша']);
  });
  it('keeps hyphenated names capitalised', () => {
    expect(parseNames('мамина-сибиряк анна')).toEqual(['Мамина-Сибиряк Анна']);
  });
});
```

- [ ] **Step 2:** `npx vitest run tests/names.test.ts` → FAIL (модуля нет).

- [ ] **Step 3: Реализация**

```ts
const cap = (w: string) => w.split('-').map(p => p ? p[0].toLocaleUpperCase('ru') + p.slice(1).toLocaleLowerCase('ru') : p).join('-');

export function parseNames(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[\n,;]+|\.(?:\s+|$)/)) {
    const name = raw.replace(/[.!?]+$/, '').replace(/\s+/g, ' ').trim();
    if (name.length < 2) continue;
    const pretty = name.split(' ').map(cap).join(' ');
    const key = pretty.toLocaleLowerCase('ru');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(pretty);
  }
  return out;
}
```

- [ ] **Step 4:** тест PASS. Commit `feat: parse dictated names`.

---

### Task 3: Значения и прогресс

**Files:** Create `src/values.ts`, `tests/values.test.ts`

**Interfaces:** Produces `parseValue(s: string): number | null`, `formatValue(v: number | null): string`, `progressLine(values: (number | null)[]): { text: string; trend: 'up' | 'down' | 'same' | null }`

- [ ] **Step 1: Тест**

```ts
import { describe, it, expect } from 'vitest';
import { parseValue, formatValue, progressLine } from '../src/values';

describe('values', () => {
  it('parses comma decimals, zero and empty', () => {
    expect(parseValue('1,20')).toBe(1.2);
    expect(parseValue('0')).toBe(0);
    expect(parseValue('')).toBeNull();
    expect(parseValue('  ')).toBeNull();
    expect(parseValue('abc')).toBeNull();
  });
  it('formats with comma and empty for null', () => {
    expect(formatValue(1.2)).toBe('1,2');
    expect(formatValue(15)).toBe('15');
    expect(formatValue(null)).toBe('');
  });
  it('builds progress line skipping gaps', () => {
    expect(progressLine([8, null, 12, 15])).toEqual({ text: '8 → 12 → 15', trend: 'up' });
    expect(progressLine([15, 12])).toEqual({ text: '15 → 12', trend: 'down' });
    expect(progressLine([10])).toEqual({ text: '10', trend: null });
    expect(progressLine([null])).toEqual({ text: '—', trend: null });
    expect(progressLine([5, 5])).toEqual({ text: '5 → 5', trend: 'same' });
  });
});
```

- [ ] **Step 2:** FAIL.

- [ ] **Step 3: Реализация**

```ts
export function parseValue(s: string): number | null {
  const t = s.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export const formatValue = (v: number | null) => (v === null ? '' : String(v).replace('.', ','));

export function progressLine(values: (number | null)[]) {
  const vs = values.filter((v): v is number => v !== null);
  if (vs.length === 0) return { text: '—', trend: null };
  const text = vs.map(formatValue).join(' → ');
  if (vs.length === 1) return { text, trend: null };
  const d = vs[vs.length - 1] - vs[0];
  return { text, trend: d > 0 ? 'up' : d < 0 ? 'down' : 'same' } as const;
}
```

- [ ] **Step 4:** PASS. Commit `feat: value parsing and progress`.

---

### Task 4: Локальный стор, очередь, слияние, синхронизация

**Files:** Create `src/merge.ts`, `src/store.ts`, `src/sync.ts`, `tests/store.test.ts`, `tests/sync.test.ts`

**Interfaces:**
- Consumes: `types.ts`
- Produces:
  - `mergeRows<T extends {id:string;updated_at:string}>(local: Record<string,T>, remote: T[], pendingIds: Set<string>): Record<string,T>`
  - `class Store { constructor(persist: Persist); load(): Promise<void>; snapshot: Snapshot; pending: PendingOp[]; put<K extends TableName>(table: K, row: Omit<Rows[K],'updated_at'>): void; applyRemote(table: TableName, rows: any[]): void; clearPending(ops: PendingOp[]): void; subscribe(fn: () => void): () => void; version: number }`
  - `interface Persist { load(): Promise<{snapshot: Snapshot; pending: PendingOp[]} | undefined>; save(data: {snapshot: Snapshot; pending: PendingOp[]}): Promise<void> }`
  - `idbPersist: Persist` (idb-keyval, ключ `vedomost-v1`)
  - `syncOnce(store: Store, client: SyncClient): Promise<void>`, где `SyncClient = { upsert(table: TableName, rows: object[]): Promise<{ error: unknown }>; selectAll(table: TableName): Promise<{ data: object[] | null; error: unknown }> }`
  - `emptySnapshot(): Snapshot`

- [ ] **Step 1: Тесты**

```ts
// tests/store.test.ts
import { describe, it, expect } from 'vitest';
import { Store, emptySnapshot, type Persist } from '../src/store';
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
});
```

```ts
// tests/sync.test.ts
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
});
```

- [ ] **Step 2:** `npx vitest run` → FAIL.

- [ ] **Step 3: Реализация**

```ts
// src/merge.ts
export function mergeRows<T extends { id: string; updated_at: string }>(local: Record<string, T>, remote: T[], pendingIds: Set<string>) {
  const out = { ...local };
  for (const r of remote) {
    if (pendingIds.has(r.id)) continue;
    const l = out[r.id];
    if (!l || r.updated_at > l.updated_at) out[r.id] = r;
  }
  return out;
}
```

```ts
// src/store.ts
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
    if (save) { const data = { snapshot: this.snapshot, pending: this.pending }; this.saving = this.saving.then(() => this.persist.save(data)); }
    this.listeners.forEach(f => f());
  }
}
```

Замечание по `clearPending`: строку, которую изменили во время push, нельзя потерять. Поэтому в `syncOnce` очищаются только операции, у которых `updated_at` строки не изменился с момента отправки:

```ts
// src/sync.ts
import type { PendingOp, TableName } from './types';
import { Store, TABLES } from './store';

export interface SyncClient {
  upsert(table: TableName, rows: object[]): Promise<{ error: unknown }>;
  selectAll(table: TableName): Promise<{ data: object[] | null; error: unknown }>;
}

export async function syncOnce(store: Store, client: SyncClient) {
  for (const table of TABLES) {
    const ops = store.pending.filter(p => p.table === table);
    if (!ops.length) continue;
    const rows = ops.map(o => (store.snapshot[table] as any)[o.id]).filter(Boolean);
    const sent = new Map(rows.map((r: any) => [r.id, r.updated_at]));
    const { error } = await client.upsert(table, rows);
    if (error) throw error;
    store.clearPending(ops.filter((o: PendingOp) => (store.snapshot[table] as any)[o.id]?.updated_at === sent.get(o.id)));
  }
  for (const table of TABLES) {
    const { data, error } = await client.selectAll(table);
    if (error) throw error;
    store.applyRemote(table, data ?? []);
  }
}
```

- [ ] **Step 4:** все тесты PASS. Commit `feat: offline store and sync`.

---

### Task 5: Supabase (схема, RLS, сид) и клиент

**Files:** Create `supabase/schema.sql`, `src/supabase.ts`

**Interfaces:**
- Produces: `makeClient(code: string): SupabaseClient`, `checkCode(code: string): Promise<boolean>`, `toSyncClient(c: SupabaseClient): SyncClient`

- [ ] **Step 1: supabase/schema.sql**

```sql
create extension if not exists pgcrypto with schema extensions;

create table if not exists app_secret (id int primary key default 1, code_hash text not null);
alter table app_secret enable row level security;   -- без политик: anon не видит

create or replace function club_ok() returns boolean
language sql stable security definer set search_path = public, extensions as $$
  select exists (select 1 from app_secret where code_hash =
    encode(digest(coalesce(current_setting('request.headers', true)::json->>'x-club-code', ''), 'sha256'), 'hex'))
$$;
grant execute on function club_ok() to anon;

create table if not exists groups    (id text primary key, name text not null, sort int not null default 0, updated_at timestamptz not null, deleted boolean not null default false);
create table if not exists exercises (id text primary key, group_id text not null, name text not null, unit text not null, sort int not null default 0, updated_at timestamptz not null, deleted boolean not null default false);
create table if not exists athletes  (id text primary key, group_id text not null, full_name text not null, updated_at timestamptz not null, deleted boolean not null default false);
create table if not exists sessions  (id text primary key, group_id text not null, date date not null, updated_at timestamptz not null, deleted boolean not null default false);
create table if not exists results   (id text primary key, session_id text not null, athlete_id text not null, exercise_id text not null, value numeric, updated_by text not null default '', updated_at timestamptz not null, deleted boolean not null default false);

do $$ declare t text; begin
  foreach t in array array['groups','exercises','athletes','sessions','results'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists club on %I', t);
    execute format('create policy club on %I for all to anon using (club_ok()) with check (club_ok())', t);
    execute format('grant select, insert, update on %I to anon', t);
  end loop; end $$;

-- сид: 3 группы и упражнения из бумажного плана
insert into groups values
 ('g45','4,5–5,5 лет',1,now(),false),('g67','6–7 лет',2,now(),false),('g89','8–9 лет',3,now(),false)
on conflict do nothing;
insert into exercises values
 ('g45-1','g45','Отжимания от пола','раз',1,now(),false),('g45-2','g45','Прыжок в длину с места','м',2,now(),false),
 ('g45-3','g45','Вис на кимоно','сек',3,now(),false),('g45-4','g45','Пресс лёжа на полу','раз',4,now(),false),
 ('g67-1','g67','Отжимания','раз',1,now(),false),('g67-2','g67','Прыжок в длину с места','м',2,now(),false),
 ('g67-3','g67','Подтягивание на кимоно','раз',3,now(),false),('g67-4','g67','Пресс в висе','раз',4,now(),false),
 ('g67-5','g67','Стойка на руках','сек',5,now(),false),('g67-6','g67','Столб','сек',6,now(),false),
 ('g89-1','g89','Отжимания (кулаки)','раз',1,now(),false),('g89-2','g89','Отжимания (пальцы)','раз',2,now(),false),
 ('g89-3','g89','Прыжок в длину с места','м',3,now(),false),('g89-4','g89','Подтягивание на кимоно','раз',4,now(),false),
 ('g89-5','g89','Пресс в висе','раз',5,now(),false),('g89-6','g89','Канат','раз',6,now(),false),
 ('g89-7','g89','Спина','раз',7,now(),false),('g89-8','g89','Пистолетики','раз',8,now(),false)
on conflict do nothing;
-- код клуба задаётся отдельно (не в репозитории):
-- insert into app_secret values (1, encode(extensions.digest('<КОД>','sha256'),'hex')) on conflict (id) do update set code_hash = excluded.code_hash;
```

- [ ] **Step 2: src/supabase.ts**

```ts
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
  selectAll: async t => { const r = await c.from(t).select('*'); return { data: r.data, error: r.error }; },
});
```

`numeric` в PostgREST приходит числом; если придёт строкой, `applyRemote` для results приводит `value` через `Number`. Добавить в `toSyncClient.selectAll` для `results`: `data?.map(r => ({ ...r, value: r.value === null ? null : Number(r.value) }))`.

- [ ] **Step 3: Проверка:** `npx tsc --noEmit` без ошибок. Commit `feat: supabase schema and client`.

---

### Task 6: Экраны: вход, группы, группа, добавление детей

**Files:** Create `src/useStore.ts`, `src/App.tsx`, `src/screens/Login.tsx`, `src/screens/Groups.tsx`, `src/screens/GroupView.tsx`, `src/screens/AddAthletes.tsx`, `src/styles.css`; Modify `src/main.tsx`

**Interfaces:**
- Consumes: `Store`, `idbPersist`, `syncOnce`, `makeClient`, `checkCode`, `toSyncClient`, `parseNames`
- Produces: `useStore(): Store` (перерисовка по `store.version`), тип `Screen` в App: `{name:'groups'} | {name:'group', groupId} | {name:'add', groupId} | {name:'entry', sessionId} | {name:'table', sessionId} | {name:'athlete', athleteId}`

- [ ] **Step 1: useStore + App (инициализация и синхронизация)**

```ts
// src/useStore.ts
import { createContext, useContext, useSyncExternalStore } from 'react';
import type { Store } from './store';
export const StoreCtx = createContext<Store>(null as any);
export function useStore() {
  const s = useContext(StoreCtx);
  useSyncExternalStore(f => s.subscribe(f), () => s.version);
  return s;
}
export const uid = () => crypto.randomUUID();
```

```tsx
// src/App.tsx
import { useEffect, useState } from 'react';
import { Store, idbPersist } from './store';
import { syncOnce } from './sync';
import { makeClient, toSyncClient } from './supabase';
import { StoreCtx } from './useStore';
import Login from './screens/Login';
import Groups from './screens/Groups';
import GroupView from './screens/GroupView';
import AddAthletes from './screens/AddAthletes';
import SessionEntry from './screens/SessionEntry';
import SessionTable from './screens/SessionTable';
import AthleteProgress from './screens/AthleteProgress';

export type Screen =
  | { name: 'groups' } | { name: 'group'; groupId: string } | { name: 'add'; groupId: string }
  | { name: 'entry'; sessionId: string } | { name: 'table'; sessionId: string } | { name: 'athlete'; athleteId: string };
export type Nav = (s: Screen) => void;

const store = new Store(idbPersist);
const getAuth = () => { try { return JSON.parse(localStorage.getItem('auth') || 'null'); } catch { return null; } };

export default function App() {
  const [auth, setAuth] = useState<{ code: string; coach: string } | null>(getAuth);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState<'ok' | 'wait'>('wait');
  const [stack, setStack] = useState<Screen[]>([{ name: 'groups' }]);
  useEffect(() => { store.load().then(() => setReady(true)); }, []);
  useEffect(() => {
    if (!auth || !ready) return;
    const client = toSyncClient(makeClient(auth.code));
    let busy = false;
    const run = async () => {
      if (busy) return; busy = true;
      try { await syncOnce(store, client); setOnline('ok'); } catch { setOnline('wait'); } finally { busy = false; }
    };
    run();
    const unsub = store.subscribe(() => { if (store.pending.length) setTimeout(run, 800); });
    const t = setInterval(run, 30000);
    window.addEventListener('online', run);
    return () => { unsub(); clearInterval(t); window.removeEventListener('online', run); };
  }, [auth, ready]);

  if (!auth) return <Login onDone={a => { localStorage.setItem('auth', JSON.stringify(a)); setAuth(a); }} />;
  if (!ready) return null;
  const screen = stack[stack.length - 1];
  const nav: Nav = s => setStack([...stack, s]);
  const back = () => setStack(stack.length > 1 ? stack.slice(0, -1) : stack);
  const props = { nav, back, coach: auth.coach };
  return (
    <StoreCtx.Provider value={store}>
      <div className={'sync ' + online}>{online === 'ok' && !store.pending.length ? 'Синхронизировано' : 'Ждёт сети — данные сохранены в телефоне'}</div>
      {screen.name === 'groups' && <Groups {...props} />}
      {screen.name === 'group' && <GroupView {...props} groupId={screen.groupId} />}
      {screen.name === 'add' && <AddAthletes {...props} groupId={screen.groupId} />}
      {screen.name === 'entry' && <SessionEntry {...props} sessionId={screen.sessionId} />}
      {screen.name === 'table' && <SessionTable {...props} sessionId={screen.sessionId} />}
      {screen.name === 'athlete' && <AthleteProgress {...props} athleteId={screen.athleteId} />}
    </StoreCtx.Provider>
  );
}
```

- [ ] **Step 2: Login**

```tsx
// src/screens/Login.tsx
import { useState } from 'react';
import { checkCode } from '../supabase';
export default function Login({ onDone }: { onDone: (a: { code: string; coach: string }) => void }) {
  const [code, setCode] = useState(''); const [coach, setCoach] = useState(''); const [err, setErr] = useState('');
  const submit = async () => {
    setErr('');
    try { (await checkCode(code.trim())) ? onDone({ code: code.trim(), coach: coach.trim() }) : setErr('Неверный код клуба'); }
    catch { setErr('Нет связи. Для первого входа нужен интернет.'); }
  };
  return (
    <main className="screen">
      <h1>Ведомость нормативов</h1>
      <label>Код клуба<input value={code} onChange={e => setCode(e.target.value)} autoCapitalize="off" /></label>
      <label>Ваше имя<input value={coach} onChange={e => setCoach(e.target.value)} /></label>
      <button className="big" disabled={!code.trim() || !coach.trim()} onClick={submit}>Войти</button>
      {err && <p className="err">{err}</p>}
    </main>
  );
}
```

- [ ] **Step 3: Groups и GroupView**

```tsx
// src/screens/Groups.tsx
import { useStore, uid } from '../useStore';
import type { Nav } from '../App';
export default function Groups({ nav }: { nav: Nav }) {
  const s = useStore();
  const groups = Object.values(s.snapshot.groups).filter(g => !g.deleted).sort((a, b) => a.sort - b.sort);
  const add = () => { const name = prompt('Название группы'); if (name?.trim()) s.put('groups', { id: uid(), name: name.trim(), sort: groups.length + 1 }); };
  return (
    <main className="screen">
      <h1>Группы</h1>
      {groups.map(g => <button key={g.id} className="row" onClick={() => nav({ name: 'group', groupId: g.id })}>{g.name}</button>)}
      <button className="ghost" onClick={add}>+ Группа</button>
    </main>
  );
}
```

```tsx
// src/screens/GroupView.tsx
import { useStore, uid } from '../useStore';
import type { Nav } from '../App';
import type { Unit } from '../types';
const UNITS: Unit[] = ['раз', 'см', 'м', 'сек', 'мин'];
export default function GroupView({ groupId, nav, back }: { groupId: string; nav: Nav; back: () => void }) {
  const s = useStore(); const snap = s.snapshot;
  const group = snap.groups[groupId];
  const athletes = Object.values(snap.athletes).filter(a => a.group_id === groupId && !a.deleted).sort((a, b) => a.full_name.localeCompare(b.full_name, 'ru'));
  const exercises = Object.values(snap.exercises).filter(e => e.group_id === groupId && !e.deleted).sort((a, b) => a.sort - b.sort);
  const sessions = Object.values(snap.sessions).filter(x => x.group_id === groupId && !x.deleted).sort((a, b) => b.date.localeCompare(a.date));
  const newSession = () => { const id = uid(); s.put('sessions', { id, group_id: groupId, date: new Date().toISOString().slice(0, 10) }); nav({ name: 'entry', sessionId: id }); };
  const addExercise = () => {
    const name = prompt('Название упражнения')?.trim(); if (!name) return;
    const unit = (prompt('Единица: ' + UNITS.join(', '), 'раз')?.trim() || 'раз') as Unit;
    s.put('exercises', { id: uid(), group_id: groupId, name, unit: UNITS.includes(unit) ? unit : 'раз', sort: exercises.length + 1 });
  };
  const renameExercise = (id: string) => { const e = snap.exercises[id]; const name = prompt('Упражнение (пусто = удалить)', e.name); if (name === null) return; name.trim() ? s.put('exercises', { ...e, name: name.trim() }) : s.put('exercises', { ...e, deleted: true }); };
  const editAthlete = (id: string) => { const a = snap.athletes[id]; const n = prompt('Фамилия Имя (пусто = удалить)', a.full_name); if (n === null) return; n.trim() ? s.put('athletes', { ...a, full_name: n.trim() }) : s.put('athletes', { ...a, deleted: true }); };
  return (
    <main className="screen">
      <header><button onClick={back}>‹ Назад</button><h1>{group?.name}</h1></header>
      <button className="big" onClick={newSession}>Новая сдача</button>
      <h2>Сдачи</h2>
      {sessions.map(x => <button key={x.id} className="row" onClick={() => nav({ name: 'table', sessionId: x.id })}>{x.date.split('-').reverse().join('.')}</button>)}
      <h2>Дети ({athletes.length})</h2>
      <button className="ghost" onClick={() => nav({ name: 'add', groupId })}>🎤 Добавить детей</button>
      {athletes.map(a => <div key={a.id} className="row split"><button onClick={() => nav({ name: 'athlete', athleteId: a.id })}>{a.full_name}</button><button className="icon" onClick={() => editAthlete(a.id)}>✎</button></div>)}
      <h2>Упражнения</h2>
      {exercises.map(e => <button key={e.id} className="row" onClick={() => renameExercise(e.id)}>{e.name} <small>{e.unit}</small></button>)}
      <button className="ghost" onClick={addExercise}>+ Упражнение</button>
    </main>
  );
}
```

`prompt()` на iOS работает и в standalone PWA. Это сознательное упрощение (YAGNI).

- [ ] **Step 4: AddAthletes (диктовка и предпросмотр)**

```tsx
// src/screens/AddAthletes.tsx
import { useState } from 'react';
import { parseNames } from '../names';
import { useStore, uid } from '../useStore';
export default function AddAthletes({ groupId, back }: { groupId: string; back: () => void }) {
  const s = useStore(); const [text, setText] = useState('');
  const names = parseNames(text);
  const existing = new Set(Object.values(s.snapshot.athletes).filter(a => a.group_id === groupId && !a.deleted).map(a => a.full_name.toLocaleLowerCase('ru')));
  const fresh = names.filter(n => !existing.has(n.toLocaleLowerCase('ru')));
  const save = () => { fresh.forEach(full_name => s.put('athletes', { id: uid(), group_id: groupId, full_name })); back(); };
  return (
    <main className="screen">
      <header><button onClick={back}>‹ Назад</button><h1>Добавить детей</h1></header>
      <p className="hint">Нажмите 🎤 на клавиатуре и диктуйте: «Иванов Петя, запятая, Сидорова Маша…». Каждый ребёнок — через запятую или с новой строки.</p>
      <textarea rows={6} value={text} onChange={e => setText(e.target.value)} autoFocus />
      <h2>Будет добавлено: {fresh.length}</h2>
      <ol>{names.map(n => <li key={n} className={existing.has(n.toLocaleLowerCase('ru')) ? 'dup' : (n.split(' ').length > 3 ? 'warn' : '')}>{n}{existing.has(n.toLocaleLowerCase('ru')) ? ' — уже есть' : n.split(' ').length > 3 ? ' — похоже, тут несколько детей: поставьте запятую' : ''}</li>)}</ol>
      <button className="big" disabled={!fresh.length} onClick={save}>Сохранить</button>
    </main>
  );
}
```

- [ ] **Step 5: styles.css** (мобильный базовый стиль)

```css
:root { --c: #1d4ed8; --bg: #fff; --fg: #111; --mute: #6b7280; --line: #e5e7eb; font-family: -apple-system, system-ui, sans-serif; color: var(--fg); background: var(--bg); }
@media (prefers-color-scheme: dark) { :root { --bg: #0b0b0c; --fg: #f3f4f6; --mute: #9ca3af; --line: #27272a; } }
body { margin: 0; background: var(--bg); }
.screen { padding: 12px 16px calc(24px + env(safe-area-inset-bottom)); display: flex; flex-direction: column; gap: 8px; max-width: 640px; margin: 0 auto; }
header { display: flex; align-items: center; gap: 8px; } header h1 { font-size: 20px; margin: 0; }
button { font: inherit; min-height: 48px; border-radius: 12px; border: 1px solid var(--line); background: transparent; color: inherit; padding: 0 14px; }
button.big { background: var(--c); color: #fff; border: 0; font-size: 18px; font-weight: 600; }
button.big:disabled { opacity: .4; }
button.row { text-align: left; } button.ghost { border-style: dashed; color: var(--c); }
.row.split { display: flex; gap: 8px; } .row.split > button:first-child { flex: 1; text-align: left; } button.icon { width: 48px; }
input, textarea { font: inherit; font-size: 17px; width: 100%; box-sizing: border-box; padding: 12px; border-radius: 12px; border: 1px solid var(--line); background: transparent; color: inherit; }
label { display: flex; flex-direction: column; gap: 4px; color: var(--mute); }
.hint { color: var(--mute); font-size: 14px; } .err { color: #dc2626; } li.dup { color: var(--mute); } li.warn { color: #d97706; }
.sync { font-size: 12px; text-align: center; padding: 4px; padding-top: max(4px, env(safe-area-inset-top)); } .sync.ok { color: #16a34a; } .sync.wait { color: var(--mute); }
.huge { font-size: 64px; font-weight: 700; text-align: center; min-height: 80px; }
.steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; } .steps button { font-size: 20px; min-height: 56px; }
table { border-collapse: collapse; font-size: 14px; } th, td { border: 1px solid var(--line); padding: 6px; } .scroll { overflow-x: auto; }
td input { border: 0; padding: 6px; width: 64px; text-align: center; }
```

Также в `index.html`: `<html lang="ru">`, `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">`, `<meta name="apple-mobile-web-app-capable" content="yes">`, `<link rel="apple-touch-icon" href="/vedomost/icon-192.png">`, `<title>Ведомость</title>`. В `main.tsx` импортировать `./styles.css`.

- [ ] **Step 6: Проверка:** `npm run dev` с `.env.local` от тестового проекта Supabase. В браузере в мобильном режиме: вход, группы из сида, добавление детей текстом «иванов петя, сидорова маша» → 2 ребёнка. Commit `feat: login, groups, athletes screens`.

---

### Task 7: Сдача: режим «по нормативу» и таблица

**Files:** Create `src/screens/SessionEntry.tsx`, `src/screens/SessionTable.tsx`

**Interfaces:** Consumes `parseValue`, `formatValue`, `resultId`, `useStore`, `Nav`

- [ ] **Step 1: SessionEntry**

```tsx
// src/screens/SessionEntry.tsx
import { useState } from 'react';
import { useStore } from '../useStore';
import { resultId } from '../types';
import { formatValue, parseValue } from '../values';
import type { Nav } from '../App';
export default function SessionEntry({ sessionId, nav, back, coach }: { sessionId: string; nav: Nav; back: () => void; coach: string }) {
  const s = useStore(); const snap = s.snapshot; const ses = snap.sessions[sessionId];
  const athletes = Object.values(snap.athletes).filter(a => a.group_id === ses.group_id && !a.deleted).sort((a, b) => a.full_name.localeCompare(b.full_name, 'ru'));
  const exercises = Object.values(snap.exercises).filter(e => e.group_id === ses.group_id && !e.deleted).sort((a, b) => a.sort - b.sort);
  const [ei, setEi] = useState(0); const [ai, setAi] = useState(0);
  const ex = exercises[ei]; const ath = athletes[ai];
  if (!ex || !ath) return <main className="screen"><header><button onClick={back}>‹ Назад</button></header><p>Добавьте в группу детей и упражнения.</p></main>;
  const rid = resultId(sessionId, ath.id, ex.id);
  const value = snap.results[rid]?.value ?? null;
  const setValue = (v: number | null) => s.put('results', { id: rid, session_id: sessionId, athlete_id: ath.id, exercise_id: ex.id, value: v, updated_by: coach });
  const step = (d: number) => setValue(Math.max(0, Math.round(((value ?? 0) + d) * 100) / 100));
  const next = () => { if (ai < athletes.length - 1) setAi(ai + 1); else if (ei < exercises.length - 1) { setEi(ei + 1); setAi(0); } };
  const stepSize = ex.unit === 'м' ? 0.05 : 1;
  return (
    <main className="screen">
      <header><button onClick={back}>‹ Назад</button><button onClick={() => nav({ name: 'table', sessionId })}>Таблица</button></header>
      <select value={ei} onChange={e => { setEi(+e.target.value); setAi(0); }}>{exercises.map((e, i) => <option key={e.id} value={i}>{e.name} ({e.unit})</option>)}</select>
      <select value={ai} onChange={e => setAi(+e.target.value)}>{athletes.map((a, i) => <option key={a.id} value={i}>{i + 1}. {a.full_name}</option>)}</select>
      <h2 style={{ textAlign: 'center' }}>{ath.full_name}</h2>
      <input className="huge" inputMode="decimal" value={formatValue(value)} placeholder="—" onChange={e => setValue(parseValue(e.target.value))} />
      <div className="steps">
        <button onClick={() => step(-stepSize * 5)}>−{formatValue(stepSize * 5)}</button><button onClick={() => step(-stepSize)}>−{formatValue(stepSize)}</button>
        <button onClick={() => step(stepSize)}>+{formatValue(stepSize)}</button><button onClick={() => step(stepSize * 5)}>+{formatValue(stepSize * 5)}</button>
      </div>
      <button onClick={() => setValue(null)}>Не сдавал (очистить)</button>
      <button className="big" onClick={next}>Дальше →</button>
      <p className="hint">{ai + 1} из {athletes.length} · упражнение {ei + 1} из {exercises.length}</p>
    </main>
  );
}
```

Внимание: поле ввода с `parseValue` на каждое нажатие не даст набрать «1,» (значение превратится в 1). Решение: держать локальную строку `draft` и сохранять `parseValue(draft)` в `onBlur` и при «Дальше». Реализовать так:

```tsx
const [draft, setDraft] = useState<string | null>(null);   // null = показывать сохранённое
// input: value={draft ?? formatValue(value)} onChange={e => setDraft(e.target.value)} onBlur={commit}
const commit = () => { if (draft !== null) { setValue(parseValue(draft)); setDraft(null); } };
// next(): commit(); затем переход. step(): commit не нужен, draft сбросить: setDraft(null).
```

(Хуки объявляются до раннего `return`.)

- [ ] **Step 2: SessionTable**

```tsx
// src/screens/SessionTable.tsx
import { useStore } from '../useStore';
import { resultId } from '../types';
import { formatValue, parseValue } from '../values';
import { buildDocx } from '../exportDocx';
import type { Nav } from '../App';
export default function SessionTable({ sessionId, nav, back, coach }: { sessionId: string; nav: Nav; back: () => void; coach: string }) {
  const s = useStore(); const snap = s.snapshot; const ses = snap.sessions[sessionId]; const group = snap.groups[ses.group_id];
  const athletes = Object.values(snap.athletes).filter(a => a.group_id === ses.group_id && !a.deleted).sort((a, b) => a.full_name.localeCompare(b.full_name, 'ru'));
  const exercises = Object.values(snap.exercises).filter(e => e.group_id === ses.group_id && !e.deleted).sort((a, b) => a.sort - b.sort);
  const put = (aid: string, eid: string, raw: string) => s.put('results', { id: resultId(sessionId, aid, eid), session_id: sessionId, athlete_id: aid, exercise_id: eid, value: parseValue(raw), updated_by: coach });
  const setDate = () => { const d = prompt('Дата сдачи (ГГГГ-ММ-ДД)', ses.date); if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) s.put('sessions', { ...ses, date: d }); };
  const exportDoc = async () => {
    const blob = await buildDocx({ groupName: group.name, date: ses.date, exercises, athletes, value: (a, e) => snap.results[resultId(sessionId, a, e)]?.value ?? null });
    const file = new File([blob], `Ведомость ${group.name} ${ses.date}.docx`, { type: blob.type });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: file.name, text: 'Для Clubjudo98@mail.ru' }).catch(() => {});
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.click(); }
  };
  return (
    <main className="screen">
      <header><button onClick={back}>‹ Назад</button><h1 onClick={setDate}>{group.name} · {ses.date.split('-').reverse().join('.')} ✎</h1></header>
      <button className="big" onClick={() => nav({ name: 'entry', sessionId })}>Вносить по нормативу</button>
      <div className="scroll"><table>
        <thead><tr><th>Фамилия Имя</th>{exercises.map(e => <th key={e.id}>{e.name}<br /><small>{e.unit}</small></th>)}</tr></thead>
        <tbody>{athletes.map(a => <tr key={a.id}><td>{a.full_name}</td>{exercises.map(e => {
          const v = snap.results[resultId(sessionId, a.id, e.id)]?.value ?? null;
          return <td key={e.id}><input inputMode="decimal" defaultValue={formatValue(v)} key={String(v)} onBlur={ev => ev.target.value !== formatValue(v) && put(a.id, e.id, ev.target.value)} /></td>;
        })}</tr>)}</tbody>
      </table></div>
      <button onClick={exportDoc}>📤 Ведомость в Word / отправить</button>
      <button onClick={() => { if (confirm('Удалить эту сдачу?')) { s.put('sessions', { ...ses, deleted: true }); back(); } }}>Удалить сдачу</button>
    </main>
  );
}
```

- [ ] **Step 3: Проверка:** в мобильном режиме браузера. Внести 0, 1,20 и пусто: в таблице видно «0», «1,2» и пустую ячейку. «Дальше →» на последнем ребёнке переходит к следующему упражнению. Commit `feat: session entry and table`.

---

### Task 8: Прогресс ребёнка

**Files:** Create `src/screens/AthleteProgress.tsx`

**Interfaces:** Consumes `progressLine`, `resultId`

- [ ] **Step 1: Экран**

```tsx
// src/screens/AthleteProgress.tsx
import { useStore } from '../useStore';
import { resultId } from '../types';
import { progressLine } from '../values';
export default function AthleteProgress({ athleteId, back }: { athleteId: string; back: () => void }) {
  const snap = useStore().snapshot; const a = snap.athletes[athleteId];
  const sessions = Object.values(snap.sessions).filter(x => x.group_id === a.group_id && !x.deleted).sort((x, y) => x.date.localeCompare(y.date));
  const exercises = Object.values(snap.exercises).filter(e => e.group_id === a.group_id && !e.deleted).sort((x, y) => x.sort - y.sort);
  const arrow = { up: ' ↑', down: ' ↓', same: ' =', null: '' } as const;
  return (
    <main className="screen">
      <header><button onClick={back}>‹ Назад</button><h1>{a.full_name}</h1></header>
      <p className="hint">Сдачи: {sessions.map(x => x.date.split('-').reverse().slice(0, 2).join('.')).join(', ') || 'пока нет'}</p>
      {exercises.map(e => { const p = progressLine(sessions.map(x => snap.results[resultId(x.id, a.id, e.id)]?.value ?? null));
        return <div key={e.id} className="row"><b>{e.name}</b>: {p.text}{p.text !== '—' ? ' ' + e.unit : ''}{arrow[String(p.trend) as keyof typeof arrow]}</div>; })}
    </main>
  );
}
```

- [ ] **Step 2: Проверка:** две сдачи с 8 и 12 отжиманиями показывают «8 → 12 раз ↑». Commit `feat: athlete progress`.

---

### Task 9: Выгрузка в Word

**Files:** Create `src/exportDocx.ts`, `tests/exportDocx.test.ts`

**Interfaces:** Produces `buildDocx(o: { groupName: string; date: string; exercises: Exercise[]; athletes: Athlete[]; value: (athleteId: string, exerciseId: string) => number | null }): Promise<Blob>`, `buildDocxDocument(o): Document` (для теста)

- [ ] **Step 1: Тест**

```ts
import { describe, it, expect } from 'vitest';
import { Packer } from 'docx';
import JSZip from 'jszip';
import { buildDocxDocument } from '../src/exportDocx';

describe('exportDocx', () => {
  it('contains title, names and values with comma', async () => {
    const doc = buildDocxDocument({ groupName: '4,5–5,5 лет', date: '2026-10-30',
      exercises: [{ id: 'e', group_id: 'g', name: 'Прыжок', unit: 'м', sort: 1, updated_at: '' }],
      athletes: [{ id: 'a', group_id: 'g', full_name: 'Иванов Петя', updated_at: '' }],
      value: () => 1.2 });
    const zip = await JSZip.loadAsync(await Packer.toBuffer(doc));
    const xml = await zip.file('word/document.xml')!.async('string');
    expect(xml).toContain('Иванов Петя'); expect(xml).toContain('1,2'); expect(xml).toContain('30.10.2026'); expect(xml).toContain('Прыжок');
  });
});
```

(`npm i -D jszip`: зависимость docx, но поставить явно для теста.)

- [ ] **Step 2:** FAIL.

- [ ] **Step 3: Реализация** (та же форма, что в `vedomost-normativy/gen_docx.js`: A4 альбом, поля 1 см, Arial)

```ts
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType, PageOrientation, VerticalAlign, HeightRule, TabStopType } from 'docx';
import type { Athlete, Exercise } from './types';
import { formatValue } from './values';

type Opts = { groupName: string; date: string; exercises: Exercise[]; athletes: Athlete[]; value: (a: string, e: string) => number | null };
const TOTAL = 15704, NUM = 500, NAME = 3000, ITOG = 1300, FONT = 'Arial';
const b = { style: 'single' as const, size: 6, color: '000000' };
const borders = { top: b, bottom: b, left: b, right: b };
const p = (text: string, o: { bold?: boolean; size?: number; left?: boolean } = {}) =>
  new Paragraph({ alignment: o.left ? AlignmentType.LEFT : AlignmentType.CENTER, children: [new TextRun({ text, font: FONT, size: o.size ?? 18, bold: o.bold })] });
const cell = (children: Paragraph[], w: number, shade = false) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders, verticalAlign: VerticalAlign.CENTER,
  margins: { top: 40, bottom: 40, left: 60, right: 60 }, shading: shade ? { type: ShadingType.CLEAR, color: 'auto', fill: 'EEEEEE' } : undefined, children });

export function buildDocxDocument(o: Opts) {
  const n = Math.max(1, o.exercises.length);
  const nw = Math.floor((TOTAL - NUM - NAME - ITOG) / n);
  const itog = TOTAL - NUM - NAME - nw * n;
  const widths = [NUM, NAME, ...o.exercises.map(() => nw), itog];
  const header = new TableRow({ tableHeader: true, children: [cell([p('№', { bold: true })], NUM, true), cell([p('Фамилия Имя', { bold: true })], NAME, true),
    ...o.exercises.map(e => cell([p(e.name, { bold: true }), p(e.unit, { size: 16 })], nw, true)), cell([p('Итог', { bold: true })], itog, true)] });
  const rowsCount = Math.max(o.athletes.length, 16);
  const rows = Array.from({ length: rowsCount }, (_, i) => {
    const a = o.athletes[i];
    return new TableRow({ height: { value: 420, rule: HeightRule.ATLEAST }, children: [
      cell([p(String(i + 1))], NUM), cell([p(a?.full_name ?? '', { left: true })], NAME),
      ...o.exercises.map(e => cell([p(a ? formatValue(o.value(a.id, e.id)) : '')], nw)), cell([p('')], itog)] });
  });
  const date = o.date.split('-').reverse().join('.');
  return new Document({ sections: [{ properties: { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: { top: 567, bottom: 567, left: 567, right: 567 } } },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: `Ведомость сдачи нормативов ОФП — группа ${o.groupName}`, font: FONT, size: 32, bold: true })] }),
      new Paragraph({ spacing: { after: 160 }, tabStops: [{ type: TabStopType.RIGHT, position: TOTAL }], children: [new TextRun({ text: `Дата: ${date}\tТренер: ______________________________`, font: FONT, size: 22 })] }),
      new Table({ width: { size: TOTAL, type: WidthType.DXA }, columnWidths: widths, rows: [header, ...rows] }),
    ] }] });
}

export const buildDocx = (o: Opts) => Packer.toBlob(buildDocxDocument(o));
```

- [ ] **Step 4:** PASS. Commit `feat: docx export`.

---

### Task 10: Запуск: Supabase, GitHub Pages, проверка на iPhone

**Требует подтверждения пользователя перед каждым внешним действием** (создание проекта Supabase, репозитория GitHub, включение Pages).

- [ ] **Step 1:** Спросить пользователя: переиспользовать аккаунт Supabase от OBIDAN или завести новый (бесплатно). Создать проект `vedomost` (регион Европа), выполнить `supabase/schema.sql` в SQL Editor. Задать код клуба (спросить пользователя, какой код он хочет) через `insert into app_secret …`.
- [ ] **Step 2:** Создать репозиторий `ramolee2020/vedomost` (публичный: код без секретов, anon key публичен по замыслу Supabase), включить Pages (Source: GitHub Actions), задать секреты `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`, запушить main. Дождаться зелёного деплоя.
- [ ] **Step 3: Проверка без телефона:** открыть `https://ramolee2020.github.io/vedomost/` в Chrome (claude-in-chrome) в мобильном размере. Вход с неверным кодом → «Неверный код клуба». С верным кодом видны 3 группы. Добавить двух тестовых детей, внести результаты, проверить, что строки появились в Supabase. Отключить сеть (DevTools offline), внести значение, включить сеть и убедиться, что значение доехало. Выгрузить docx и открыть в Word (COM-рендер в PDF, как раньше). Удалить тестовые данные.
- [ ] **Step 4:** Отправить пользователю в Telegram ссылку, код и инструкцию: Safari → «Поделиться» → «На экран Домой» → вход → «Добавить детей» → микрофон. Попросить проверить диктовку на iPhone.
- [ ] **Step 5:** Обновить память проекта (`project_vedomost_app.md`): URL, id проекта Supabase, где хранится код.
