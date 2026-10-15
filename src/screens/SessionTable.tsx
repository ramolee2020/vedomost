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
