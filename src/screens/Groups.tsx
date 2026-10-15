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
