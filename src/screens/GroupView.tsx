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
