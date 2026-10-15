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
