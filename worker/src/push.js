// 웹 푸시(VAPID) 도우미. 내용 없는 푸시만 보낸다(알림 문구는 사이트의 sw.js에 고정).
// 그래서 구독의 암호화 키(p256dh, auth)는 받지도 저장하지도 않는다. 테스트: tests/push.test.mjs

// 브라우저 회사의 푸시 서버만 받는다. 아무 주소나 받으면 이 서버가 남의 서버를 두드리는 데 쓰일 수 있다.
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^web\.push\.apple\.com$/, /^[a-z0-9-]+\.notify\.windows\.com$/];

export function allowedEndpoint(s) {
  if (typeof s !== "string" || s.length > 1024) return false;
  let u;
  try { u = new URL(s); } catch { return false; }
  return u.protocol === "https:" && !u.port && PUSH_HOSTS.some((re) => re.test(u.hostname));
}

export const validDay = (d) => Number.isInteger(d) && d >= 1 && d <= 28;

// 한국 시간 기준 오늘
export function kstToday(now = new Date()) {
  const k = new Date(now.getTime() + 9 * 3600 * 1000);
  return { y: k.getUTCFullYear(), m: k.getUTCMonth() + 1, d: k.getUTCDate() };
}
export const ym = ({ y, m }) => `${y}-${String(m).padStart(2, "0")}`;

// 이번 달에 아직 안 보냈고, 정한 날이 되었거나 지났으면 보낸다(하루 놓쳐도 다음 날 보냄).
export function due({ day, last }, today) {
  return last !== ym(today) && today.d >= day;
}

export const b64url = (u8) => btoa(String.fromCharCode(...u8)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export async function sha256hex(s) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
  return Array.from(h, (x) => x.toString(16).padStart(2, "0")).join("");
}

export async function newVapidKeys() {
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  return crypto.subtle.exportKey("jwk", kp.privateKey);
}

// 브라우저 pushManager.subscribe에 줄 공개키 (압축하지 않은 점 65바이트)
export function publicKeyFromJwk(jwk) {
  const x = fromB64url(jwk.x), y = fromB64url(jwk.y);
  const out = new Uint8Array(65);
  out[0] = 4; out.set(x, 1); out.set(y, 33);
  return b64url(out);
}

// RFC 8292 VAPID: ES256 JWT. aud는 푸시 서버의 origin.
export async function vapidAuth(jwk, endpoint, sub, now = Date.now()) {
  const key = await crypto.subtle.importKey("jwk", { ...jwk, key_ops: ["sign"] }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const enc = (o) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const head = enc({ typ: "JWT", alg: "ES256" });
  const body = enc({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub });
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(`${head}.${body}`)));
  return `vapid t=${head}.${body}.${b64url(sig)}, k=${publicKeyFromJwk(jwk)}`;
}
