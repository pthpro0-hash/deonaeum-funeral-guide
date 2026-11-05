// 지킴이용 잠근 노트 파일. 비밀 문구로 이 기기 안에서 암호화하고, 지킴이 기기 안에서만 푼다.
// PBKDF2-SHA256 → AES-GCM 256 (WebCrypto). 서버를 거치지 않는다. 테스트: tests/seal.test.mjs

export const SEAL_APP = "deonaeum-life-note-sealed";
export const ITERATIONS = 600000;
const MIN_IT = 100000, MAX_IT = 2000000; // 남이 만든 파일이 기기를 오래 붙잡지 못하게

// 헷갈리는 글자(0 O 1 I)를 뺀 32자. 12자면 60비트.
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeCode(rand = (n) => crypto.getRandomValues(new Uint8Array(n))) {
  const b = rand(12);
  const s = Array.from(b, (x) => ALPHA[x % 32]).join("");
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}
// 띄어쓰기·하이픈·대소문자는 상관없게
export const normCode = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = (u8) => { let s = ""; for (const x of u8) s += String.fromCharCode(x); return btoa(s); };
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function key(code, salt, iterations) {
  const base = await crypto.subtle.importKey("raw", enc.encode(normCode(code)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function seal(payload, code, { iterations = ITERATIONS, made = new Date().toISOString().slice(0, 10) } = {}) {
  if (normCode(code).length < 8) throw new Error("비밀 문구가 너무 짧습니다.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(code, salt, iterations), enc.encode(JSON.stringify(payload))));
  return { app: SEAL_APP, version: 1, made, kdf: { name: "PBKDF2", hash: "SHA-256", iterations, salt: b64(salt) }, cipher: { name: "AES-GCM", iv: b64(iv) }, data: b64(ct) };
}

export async function unseal(text, code) {
  let f;
  try { f = typeof text === "string" ? JSON.parse(text) : text; } catch { throw new Error("인생 노트 파일이 아닙니다."); }
  if (!f || f.app !== SEAL_APP || f.version !== 1 || !f.kdf || !f.cipher || !f.data) throw new Error("인생 노트 파일이 아닙니다.");
  const it = Number(f.kdf.iterations);
  if (!(it >= MIN_IT && it <= MAX_IT)) throw new Error("인생 노트 파일이 아닙니다.");
  try {
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(f.cipher.iv) }, await key(code, unb64(f.kdf.salt), it), unb64(f.data));
    return { made: String(f.made || ""), payload: JSON.parse(dec.decode(pt)) };
  } catch {
    throw new Error("비밀 문구가 맞지 않습니다. 봉투 속 카드의 글자를 다시 확인해 주세요.");
  }
}
