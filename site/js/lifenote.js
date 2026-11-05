// 나의 인생 노트 — 화면과 상관없는 계산만 모았다. node 테스트로 고정한다(tests/lifenote.test.mjs).

export const MAX_KEEPERS = 3;
export const GROUPS = ["가족", "친척", "오랜 친구", "직장 동료", "이웃·모임"];

// ── 노트 지킴이 ───────────────────────────────────────
// keepers: { mode: "set" | "none", list: [{ name, rel, phone }] }. "없음"도 정한 것으로 친다.
export function keepersDecided(k) {
  if (!k) return false;
  if (k.mode === "none") return true;
  return k.mode === "set" && validKeepers(k.list).length > 0;
}

export function validKeepers(list = []) {
  return list.filter((x) => x && String(x.name || "").trim()).slice(0, MAX_KEEPERS);
}

export function normPhone(s) {
  const d = String(s || "").replace(/[^0-9]/g, "");
  return /^01\d{8,9}$/.test(d) ? d : "";
}

// ── 월 1회 안내 ───────────────────────────────────────
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s) => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); };

// 한 달 뒤 같은 날. 그달에 그 날이 없으면 말일로 (1월 31일 → 2월 28/29일).
export function addMonth(dateStr) {
  const d = parse(dateStr);
  const last = new Date(d.getFullYear(), d.getMonth() + 2, 0).getDate();
  return ymd(new Date(d.getFullYear(), d.getMonth() + 1, Math.min(d.getDate(), last)));
}

export function noticeDue(lastSent, today) {
  if (!lastSent) return true;
  return today >= addMonth(lastSent);
}

export function noticeText({ owner, keeper, place, url }) {
  const who = String(owner || "").trim() || "제가";
  const subj = String(owner || "").trim() ? `${who}님이` : "제가";
  return [
    `[나의 인생 노트] ${keeper ? `${keeper}님, ` : ""}${subj} 인생 노트를 정리해 두고 있어요. ${keeper ? `${keeper}님을` : "당신을"} 노트 지킴이로 정했습니다.`,
    place ? `인쇄한 노트는 ${place}에 있어요.` : "",
    `지킴이가 하는 일은 이 주소에서 볼 수 있어요: ${url}`,
    "한 달에 한 번 이렇게 알려 드릴게요. 그만 받고 싶으면 편하게 말해 주세요.",
  ].filter(Boolean).join("\n");
}

// 매달 같은 날 오전 10시에 "지킴이 안내 보내기"를 알리는 캘린더 파일 (RFC 5545)
const icsEsc = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
export function noticeIcs({ start, url, uid }) {
  const d = parse(start);
  const day = Math.min(d.getDate(), 28); // 29~31일은 건너뛰는 달이 생기므로 28일로
  const first = ymd(new Date(d.getFullYear(), d.getMonth(), day)).replace(/-/g, "");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//deonaeum//life-note//KO", "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${first}T000000Z`,
    `DTSTART:${first}T100000`,
    "DURATION:PT15M",
    "RRULE:FREQ=MONTHLY",
    `SUMMARY:${icsEsc("인생 노트 지킴이 안내 보내기")}`,
    `DESCRIPTION:${icsEsc(`노트 지킴이에게 이번 달 안내를 보내 주세요.\n${url}`)}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsEsc("지킴이 안내 보내기")}`, "TRIGGER:PT0M", "END:VALARM",
    "END:VEVENT", "END:VCALENDAR", "",
  ].join("\r\n");
}

// ── 소식 전할 분들 ─────────────────────────────────────
// "이름,모임,전화" CSV. 첫 줄이 머리글이면 건너뛴다. 따옴표로 감싼 칸과 칸 안의 쉼표를 처리한다.
export function parseCsv(text) {
  const rows = [];
  for (const line of String(text).replace(/^\uFEFF/, "").split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = [];
    let cur = "", q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ",") { cells.push(cur); cur = ""; }
      else cur += c;
    }
    cells.push(cur);
    rows.push(cells.map((x) => x.trim()));
  }
  if (rows.length && /이름|name/i.test(rows[0][0] || "")) rows.shift();
  return rows.filter((r) => r[0]).map(([name, group = "", phone = ""]) => ({
    name: name.slice(0, 40), group: group.slice(0, 20) || GROUPS[0], phone: normPhone(phone), exclude: false,
  }));
}

// ── 쓰면 안 되는 것 ───────────────────────────────────
// 비밀번호·계좌번호·주민번호처럼 보이는 숫자 덩어리 (8자리 이상, 사이의 - 와 공백 허용)
export const looksLikeSecretNumber = (s) => /\d(?:[\s-]?\d){7,}/.test(String(s || ""));
// 재산을 나누는 말처럼 보이면 "법대로 남기는 방법" 안내를 띄운다(막지는 않음)
export const looksLikeBequest = (s) => /재산|상속|물려|유산|예금|적금|부동산|아파트|땅|토지|주식|나눠|나누어/.test(String(s || ""));

// ── 소식 전하는 글 ─────────────────────────────────────
export const TERMS = [
  { id: "general", label: "별세 (일반)", verb: "별세하셨습니다" },
  { id: "protestant", label: "소천 (개신교)", verb: "소천하셨습니다" },
  { id: "catholic", label: "선종 (천주교)", verb: "선종하셨습니다" },
];

export function obituaryDraft({ name, term = "general", burial, words }) {
  const t = TERMS.find((x) => x.id === term) || TERMS[0];
  return [
    `${String(name || "").trim() || "○○○"}님께서 ____년 __월 __일 ${t.verb}.`,
    "생전에 베풀어 주신 정에 감사드리며 삼가 알려 드립니다.",
    "",
    "빈소: ____________",
    "발인: ____년 __월 __일 __시",
    `장지: ${String(burial || "").trim() || "____________"}`,
    "상주: ____________",
    ...(String(words || "").trim() ? ["", String(words).trim()] : []),
  ].join("\n");
}

// ── 백업 ──────────────────────────────────────────────
export const BACKUP_APP = "deonaeum-life-note";
export const NOTE_KEYS = [
  "note.profile", "note.keepers", "note.notice", "note.story", "note.messages", "note.people",
  "note.obit", "note.assets", "note.lst", "note.kit",
  "plan.wishes", "plan.family", "plan.willcheck", "plan.digital",
];

export function buildBackup(read, now = new Date().toISOString()) {
  const data = {};
  for (const k of NOTE_KEYS) {
    const v = read(k);
    if (v !== undefined && v !== null) data[k] = v;
  }
  return { app: BACKUP_APP, version: 1, saved: now, data };
}

// 알려진 키만 받아들인다. 형식이 다르면 Error.
export function parseBackup(text) {
  let o;
  try { o = JSON.parse(text); } catch { throw new Error("노트 백업 파일이 아닙니다."); }
  if (!o || o.app !== BACKUP_APP || o.version !== 1 || typeof o.data !== "object" || !o.data) throw new Error("노트 백업 파일이 아닙니다.");
  const out = {};
  for (const k of NOTE_KEYS) if (k in o.data) out[k] = o.data[k];
  return { saved: String(o.saved || ""), data: out };
}
