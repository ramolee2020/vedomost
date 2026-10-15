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
