import { useState } from 'react';
import { useStore } from '../useStore';
import { resultId } from '../types';
import { formatValue, parseValue } from '../values';
import type { Nav } from '../App';

export default function SessionEntry({ sessionId, nav, back, coach }: { sessionId: string; nav: Nav; back: () => void; coach: string }) {
  const s = useStore(); const snap = s.snapshot; const ses = snap.sessions[sessionId];
  const [ei, setEi] = useState(0); const [ai, setAi] = useState(0);
  const [draft, setDraft] = useState<string | null>(null); // null = показывать сохранённое значение
  const athletes = Object.values(snap.athletes).filter(a => a.group_id === ses.group_id && !a.deleted).sort((a, b) => a.full_name.localeCompare(b.full_name, 'ru'));
  const exercises = Object.values(snap.exercises).filter(e => e.group_id === ses.group_id && !e.deleted).sort((a, b) => a.sort - b.sort);
  const ex = exercises[ei]; const ath = athletes[ai];
  if (!ex || !ath) return <main className="screen"><header><button onClick={back}>‹ Назад</button></header><p>Добавьте в группу детей и упражнения.</p></main>;

  const rid = resultId(sessionId, ath.id, ex.id);
  const value = snap.results[rid]?.value ?? null;
  const setValue = (v: number | null) => s.put('results', { id: rid, session_id: sessionId, athlete_id: ath.id, exercise_id: ex.id, value: v, updated_by: coach });
  const commit = () => { if (draft !== null) { if (parseValue(draft) !== value) setValue(parseValue(draft)); setDraft(null); } };
  const stepSize = ex.unit === 'м' ? 0.05 : 1;
  const step = (d: number) => {
    const base = draft !== null ? parseValue(draft) : value;
    setDraft(null);
    setValue(Math.max(0, Math.round(((base ?? 0) + d) * 100) / 100));
  };
  const go = (nextEi: number, nextAi: number) => { commit(); setEi(nextEi); setAi(nextAi); };
  const next = () => {
    if (ai < athletes.length - 1) go(ei, ai + 1);
    else if (ei < exercises.length - 1) go(ei + 1, 0);
    else { commit(); nav({ name: 'table', sessionId }); }
  };
  const last = ai === athletes.length - 1 && ei === exercises.length - 1;

  return (
    <main className="screen">
      <header><button onClick={back}>‹ Назад</button><button onClick={() => { commit(); nav({ name: 'table', sessionId }); }}>Таблица</button></header>
      <select value={ei} onChange={e => go(+e.target.value, 0)}>{exercises.map((e, i) => <option key={e.id} value={i}>{e.name} ({e.unit})</option>)}</select>
      <select value={ai} onChange={e => go(ei, +e.target.value)}>{athletes.map((a, i) => <option key={a.id} value={i}>{i + 1}. {a.full_name}</option>)}</select>
      <h2 style={{ textAlign: 'center' }}>{ath.full_name}</h2>
      <input className="huge" inputMode="decimal" value={draft ?? formatValue(value)} placeholder="—" onChange={e => setDraft(e.target.value)} onBlur={commit} />
      <div className="steps">
        <button onClick={() => step(-stepSize * 5)}>−{formatValue(stepSize * 5)}</button>
        <button onClick={() => step(-stepSize)}>−{formatValue(stepSize)}</button>
        <button onClick={() => step(stepSize)}>+{formatValue(stepSize)}</button>
        <button onClick={() => step(stepSize * 5)}>+{formatValue(stepSize * 5)}</button>
      </div>
      <button onClick={() => { setDraft(null); setValue(null); }}>Не сдавал (очистить)</button>
      <button className="big" onClick={next}>{last ? 'Готово ✓' : 'Дальше →'}</button>
      <p className="hint">{ai + 1} из {athletes.length} · упражнение {ei + 1} из {exercises.length}</p>
    </main>
  );
}
