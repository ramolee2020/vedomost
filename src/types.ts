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
