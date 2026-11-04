// 영정사진 보관함. 사진은 크기가 커서 localStorage 대신 이 기기의 IndexedDB에 둔다.
// IndexedDB가 막혀 있으면(사생활 모드 등) 이 화면을 여는 동안만 메모리에 둔다.
export const MAX_PORTRAITS = 3;

const DB = "deonaeum", STORE = "portraits";
const mem = new Map();
let dbp = null;

function open() {
  if (!dbp) {
    dbp = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbp;
}

async function tx(mode, fn) {
  const db = await open();
  if (!db) return fn(null);
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const out = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(out?.result ?? out);
    t.onerror = () => reject(t.error);
  });
}

export async function listPortraits() {
  const all = await tx("readonly", (s) => (s ? s.getAll() : [...mem.values()]));
  return (all || []).sort((a, b) => a.created - b.created);
}

export async function getPortrait(id) {
  return tx("readonly", (s) => (s ? s.get(id) : mem.get(id)));
}

// rec: { id, created, settings, src: Blob }. 새 사진이 3장을 넘으면 거절한다.
export async function putPortrait(rec) {
  const list = await listPortraits();
  if (!list.some((p) => p.id === rec.id) && list.length >= MAX_PORTRAITS) {
    throw new Error(`영정사진은 ${MAX_PORTRAITS}장까지 보관할 수 있습니다.`);
  }
  await tx("readwrite", (s) => (s ? s.put(rec) : mem.set(rec.id, rec)));
  return rec;
}

export async function deletePortrait(id) {
  await tx("readwrite", (s) => (s ? s.delete(id) : mem.delete(id)));
}
