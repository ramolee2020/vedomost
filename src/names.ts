const cap = (w: string) =>
  w.split('-').map(p => (p ? p[0].toLocaleUpperCase('ru') + p.slice(1).toLocaleLowerCase('ru') : p)).join('-');

/** Разбивает продиктованный текст на «Фамилия Имя»: по запятым, точкам, переводам строк. */
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
