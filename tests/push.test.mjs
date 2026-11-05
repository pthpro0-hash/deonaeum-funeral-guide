// 매달 알림 서버 테스트 (가짜 KV·가짜 푸시 서버). 실행: node --test tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { allowedEndpoint, due, kstToday, newVapidKeys, publicKeyFromJwk, vapidAuth } from "../worker/src/push.js";
import worker, { sendDue } from "../worker/src/index.js";

const ORIGIN = "https://pthpro0-hash.github.io";
const FCM = "https://fcm.googleapis.com/fcm/send/abc123";

function fakeKV() {
  const m = new Map();
  return {
    m,
    async get(k, type) { const v = m.get(k); return v === undefined ? null : type === "json" ? JSON.parse(v.value) : v.value; },
    async put(k, value, opt = {}) { m.set(k, { value, metadata: opt.metadata }); },
    async delete(k) { m.delete(k); },
    async list({ prefix }) { return { keys: [...m].filter(([k]) => k.startsWith(prefix)).map(([name, v]) => ({ name, metadata: v.metadata })), list_complete: true }; },
  };
}
const env = () => ({ PUSH: fakeKV(), ALLOWED_ORIGINS: `${ORIGIN},http://localhost:8765`, VAPID_SUBJECT: "https://example.org/" });
const call = (e, path, body, origin = ORIGIN, method = "POST") =>
  worker.fetch(new Request("https://w.example" + path, { method, headers: { Origin: origin, "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }), e);

test("푸시 서버 주소만 받는다", () => {
  assert.equal(allowedEndpoint(FCM), true);
  assert.equal(allowedEndpoint("https://web.push.apple.com/QH1"), true);
  assert.equal(allowedEndpoint("https://wns2-bl2p.notify.windows.com/w/?token=x"), true);
  assert.equal(allowedEndpoint("http://fcm.googleapis.com/x"), false);
  assert.equal(allowedEndpoint("https://fcm.googleapis.com:8443/x"), false);
  assert.equal(allowedEndpoint("https://evil.example/fcm.googleapis.com"), false);
  assert.equal(allowedEndpoint("https://fcm.googleapis.com.evil.example/x"), false);
  assert.equal(allowedEndpoint("https://169.254.169.254/"), false);
});

test("한국 시간과 보낼 날", () => {
  assert.deepEqual(kstToday(new Date("2026-11-30T15:30:00Z")), { y: 2026, m: 12, d: 1 });
  const t = { y: 2026, m: 12, d: 5 };
  assert.equal(due({ day: 5, last: "2026-11" }, t), true);
  assert.equal(due({ day: 5, last: "2026-12" }, t), false);
  assert.equal(due({ day: 6, last: "2026-11" }, t), false);
  assert.equal(due({ day: 3, last: "2026-11" }, t), true); // 놓친 날은 다음 날 보낸다
});

test("VAPID 서명은 공개키로 검증된다", async () => {
  const jwk = await newVapidKeys();
  const a = await vapidAuth(jwk, FCM, "https://example.org/", Date.UTC(2026, 10, 6));
  const [, jwt, k] = a.match(/^vapid t=([^,]+), k=(.+)$/);
  assert.equal(k, publicKeyFromJwk(jwk));
  const [h, b, s] = jwt.split(".");
  const dec = (x) => Uint8Array.from(atob(x.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  assert.deepEqual(JSON.parse(new TextDecoder().decode(dec(b))).aud, "https://fcm.googleapis.com");
  const pub = await crypto.subtle.importKey("raw", dec(k), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  assert.equal(await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, pub, dec(s), new TextEncoder().encode(`${h}.${b}`)), true);
});

test("허용하지 않은 사이트에서 온 요청은 거절", async () => {
  const r = await call(env(), "/subscribe", { endpoint: FCM, day: 5 }, "https://evil.example");
  assert.equal(r.status, 403);
});

test("구독: 주소와 날짜만 저장, 잘못된 값은 거절, 끄면 지운다", async () => {
  const e = env();
  assert.equal((await call(e, "/subscribe", { endpoint: "https://evil.example/x", day: 5 })).status, 400);
  assert.equal((await call(e, "/subscribe", { endpoint: FCM, day: 31 })).status, 400);
  const r = await call(e, "/subscribe", { endpoint: FCM, day: 28, keys: { p256dh: "x", auth: "y" }, name: "김영자" });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), ORIGIN);
  const subs = [...e.PUSH.m].filter(([k]) => k.startsWith("sub:"));
  assert.equal(subs.length, 1);
  assert.equal(subs[0][1].value, FCM);
  assert.equal(subs[0][1].metadata.day, 28);
  assert.ok(!JSON.stringify(subs).includes("김영자") && !JSON.stringify(subs).includes("p256dh"));
  await call(e, "/unsubscribe", { endpoint: FCM });
  assert.equal([...e.PUSH.m].filter(([k]) => k.startsWith("sub:")).length, 0);
});

test("공개키는 한 번 만들어 계속 쓴다", async () => {
  const e = env();
  const a = await (await call(e, "/vapid", null, ORIGIN, "GET")).json();
  const b = await (await call(e, "/vapid", null, ORIGIN, "GET")).json();
  assert.equal(a.key, b.key);
  assert.equal(a.key.length, 87);
});

test("매일 돌 때: 그날인 구독에만 보내고, 사라진 구독은 지운다", async (t) => {
  const e = env();
  await e.PUSH.put("sub:a", FCM, { metadata: { day: 5, last: "2026-11" } });
  await e.PUSH.put("sub:b", "https://web.push.apple.com/gone", { metadata: { day: 5, last: "2026-11" } });
  await e.PUSH.put("sub:c", "https://fcm.googleapis.com/fcm/send/later", { metadata: { day: 20, last: "2026-11" } });
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    calls.push({ url, init });
    return new Response(null, { status: url.includes("gone") ? 410 : 201 });
  });
  const r = await sendDue(e, { y: 2026, m: 12, d: 5 });
  assert.deepEqual(r, { sent: 1, gone: 1 });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].init.headers["Content-Length"], "0");
  assert.match(calls[0].init.headers.Authorization, /^vapid t=/);
  assert.equal(e.PUSH.m.get("sub:a").metadata.last, "2026-12");
  assert.equal(e.PUSH.m.has("sub:b"), false);
  assert.equal(e.PUSH.m.get("sub:c").metadata.last, "2026-11");
  const again = await sendDue(e, { y: 2026, m: 12, d: 6 });
  assert.equal(again.sent, 0);
});
