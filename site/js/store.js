// 이 기기 브라우저에만 저장. 막혀 있으면(사생활 모드 등) 메모리로 대신한다.
const mem = new Map();
const PREFIX = "dn.";

export function get(key, fallback) {
  try {
    const v = localStorage.getItem(PREFIX + key);
    return v === null ? fallback : JSON.parse(v);
  } catch {
    return mem.has(key) ? mem.get(key) : fallback;
  }
}

export function set(key, value) {
  mem.set(key, value);
  try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch { /* 메모리만 */ }
}

export function toggleIn(key, id) {
  const list = get(key, []);
  const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  set(key, next);
  return next.includes(id);
}
