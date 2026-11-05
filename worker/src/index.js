// 나의 인생 노트 — 매달 알림 서버 (Cloudflare Workers 무료 구간)
// 받는 것: 푸시 구독 주소와 알림 날짜(1~28일)뿐. 이름·번호·노트 내용은 받지 않는다.
// 매일 09:00 KST에 돌며, 그날이 알림 날짜인 구독에 내용 없는 푸시를 보낸다.
import { allowedEndpoint, due, kstToday, newVapidKeys, publicKeyFromJwk, sha256hex, validDay, vapidAuth, ym } from "./push.js";

const VAPID_KEY = "config:vapid";
const SUB_PREFIX = "sub:";

async function vapid(env) {
  let jwk = await env.PUSH.get(VAPID_KEY, "json");
  if (!jwk) {
    jwk = await newVapidKeys();
    await env.PUSH.put(VAPID_KEY, JSON.stringify(jwk));
  }
  return jwk;
}

function cors(env, req) {
  const origin = req.headers.get("Origin") || "";
  const ok = String(env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).includes(origin);
  return ok ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Vary": "Origin" } : null;
}

const json = (body, status, headers) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } });

export default {
  async fetch(req, env) {
    const h = cors(env, req);
    if (!h) return json({ error: "origin" }, 403, {});
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    const { pathname } = new URL(req.url);

    if (req.method === "GET" && pathname === "/vapid") {
      return json({ key: publicKeyFromJwk(await vapid(env)) }, 200, h);
    }
    if (req.method !== "POST") return json({ error: "method" }, 405, h);

    let body;
    try { body = await req.json(); } catch { return json({ error: "body" }, 400, h); }
    const endpoint = body?.endpoint;
    if (!allowedEndpoint(endpoint)) return json({ error: "endpoint" }, 400, h);
    const id = SUB_PREFIX + await sha256hex(endpoint);

    if (pathname === "/subscribe") {
      if (!validDay(body.day)) return json({ error: "day" }, 400, h);
      // 오늘 켰고 오늘이 그 날짜면 이번 달은 건너뛴다(켜자마자 알림이 오지 않게)
      const today = kstToday();
      const last = today.d >= body.day ? ym(today) : "";
      await env.PUSH.put(id, endpoint, { metadata: { day: body.day, last } });
      return json({ ok: true, day: body.day }, 200, h);
    }
    if (pathname === "/unsubscribe") {
      await env.PUSH.delete(id);
      return json({ ok: true }, 200, h);
    }
    return json({ error: "path" }, 404, h);
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(sendDue(env));
  },
};

export async function sendDue(env, today = kstToday()) {
  const jwk = await vapid(env);
  const auth = new Map(); // 푸시 서버(origin)마다 서명 한 번
  let cursor, sent = 0, gone = 0;
  do {
    const page = await env.PUSH.list({ prefix: SUB_PREFIX, cursor });
    for (const k of page.keys) {
      const meta = k.metadata || {};
      if (!validDay(meta.day) || !due(meta, today)) continue;
      const endpoint = await env.PUSH.get(k.name);
      if (!endpoint) continue;
      const origin = new URL(endpoint).origin;
      if (!auth.has(origin)) auth.set(origin, await vapidAuth(jwk, endpoint, env.VAPID_SUBJECT));
      const r = await fetch(endpoint, { method: "POST", headers: { Authorization: auth.get(origin), TTL: "86400", Urgency: "normal", "Content-Length": "0" } });
      if (r.status === 404 || r.status === 410) { await env.PUSH.delete(k.name); gone++; continue; }
      if (r.ok) { await env.PUSH.put(k.name, endpoint, { metadata: { ...meta, last: ym(today) } }); sent++; }
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  console.log(JSON.stringify({ date: ym(today) + "-" + today.d, sent, gone }));
  return { sent, gone };
}
