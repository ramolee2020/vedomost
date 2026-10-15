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
