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
