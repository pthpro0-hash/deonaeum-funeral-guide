// 나의 인생 노트 (#/note). 지금의 나를 정리해 두는 노트. 모두 이 기기에만 저장한다.
// 기획: docs/superpowers/specs/2026-11-05-life-note-advanced-plan.md (1·2단계, 서버 없음)
// 첫 화면·메뉴·안내 문구에는 "죽음, 부고, 임종, 사후, 고인, 사망, 유품, 생존"을 쓰지 않는다(기획 4.2절).
import {
  GROUPS, MAX_KEEPERS, NOTE_KEYS, TERMS, buildBackup, keepersDecided, looksLikeBequest, looksLikeSecretNumber,
  normPhone, noticeDue, noticeIcs, noticeText, obituaryDraft, parseBackup, parseCsv, validKeepers, addMonth,
} from "../lifenote.js";
import { noteSet, today } from "../notestore.js";
import { makeCode, seal, unseal } from "../seal.js";
import { pushReady } from "../config.js";
import { disablePush, enablePush, isIos, pushSupported, standalone } from "../pushclient.js";
import { get, set } from "../store.js";
import { esc, footer, top } from "../ui.js";
import * as plan from "./plan.js?v=20261106w"; // 옛 plan.js가 캐시에 남아 있어도 새 판을 받도록
import * as portrait from "./portrait.js";

const SUB = {
  keepers: renderKeepers, notice: renderNotice, keeper: renderKeeperGuide,
  story: renderStory, messages: renderMessages, people: renderPeople, obit: renderObit,
  assets: renderAssets, kit: renderKit, backup: renderBackup, seal: renderSeal,
  wishes: plan.renderWishes, portrait: portrait.render, inherit: plan.renderInherit,
  will: plan.renderWill, willform: plan.renderWillForm, digital: plan.renderDigital, lst: plan.renderLst,
};
// 지킴이를 정하기 전에도 열 수 있는 화면: 지킴이 안내를 받은 분이 여는 화면
const OPEN = new Set(["keeper", "keepers"]);

export function render(root, sub) {
  if (sub && !SUB[sub]) sub = null;
  if (!OPEN.has(sub) && !keepersDecided(get("note.keepers", null))) return renderKeepers(root, { first: true, next: sub });
  return (sub ? SUB[sub] : renderCover)(root);
}

// 옛 주소(#/plan/...)를 새 주소로 넘긴다. 저장 키는 그대로라 적은 내용은 유지된다.
export function redirectOld(root, sub) {
  location.replace("#/note" + (sub ? "/" + (sub === "print" ? "kit" : sub) : ""));
}

const owner = (read = get) => read("note.profile", {}).name || read("plan.wishes", {}).name || "";
const pageUrl = (hash) => location.origin + location.pathname + hash;
const korDate = (s) => { const [, m, d] = String(s).split("-").map(Number); return `${m}월 ${d}일`; };
const dash = (p) => p.replace(/^(\d{3})(\d{3,4})(\d{4})$/, "$1-$2-$3");
const has = (o) => Object.values(o || {}).some((v) => (Array.isArray(v) ? v.length : String(v ?? "").trim()));

// ── 표지 ──────────────────────────────────────────────
const CHAPTERS = [
  { no: "1장", title: "나의 이야기", items: [{ href: "story", label: "살아온 길, 고마운 사람, 좋아하는 것", done: () => has(get("note.story", {})) }] },
  { no: "2장", title: "마음 전하기", items: [{ href: "messages", label: "모임별로 전하고 싶은 말", done: () => has(get("note.messages", {})) }] },
  { no: "3장", title: "소식 전할 분들", items: [{ href: "people", label: "모임별 이름, 연락하지 않을 분", done: () => get("note.people", []).length > 0 }] },
  { no: "4장", title: "나다운 마지막 인사", items: [
    { href: "wishes", label: "바라는 장례 방식", done: () => [...plan.FIELDS, ...plan.MEMOS].some((f) => get("plan.wishes", {})[f.id]) },
    { href: "portrait", label: "나를 기억할 사진", done: null },
    { href: "obit", label: "소식 전하는 글", done: () => has(get("note.obit", {})) },
  ] },
  { no: "5장", title: "내 치료에 대한 결정", items: [{ href: "lst", label: "사전연명의료의향서 알아보기", done: () => !!get("note.lst", "") }] },
  { no: "6장", title: "재산과 상속", items: [
    { href: "assets", label: "어디에 무엇이 있는지 메모", done: () => has(get("note.assets", {})) },
    { href: "inherit", label: "우리 가족 상속 미리 보기", done: null },
    { href: "will", label: "내 뜻을 법대로 남기는 방법", done: () => get("plan.willcheck", []).length > 0 },
  ] },
  { no: "7장", title: "내 디지털 생활", items: [{ href: "digital", label: "계정·사진·구독 정리", done: () => get("plan.digital", []).length > 0 }] },
  { no: "8장", title: "노트 지킴이", items: [
    { href: "keepers", label: "지킴이 바꾸기", done: () => keepersDecided(get("note.keepers", null)) },
    { href: "notice", label: "이번 달 지킴이 안내", done: null },
    { href: "seal", label: "지킴이에게 노트 파일 보내기", done: () => !!get("note.seal", {}).made },
  ] },
];

// 홈 화면에 보여 줄 진행 상태
export function noteProgress() {
  return {
    started: keepersDecided(get("note.keepers", null)),
    filled: CHAPTERS.filter((c) => c.items.some((i) => i.done?.())).length,
    total: CHAPTERS.length,
    updated: get("note.profile", {}).updated || "",
  };
}

function renderCover(root) {
  const k = get("note.keepers", {});
  const list = validKeepers(k.list);
  const last = get("note.notice", {}).last;
  const due = k.mode === "set" && noticeDue(last, today());
  const updated = get("note.profile", {}).updated;
  let half = updated;
  for (let i = 0; i < 6 && half; i++) half = addMonth(half);
  const stale = half && half <= today();
  const filled = CHAPTERS.filter((c) => c.items.some((i) => i.done?.())).length;
  root.innerHTML = `${top({ back: "#/" })}
  <main>
    <div class="lb" style="margin-top:28px">나의 인생 노트</div>
    <h2 style="margin-top:12px">지금의 나를 정리해 두기</h2>
    <p class="lead">살아온 이야기부터 가족에게 건넬 안내까지, 한 권에 스마트하게 정리하는 노트예요. 회원가입 없이 이 기기에만 저장되고, 언제든 고칠 수 있어요.</p>
    ${due ? `<div class="box nb"><b>이번 달 지킴이 안내를 보낼 때예요</b>
      <p class="small">지킴이가 이 노트를 잊지 않도록 한 달에 한 번 알려 주세요.</p>
      <a class="btn" href="#/note/notice">지킴이 안내 보내기</a></div>` : ""}
    <dl class="kv">
      <dt>노트 지킴이</dt><dd>${k.mode === "none" ? "없음" : `${list.map((x) => esc(x.name)).join(", ")}${last ? ` · 지난 안내 ${esc(korDate(last))}` : ""}`}</dd>
      <dt>채운 장</dt><dd>${filled} / ${CHAPTERS.length}</dd>
      ${updated ? `<dt>마지막으로 다듬은 날</dt><dd>${esc(updated)}</dd>` : ""}
    </dl>
    ${k.mode === "none" ? `<p class="small">지킴이가 없으면 노트는 이 기기에만 있어요. 인쇄본을 가족이 찾기 쉬운 곳에 두세요.</p>` : ""}
    ${get("note.seal", {}).made && updated > get("note.seal", {}).made ? `<p class="small">지킴이에게 노트 파일을 보낸 뒤로 노트를 고쳤어요. <a href="#/note/seal">새 파일 보내기</a></p>` : ""}
    ${stale ? `<p class="small">마지막으로 다듬은 지 반년이 지났어요. 한 번 다시 읽어 볼까요?</p>` : ""}
    <div style="margin-top:18px">${CHAPTERS.map((c) => `<div class="ch"><span class="ch-no">${c.no}</span><b>${esc(c.title)}</b>
      ${c.items.some((i) => i.done) ? `<span class="ch-st">${c.items.some((i) => i.done?.()) ? "적음" : "비어 있음"}</span>` : ""}</div>
      ${c.items.map((i) => `<a class="row sub" href="#/note/${i.href}">${esc(i.label)} <i>›</i></a>`).join("")}`).join("")}</div>
    <div style="margin-top:28px"><a class="btn" href="#/note/kit">가족에게 건네는 노트 만들기</a></div>
    <p style="text-align:center;margin-top:12px"><a class="ul sub" href="#/note/backup">노트 백업 · 불러오기</a></p>
    ${plan.NOT_WILL}
  </main>${footer()}`;
}

// ── 노트 지킴이 ───────────────────────────────────────
function renderKeepers(root, { first = false, next = null } = {}) {
  const saved = get("note.keepers", null) || {};
  const draft = { mode: saved.mode || "", place: saved.place || "", list: (saved.list || []).map((x) => ({ ...x })) };
  if (!draft.list.length) draft.list.push({ name: "", rel: "", phone: "" });
  const back = first ? "#/" : "#/note";

  const keeperRows = () => draft.list.map((x, i) => `<div class="kp" data-i="${i}">
      <div class="kp-h"><b>${i + 1}번째 지킴이</b>${draft.list.length > 1 ? `<button class="linkbtn" data-del="${i}">빼기</button>` : ""}</div>
      <input class="search" data-f="name" placeholder="이름" value="${esc(x.name)}" maxlength="20" autocomplete="off" aria-label="${i + 1}번째 지킴이 이름">
      <input class="search" data-f="rel" placeholder="나와의 관계 (예: 큰딸)" value="${esc(x.rel)}" maxlength="20" autocomplete="off" aria-label="관계">
      <input class="search" data-f="phone" placeholder="휴대폰 번호 (선택, 문자로 안내할 때)" value="${esc(x.phone)}" inputmode="tel" maxlength="15" autocomplete="off" aria-label="휴대폰 번호">
    </div>`).join("");

  root.innerHTML = `${top({ back })}
  <main>
    <div class="lb" style="margin-top:28px">${first ? "노트를 시작하기 전에" : "8장 · 노트 지킴이"}</div>
    <h2 style="margin-top:12px">이 노트를 맡아 줄 분이 있나요?</h2>
    <p class="lead">언젠가 이 노트를 펼쳐 가족과 지인에게 마음을 전해 줄 분입니다. 세 분까지 정할 수 있어요. 지금 정하기 어렵다면 "지금은 없음"을 고르고 나중에 바꿔도 됩니다.</p>
    <div class="q">내 이름 (지킴이 안내와 인쇄본에 들어가요)</div>
    <input class="search" id="owner" value="${esc(owner())}" maxlength="20" autocomplete="off">
    <div class="q">노트 지킴이</div>
    <div class="chips" id="mode">
      <button class="chip" data-v="set" aria-pressed="${draft.mode === "set"}">지킴이 정하기</button>
      <button class="chip" data-v="none" aria-pressed="${draft.mode === "none"}">지금은 없음</button>
    </div>
    <div id="set" ${draft.mode === "set" ? "" : "hidden"}>
      <div id="kps">${keeperRows()}</div>
      <button class="linkbtn" id="add" style="margin-top:12px" ${draft.list.length >= MAX_KEEPERS ? "hidden" : ""}>한 분 더 정하기</button>
      <div class="q">인쇄한 노트를 둘 곳 (지킴이 안내에 들어가요)</div>
      <input class="search" id="place" value="${esc(draft.place)}" placeholder="예: 안방 서랍장 맨 위 칸" maxlength="40" autocomplete="off">
      <p class="why">지킴이 이름과 번호는 이 기기에만 저장돼요. 안내는 한 달에 한 번, 내 휴대폰에서 내가 직접 보냅니다. 노트 내용은 안내에 담기지 않아요.</p>
    </div>
    <p class="small" id="none-note" ${draft.mode === "none" ? "" : "hidden"}>지킴이가 없으면 노트는 이 기기에만 있어요. 인쇄본을 가족이 찾기 쉬운 곳에 두세요. 언제든 8장에서 지킴이를 정할 수 있어요.</p>
    <div style="margin-top:28px"><button class="btn" id="go">${first ? "정하고 노트 시작하기" : "저장하기"}</button></div>
    <p class="small warn" id="msg" role="status" style="margin-top:10px"></p>
  </main>${footer()}`;

  const $ = (s) => root.querySelector(s);
  const redraw = () => {
    $("#kps").innerHTML = keeperRows();
    $("#add").hidden = draft.list.length >= MAX_KEEPERS;
  };
  $("#owner").addEventListener("input", (e) => set("note.profile", { ...get("note.profile", {}), name: e.target.value.trim() }));
  $("#mode").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    draft.mode = b.dataset.v;
    root.querySelectorAll("#mode .chip").forEach((x) => x.setAttribute("aria-pressed", x === b));
    $("#set").hidden = draft.mode !== "set";
    $("#none-note").hidden = draft.mode !== "none";
  });
  $("#kps").addEventListener("input", (e) => {
    const f = e.target.dataset.f;
    if (f) draft.list[+e.target.closest(".kp").dataset.i][f] = e.target.value;
  });
  $("#kps").addEventListener("click", (e) => {
    const d = e.target.closest("[data-del]");
    if (d) { draft.list.splice(+d.dataset.del, 1); redraw(); }
  });
  $("#add").addEventListener("click", () => { draft.list.push({ name: "", rel: "", phone: "" }); redraw(); });
  $("#place").addEventListener("input", (e) => { draft.place = e.target.value; });
  $("#go").addEventListener("click", () => {
    const msg = $("#msg");
    if (!draft.mode) { msg.textContent = "지킴이를 정하거나 \"지금은 없음\"을 골라 주세요."; return; }
    let value;
    if (draft.mode === "none") value = { mode: "none", list: [], place: draft.place.trim() };
    else {
      const list = validKeepers(draft.list).map((x) => ({ name: x.name.trim(), rel: String(x.rel || "").trim(), phone: String(x.phone || "").trim() }));
      if (!list.length) { msg.textContent = "지킴이 이름을 한 분 이상 적어 주세요."; return; }
      const bad = list.find((x) => x.phone && !normPhone(x.phone));
      if (bad) { msg.textContent = `${bad.name}님의 휴대폰 번호를 확인해 주세요. 비워 두어도 됩니다.`; return; }
      value = { mode: "set", list: list.map((x) => ({ ...x, phone: normPhone(x.phone) })), place: draft.place.trim() };
    }
    noteSet("note.keepers", { ...value, decided: today() });
    // 처음 지킴이를 정했다면 첫 안내부터. 그 밖에는 가려던 곳으로.
    if (first && value.mode === "set") location.hash = "#/note/notice";
    else if (next && next !== "keepers") location.hash = `#/note/${next}`;
    else if (location.hash === "#/note") render(root);
    else location.hash = "#/note";
  });
}

// ── 월 1회 지킴이 안내 ─────────────────────────────────
function renderNotice(root) {
  const k = get("note.keepers", {});
  const list = validKeepers(k.list);
  const last = get("note.notice", {}).last;
  const url = pageUrl("#/note/keeper");
  const text = (x) => noticeText({ owner: owner(), keeper: x.name, place: k.place, url });
  const canShare = typeof navigator.share === "function";

  root.innerHTML = `${top({ back: "#/note" })}
  <main>
    <div class="lb" style="margin-top:28px">8장 · 노트 지킴이</div>
    <h2 style="margin-top:12px">지킴이 안내 보내기</h2>
    <p class="lead">지킴이가 이 노트가 있다는 걸 잊지 않도록 한 달에 한 번 알려 주세요. 안내에는 노트 내용이 담기지 않아요. 답을 받지 않아도 괜찮습니다.</p>
    ${k.mode !== "set" ? `<div class="empty">아직 지킴이를 정하지 않았어요. <a href="#/note/keepers">지킴이 정하기</a></div>` : `
    <dl class="kv"><dt>지난 안내</dt><dd id="last">${last ? esc(last) : "아직 보내지 않았어요"}</dd>
      <dt>다음 안내</dt><dd id="next">${esc(last ? addMonth(last) : "오늘")}</dd></dl>
    ${list.map((x, i) => `<div class="prod">
      <b>${esc(x.name)}${x.rel ? ` <span class="faint">· ${esc(x.rel)}</span>` : ""}</b>
      <pre class="msg">${esc(text(x))}</pre>
      <div class="acts-row">
        ${x.phone ? `<a class="btn ghost" href="sms:${esc(x.phone)}?&body=${encodeURIComponent(text(x))}">문자로 보내기</a>` : ""}
        ${canShare ? `<button class="btn ghost" data-share="${i}">카카오톡 등으로 보내기</button>` : ""}
        <button class="btn ghost" data-copy="${i}">문구 복사</button>
      </div></div>`).join("")}
    <div style="margin-top:22px"><button class="btn" id="sent">이번 달 안내를 보냈어요</button></div>
    <p class="small" id="msg" role="status" style="margin-top:10px;text-align:center"></p>

    <h3>매달 잊지 않게</h3>
    ${pushReady() ? `<div id="push"></div>` : ""}
    <p class="small">내 휴대폰 캘린더에 매달 같은 날 오전 10시 알림을 넣어 둘 수 있어요. 파일을 열면 캘린더 앱이 일정 추가를 물어봅니다.</p>
    <button class="btn ghost" id="ics" style="margin-top:10px">캘린더에 매월 알림 넣기</button>
    <p class="why">29일~31일에 시작하면 매달 28일로 잡혀요. 알림을 그만두려면 캘린더에서 이 일정을 지우세요.</p>`}
  </main>${footer()}`;
  if (k.mode !== "set") return;

  const msg = root.querySelector("#msg");
  root.addEventListener("click", async (e) => {
    const s = e.target.closest("[data-share]"), c = e.target.closest("[data-copy]");
    if (s) {
      try { await navigator.share({ text: text(list[+s.dataset.share]) }); } catch { /* 사용자가 닫음 */ }
    } else if (c) {
      try { await navigator.clipboard.writeText(text(list[+c.dataset.copy])); msg.textContent = "문구를 복사했어요. 메신저에 붙여 넣어 보내세요."; }
      catch { msg.textContent = "복사하지 못했어요. 문구를 길게 눌러 복사해 주세요."; }
    }
  });
  root.querySelector("#sent").addEventListener("click", () => {
    const n = get("note.notice", {});
    noteSet("note.notice", { last: today(), count: (n.count || 0) + 1 });
    root.querySelector("#last").textContent = today();
    root.querySelector("#next").textContent = addMonth(today());
    msg.textContent = `고마워요. 다음 안내는 ${korDate(addMonth(today()))}이에요.`;
  });
  root.querySelector("#ics").addEventListener("click", () => {
    const ics = noticeIcs({ start: today(), url: pageUrl("#/note/notice"), uid: `life-note-notice-${Date.now()}@deonaeum` });
    download(new Blob([ics], { type: "text/calendar;charset=utf-8" }), "인생노트-지킴이-안내.ics");
  });
  if (pushReady()) drawPush(root.querySelector("#push"));
}

// 매달 알림 받기 (3-A). 서버는 이 기기의 알림 주소와 날짜만 안다.
function drawPush(box) {
  const p = get("note.push", {});
  const last = get("note.notice", {}).last;
  const def = Math.min(Number((last || today()).slice(8, 10)), 28);
  const privacy = `<a href="#/privacy">개인정보처리방침</a>`;
  if (p.on) {
    box.innerHTML = `<p class="small">매달 <b>${p.day}일 오전 9시쯤</b> 이 휴대폰으로 "지킴이 안내를 보낼 때예요"라고 알려 드려요.</p>
      <button class="btn ghost" id="push-off" style="margin-top:10px">알림 끄기</button>
      <p class="small warn" id="push-msg" role="status" style="margin-top:8px"></p>`;
  } else if (!pushSupported()) {
    box.innerHTML = isIos() && !standalone()
      ? `<p class="small">아이폰은 Safari 아래쪽 공유 버튼 → <b>홈 화면에 추가</b>를 누른 뒤, 홈 화면의 더나음 아이콘으로 열면 매달 알림을 켤 수 있어요. 그 전에는 아래 캘린더 알림을 써 주세요.</p>`
      : `<p class="small">이 브라우저는 알림을 지원하지 않아요. 아래 캘린더 알림을 써 주세요.</p>`;
    return;
  } else {
    box.innerHTML = `<p class="small">매달 정한 날 이 휴대폰으로 알려 드려요. 알림 받을 주소와 날짜만 서버에 보관하고, 이름·번호·노트 내용은 보내지 않아요. ${privacy}</p>
      <div class="acts-row" style="align-items:center"><select class="num" id="push-day" aria-label="알림 날짜">${Array.from({ length: 28 }, (_, i) =>
        `<option value="${i + 1}"${i + 1 === def ? " selected" : ""}>매달 ${i + 1}일</option>`).join("")}</select>
      <button class="btn" id="push-on">알림 켜기</button></div>
      <p class="small warn" id="push-msg" role="status" style="margin-top:8px"></p>`;
  }
  const msg = box.querySelector("#push-msg");
  box.querySelector("#push-on")?.addEventListener("click", async (e) => {
    e.target.disabled = true; msg.textContent = "켜는 중…";
    const day = Number(box.querySelector("#push-day").value);
    try { await enablePush(day); set("note.push", { on: true, day }); drawPush(box); }
    catch (err) { msg.textContent = err.message; e.target.disabled = false; }
  });
  box.querySelector("#push-off")?.addEventListener("click", async (e) => {
    e.target.disabled = true; msg.textContent = "끄는 중…";
    try { await disablePush(); set("note.push", { on: false }); drawPush(box); }
    catch (err) { msg.textContent = err.message; e.target.disabled = false; }
  });
}

// 지킴이 안내를 받은 분이 여는 화면. 잠근 노트 파일을 받았다면 여기서 펼친다.
// 펼친 노트는 이 화면의 메모리에만 두고 지킴이 기기에 저장하지 않는다.
function renderKeeperGuide(root) {
  root.innerHTML = `${top({ back: "#/" })}
  <main>
    <div class="lb" style="margin-top:28px">나의 인생 노트</div>
    <h2 style="margin-top:12px">노트 지킴이가 되셨어요</h2>
    <p class="lead">소중한 분이 지금의 이야기를 정리한 인생 노트를 쓰고 있고, 당신을 그 노트를 맡아 줄 분으로 정했어요. 한 달에 한 번 안내를 받게 됩니다.</p>
    <h3>지킴이가 하는 일</h3>
    <ol class="steps">
      <li>인쇄한 노트가 어디 있는지 기억해 두세요. 안내 문구에 보관 장소가 적혀 있어요.</li>
      <li>노트 파일을 받았다면 휴대폰에 잘 보관해 두세요. 비밀 문구는 봉투 속 카드에 있어요.</li>
      <li>필요한 날이 오면 노트를 펼쳐, 적힌 바람대로 가족과 지인에게 마음과 소식을 전해 주세요.</li>
    </ol>

    <h3>노트 펼치기</h3>
    <p class="small">받은 노트 파일과 봉투 속 비밀 문구가 있어야 열 수 있어요. 파일은 이 휴대폰 안에서만 풀리고 어디로도 보내지지 않습니다.</p>
    <label class="btn ghost" style="margin-top:12px">노트 파일 고르기<input type="file" id="k-file" accept=".json,application/json,text/plain" hidden></label>
    <p class="small" id="k-name" style="margin-top:6px"></p>
    <input class="search" id="k-code" placeholder="비밀 문구 (예: ABCD-EFGH-JKMN)" autocomplete="off" autocapitalize="characters" spellcheck="false">
    <button class="btn" id="k-open" style="margin-top:12px">노트 펼치기</button>
    <p class="small warn" id="k-msg" role="status" style="margin-top:8px"></p>
    <p class="notice">파일이 없다면 인쇄한 노트를 펼쳐 주세요. 노트는 쓰신 분의 휴대폰과 인쇄본에만 있습니다.</p>

    <h3>그날이 오면</h3>
    <p class="small">장례를 치러야 할 때는 더나음 장례안내가 할 일을 시간 순서대로 안내해 드려요. 장례식장, 화장장, 상조회사도 공식 자료로 비교할 수 있습니다.</p>
    <a class="row" href="#/after/start">장례 절차 안내 보기 <i>›</i></a>
    <p class="small" style="margin-top:18px">안내를 그만 받고 싶으면 보내 주신 분께 편하게 말씀해 주세요.</p>
    <p style="margin-top:22px"><a class="ul" href="#/note">나도 인생 노트 써 보기 →</a></p>
  </main>${footer()}`;

  const $ = (s) => root.querySelector(s);
  let text = null;
  $("#k-file").addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    text = f ? await f.text() : null;
    $("#k-name").textContent = f ? `고른 파일: ${f.name}` : "";
  });
  $("#k-open").addEventListener("click", async () => {
    const msg = $("#k-msg");
    if (!text) { msg.textContent = "먼저 노트 파일을 골라 주세요."; return; }
    if (!$("#k-code").value.trim()) { msg.textContent = "봉투 속 카드의 비밀 문구를 적어 주세요."; return; }
    msg.textContent = "푸는 중…";
    $("#k-open").disabled = true;
    try {
      const { made, payload } = await unseal(text, $("#k-code").value);
      const { data } = parseBackup(JSON.stringify(payload));
      renderOpened(root, data, made);
    } catch (err) {
      msg.textContent = err.message;
      $("#k-open").disabled = false;
    }
  });
}

// 지킴이 기기에서 펼친 노트. 위에는 소식 전하기 도우미, 아래에는 노트 전체.
// 이 화면은 그날의 가족용이라 "부고", "빈소" 같은 정식 용어를 쓴다.
function renderOpened(root, data, made) {
  const read = (k, fb) => (k in data ? data[k] : fb);
  const name = owner(read);
  const obit = read("note.obit", {});
  const w = read("plan.wishes", {});
  const fill = { date: "", hall: "", departure: "", burial: obit.burial || (w.burial && w.burial !== plan.LEAVE ? w.burial : ""), chief: "" };
  const msgs = read("note.messages", {});
  const ppl = read("note.people", []);
  const groups = [...new Set([...GROUPS, ...ppl.map((p) => p.group)])].filter((g) => ppl.some((p) => p.group === g && !p.exclude));
  const withMsg = new Set(groups.filter((g) => String(msgs[g] || "").trim()));
  const sent = new Set();
  const canShare = typeof navigator.share === "function";

  const news = (g) => {
    const base = obituaryDraft({ name, ...obit, ...fill });
    const m = g && withMsg.has(g) && String(msgs[g] || "").trim();
    return m ? `${base}\n\n— ${name || "고인"}님이 ${g}에게 남긴 말 —\n${m}` : base;
  };

  root.innerHTML = `${top({ back: "#/note/keeper" })}
  <main class="paper">
    <div class="noprint">
      <div class="lb" style="margin-top:28px">노트 지킴이</div>
      <h2 style="margin-top:12px">${esc(name || "")}님의 인생 노트</h2>
      <p class="small">${made ? `${esc(made)}에 만든 노트입니다. ` : ""}이 화면을 닫으면 다시 파일을 열어야 해요. 노트는 이 휴대폰에 저장되지 않습니다.</p>

      <h3>부고 보내기</h3>
      <p class="small">빈칸을 채우면 아래 글에 바로 들어갑니다. 모르는 칸은 비워 두셔도 됩니다.</p>
      <div class="q">돌아가신 날</div><input class="search" data-fill="date" placeholder="예: 2026년 12월 1일" autocomplete="off">
      <div class="q">빈소</div><input class="search" data-fill="hall" placeholder="예: ○○장례식장 3호실 (주소)" autocomplete="off">
      <div class="q">발인</div><input class="search" data-fill="departure" placeholder="예: 12월 3일 오전 7시" autocomplete="off">
      <div class="q">장지</div><input class="search" data-fill="burial" value="${esc(fill.burial)}" autocomplete="off">
      <div class="q">상주</div><input class="search" data-fill="chief" placeholder="예: 장남 ○○○" autocomplete="off">
      <div class="q">보낼 글</div>
      <pre class="msg" id="news">${esc(news(""))}</pre>
      <div class="acts-row">
        ${canShare ? `<button class="btn ghost" data-share="">카카오톡 등으로 보내기</button>` : ""}
        <button class="btn ghost" data-copy="">글 복사</button>
      </div>
      <p class="small" id="o-msg" role="status" style="margin-top:8px"></p>

      ${groups.length ? `<h3>모임별로 보내기</h3>
      <p class="small">${esc(name || "")}님이 적어 둔 분들입니다. 문자를 누르면 글이 채워진 문자 창이 열려요. 보낸 분은 "보냄"으로 표시됩니다.</p>
      ${groups.map((g) => `<div class="box"><div class="box-h"><span>${esc(g)}</span><span>${ppl.filter((p) => p.group === g && !p.exclude).length}분</span></div>
        ${withMsg.has(g) ? `<label class="small" style="display:block;padding:6px 0"><input type="checkbox" data-gm="${esc(g)}" checked> ${esc(g)}에게 남긴 말 함께 보내기</label>` : ""}
        ${ppl.map((p, i) => ({ ...p, i })).filter((p) => p.group === g && !p.exclude).map((p) => `<div class="fac"><div><b>${esc(p.name)}</b></div>
          <div class="meta">${p.phone ? esc(dash(p.phone)) : "번호 없음 · 직접 연락해 주세요"}</div>
          <div class="acts">${p.phone ? `<a class="call" data-sms="${p.i}" data-g="${esc(g)}" href="#">문자</a>` : ""}
            <button class="save" data-done="${p.i}" aria-pressed="false">보냄 표시</button></div></div>`).join("")}
        <div class="acts-row" style="margin:8px 0 10px">${canShare ? `<button class="btn ghost" data-share="${esc(g)}">${esc(g)}에게 공유</button>` : ""}<button class="btn ghost" data-copy="${esc(g)}">${esc(g)}용 글 복사</button></div>
      </div>`).join("")}` : ""}
      ${ppl.some((p) => p.exclude) ? `<p class="small warn" style="margin-top:12px">연락하지 않기를 바라신 분: ${esc(ppl.filter((p) => p.exclude).map((p) => p.name).join(", "))}</p>` : ""}
      ${String(msgs.special || "").trim() ? `<div class="prod"><b>꼭 전하고 싶은 말</b><p>${esc(msgs.special).replace(/\n/g, "<br>")}</p><p class="small">받으실 분께 직접 전해 주세요.</p></div>` : ""}

      <h3>다음 할 일</h3>
      <a class="row" href="#/after/start" target="_blank" rel="noopener">장례 절차 안내 (새 창) <i>›</i></a>
      <button class="btn ghost" id="o-print" style="margin-top:14px">노트 전체 인쇄 · PDF 저장</button>
      <hr class="rule" style="margin:24px 0">
      <h3>노트 전체</h3>
    </div>
    <div id="o-body">${kitSections([], read)}</div>
  </main>`;

  const $ = (s) => root.querySelector(s);
  const msg = $("#o-msg");
  const mark = (i, on) => {
    on ? sent.add(i) : sent.delete(i);
    const b = root.querySelector(`[data-done="${i}"]`);
    b.setAttribute("aria-pressed", on);
    b.textContent = on ? "보냄" : "보냄 표시";
  };
  root.querySelectorAll("[data-fill]").forEach((el) => el.addEventListener("input", () => { fill[el.dataset.fill] = el.value; $("#news").textContent = news(""); }));
  root.addEventListener("change", (e) => {
    const c = e.target.closest("[data-gm]");
    if (c) c.checked ? withMsg.add(c.dataset.gm) : withMsg.delete(c.dataset.gm);
  });
  root.addEventListener("click", async (e) => {
    const sh = e.target.closest("[data-share]"), cp = e.target.closest("[data-copy]");
    const sm = e.target.closest("[data-sms]"), dn = e.target.closest("[data-done]");
    if (sh) { try { await navigator.share({ text: news(sh.dataset.share) }); } catch { /* 닫음 */ } }
    if (cp) {
      try { await navigator.clipboard.writeText(news(cp.dataset.copy)); msg.textContent = "글을 복사했어요."; }
      catch { msg.textContent = "복사하지 못했어요. 글을 길게 눌러 복사해 주세요."; }
    }
    if (sm) {
      e.preventDefault();
      location.href = `sms:${ppl[+sm.dataset.sms].phone}?&body=${encodeURIComponent(news(sm.dataset.g))}`;
      mark(+sm.dataset.sms, true);
    }
    if (dn) mark(+dn.dataset.done, !sent.has(+dn.dataset.done));
  });
  $("#o-print").addEventListener("click", () => window.print());
  window.scrollTo(0, 0);
}

// ── 지킴이에게 노트 파일 보내기 ─────────────────────────
function renderSeal(root) {
  const k = get("note.keepers", {});
  const list = validKeepers(k.list);
  const s = get("note.seal", {});
  const code = s.code || makeCode();
  const updated = get("note.profile", {}).updated;
  const canFiles = typeof navigator.canShare === "function";
  root.innerHTML = `${top({ back: "#/note" })}
  <main class="paper">
    <div class="noprint">
      <div class="lb" style="margin-top:28px">8장 · 노트 지킴이</div>
      <h2 style="margin-top:12px">지킴이에게 노트 파일 보내기</h2>
      <p class="lead">필요한 날 지킴이가 휴대폰에서 노트를 펼치고 소식을 전할 수 있도록, 비밀 문구로 잠근 노트 파일을 미리 보내 둡니다. 비밀 문구가 없으면 아무도 열 수 없어요.</p>
      ${k.mode !== "set" ? `<div class="empty">아직 지킴이를 정하지 않았어요. <a href="#/note/keepers">지킴이 정하기</a></div>` : `
      <h3>1. 비밀 문구</h3>
      <p class="big-code" id="code">${esc(code)}</p>
      <p class="small">이 문구는 이 기기에만 있어요. 파일과 같은 메신저로 보내지 말고, 아래 카드를 인쇄해 봉투에 넣어 직접 건네세요.</p>
      <div class="acts-row"><button class="btn ghost" id="card">비밀 문구 카드 인쇄</button>${s.code ? `<button class="btn ghost" id="renew">문구 새로 만들기</button>` : ""}</div>
      <h3>2. 노트 파일</h3>
      ${s.made ? `<p class="small">지난번 파일: ${esc(s.made)}에 만듦${updated && updated > s.made ? " · <b>그 뒤로 노트를 고쳤어요. 새 파일을 보내 주세요.</b>" : ""}</p>` : ""}
      <button class="btn" id="make" style="margin-top:8px">잠근 노트 파일 만들기</button>
      <p class="small" id="msg" role="status" style="margin-top:8px"></p>
      <div id="send" hidden>
        ${canFiles ? list.map((x, i) => `<div class="prod"><b>${esc(x.name)}${x.rel ? ` <span class="faint">· ${esc(x.rel)}</span>` : ""}</b>
          <div class="acts-row"><button class="btn ghost" data-send="${i}">카카오톡 등으로 파일 보내기</button></div></div>`).join("") : ""}
        <button class="btn ghost" id="down" style="margin-top:12px">파일 내려받기</button>
        <p class="why">휴대폰에서 파일 보내기가 안 되면 내려받은 파일을 메신저나 이메일에 첨부해 보내세요. 사진은 파일에 들어가지 않아요.</p>
      </div>
      <p class="notice">노트를 고치면 새 파일을 다시 보내 주세요. 지킴이 휴대폰에 있는 파일은 보낸 날의 노트입니다. 문구를 새로 만들면 예전 카드로는 새 파일을 열 수 없어요.</p>`}
    </div>
    <section class="print-only seal-card">
      <h2>인생 노트 비밀 문구</h2>
      <p class="big-code">${esc(code)}</p>
      <ol class="guide">
        <li>휴대폰에서 받은 "인생 노트" 파일을 찾아 둡니다.</li>
        <li>${esc(pageUrl("#/note/keeper"))} 에 들어갑니다.</li>
        <li>"노트 파일 고르기"로 파일을 고르고, 위 비밀 문구를 적습니다.</li>
      </ol>
      <p class="small">${owner() ? `${esc(owner())}님이 ` : ""}${esc(today())}에 만든 카드입니다. 이 카드는 노트 파일과 따로 보관해 주세요.</p>
    </section>
  </main><div class="noprint">${footer()}</div>`;
  if (k.mode !== "set") return;

  const $ = (sel) => root.querySelector(sel);
  if (!s.code) set("note.seal", { ...s, code });
  let file = null;
  $("#card").addEventListener("click", () => window.print());
  $("#renew")?.addEventListener("click", () => {
    if (!confirm("비밀 문구를 새로 만들까요? 지킴이에게 새 카드와 새 파일을 다시 건네야 합니다.")) return;
    set("note.seal", { code: makeCode() });
    renderSeal(root);
  });
  $("#make").addEventListener("click", async () => {
    $("#msg").textContent = "잠그는 중…";
    $("#make").disabled = true;
    try {
      const sealed = await seal(buildBackup((key) => get(key, undefined)), code, { made: today() });
      file = new File([JSON.stringify(sealed)], `인생노트-${owner() || "지킴이용"}-${today()}.json`, { type: "application/json" });
      set("note.seal", { code, made: today() });
      $("#msg").textContent = "파일을 만들었어요. 지킴이에게 보내세요.";
      $("#send").hidden = false;
    } catch {
      $("#msg").textContent = "파일을 만들지 못했어요. 브라우저를 최신으로 바꾸거나 다른 브라우저에서 해 보세요.";
    }
    $("#make").disabled = false;
  });
  root.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-send]");
    if (!b || !file) return;
    if (!navigator.canShare({ files: [file] })) { $("#msg").textContent = "이 휴대폰에서는 파일 보내기가 안 돼요. 파일을 내려받아 보내 주세요."; return; }
    try { await navigator.share({ files: [file], title: "인생 노트" }); } catch { /* 닫음 */ }
  });
  $("#down").addEventListener("click", () => file && download(file, file.name));
}

// ── 글 적는 장 공용 ───────────────────────────────────
function fieldsHtml(fields, val) {
  return fields.map((f) => `<div class="q">${esc(f.q)}</div>
    ${f.area
      ? `<textarea class="search memo" data-k="${f.id}" rows="${f.rows || 4}" placeholder="${esc(f.ph || "")}">${esc(val[f.id] || "")}</textarea>`
      : `<input class="search" data-k="${f.id}" value="${esc(val[f.id] || "")}" placeholder="${esc(f.ph || "")}" autocomplete="off">`}
    ${f.why ? `<p class="why">${esc(f.why)}</p>` : ""}${f.guard ? `<p class="small warn" data-w="${f.id}" hidden>번호처럼 보이는 숫자가 있어요. 비밀번호·계좌번호·주민등록번호는 적지 마세요.</p>` : ""}`).join("");
}

function bindFields(root, key, onInput) {
  root.querySelectorAll("[data-k]").forEach((el) => el.addEventListener("input", () => {
    noteSet(key, { ...get(key, {}), [el.dataset.k]: el.value });
    const w = root.querySelector(`[data-w="${el.dataset.k}"]`);
    if (w) w.hidden = !looksLikeSecretNumber(el.value);
    onInput?.();
  }));
  root.querySelectorAll("[data-w]").forEach((w) => { w.hidden = !looksLikeSecretNumber(root.querySelector(`[data-k="${w.dataset.w}"]`)?.value); });
}

const SAVED = `<p class="small" style="text-align:center;margin-top:18px">적는 대로 이 기기에 저장돼요.</p>`;

// ── 1장 나의 이야기 ───────────────────────────────────
const STORY = [
  { id: "born", q: "태어난 곳", ph: "예: 경남 통영" },
  { id: "path", q: "살아온 길", area: true, rows: 6, ph: "한 줄에 하나씩 적어 보세요.\n예: 1958 통영에서 태어남\n1984 결혼\n2019 손주가 태어남", why: "소식 전하는 글이나 추모의 말에 쓰일 수 있어요." },
  { id: "thanks", q: "고마운 사람들", area: true, ph: "누구에게, 왜 고마운지" },
  { id: "food", q: "좋아하는 음식", ph: "" },
  { id: "song", q: "좋아하는 노래", ph: "", why: "가족이 마지막 인사 자리에서 틀어 드릴 수 있어요." },
  { id: "place", q: "좋아하는 곳", ph: "" },
];

function renderStory(root) {
  root.innerHTML = `${top({ back: "#/note" })}
  <main>
    <div class="lb" style="margin-top:28px">1장</div>
    <h2 style="margin-top:12px">나의 이야기</h2>
    <p class="lead">부담 없이 떠오르는 것부터 적어 보세요. 모두 비워 두어도 괜찮아요.</p>
    ${fieldsHtml(STORY, get("note.story", {}))}
    ${SAVED}
    <div style="margin-top:18px"><a class="btn ghost" href="#/note/messages">다음 장: 마음 전하기</a></div>
  </main>${footer()}`;
  bindFields(root, "note.story");
}

// ── 2장 마음 전하기 ───────────────────────────────────
const MSG_FIELDS = [
  ...GROUPS.map((g) => ({ id: g, q: `${g}에게`, area: true, ph: "" })),
  { id: "special", q: "꼭 전하고 싶은 말", area: true, ph: "특정한 분에게 따로 남기고 싶은 말" },
];

function renderMessages(root) {
  root.innerHTML = `${top({ back: "#/note" })}
  <main>
    <div class="lb" style="margin-top:28px">2장</div>
    <h2 style="margin-top:12px">마음 전하기</h2>
    <p class="lead">모임마다 다른 말을 남길 수 있어요. 언젠가 지킴이가 소식을 전할 때 함께 전해 드립니다.</p>
    <p class="notice" style="margin-top:12px">마음을 전하는 글이며 법적 효력이 있는 유언이 아닙니다.</p>
    ${fieldsHtml(MSG_FIELDS, get("note.messages", {}))}
    <p class="small warn" id="bq" hidden>재산에 관한 뜻은 이 글로는 효력이 없어요. <a href="#/note/will">내 뜻을 법대로 남기는 방법</a>을 보세요.</p>
    ${SAVED}
  </main>${footer()}`;
  const check = () => { root.querySelector("#bq").hidden = !Object.values(get("note.messages", {})).some(looksLikeBequest); };
  bindFields(root, "note.messages", check);
  check();
}

// ── 3장 소식 전할 분들 ─────────────────────────────────
function renderPeople(root) {
  const contacts = "contacts" in navigator && typeof navigator.contacts?.select === "function";
  root.innerHTML = `${top({ back: "#/note" })}
  <main>
    <div class="lb" style="margin-top:28px">3장</div>
    <h2 style="margin-top:12px">소식 전할 분들</h2>
    <p class="lead">언젠가 소식을 전할 분들을 모임별로 적어 두세요. 이름만 적어도 돼요. 번호는 선택입니다.</p>
    <div class="q">한 분씩 더하기</div>
    <input class="search" id="p-name" placeholder="이름" maxlength="40" autocomplete="off">
    <select class="num" id="p-group" aria-label="모임" style="margin-top:10px">${GROUPS.map((g) => `<option>${esc(g)}</option>`).join("")}</select>
    <input class="search" id="p-phone" placeholder="휴대폰 번호 (선택)" inputmode="tel" maxlength="15" autocomplete="off">
    <button class="btn ghost" id="p-add" style="margin-top:12px">더하기</button>
    <div class="acts-row">
      <label class="btn ghost">CSV 파일로 가져오기<input type="file" id="p-csv" accept=".csv,text/csv" hidden></label>
      ${contacts ? `<button class="btn ghost" id="p-pick">주소록에서 고르기</button>` : ""}
    </div>
    <p class="why">CSV는 한 줄에 "이름,모임,전화" 순서입니다. 엑셀에서 "다른 이름으로 저장 → CSV"로 만들 수 있어요. 파일은 이 기기 안에서만 읽어요.</p>
    <p class="small warn" id="p-msg" role="status"></p>
    <div id="p-list"></div>
    <p class="notice">적은 분들은 이 기기에만 있어요. 기기를 바꾸거나 브라우저 기록을 지우면 사라지니 <a href="#/note/kit">인쇄본</a>이나 <a href="#/note/backup">백업 파일</a>을 만들어 두세요.</p>
  </main>${footer()}`;

  const $ = (s) => root.querySelector(s);
  const draw = () => {
    const ppl = get("note.people", []);
    const by = (g) => ppl.map((p, i) => ({ ...p, i })).filter((p) => p.group === g);
    const groups = [...new Set([...GROUPS, ...ppl.map((p) => p.group)])];
    $("#p-list").innerHTML = ppl.length ? groups.filter((g) => by(g).length).map((g) => `<div class="box"><div class="box-h"><span>${esc(g)}</span><span>${by(g).length}분</span></div>
      ${by(g).map((p) => `<div class="fac"><div><b${p.exclude ? ' class="faint"' : ""}>${esc(p.name)}</b></div>
        <div class="meta">${p.phone ? esc(dash(p.phone)) : "번호 없음"}${p.exclude ? " · 연락하지 않을 분" : ""}</div>
        <div class="acts"><button class="save" data-ex="${p.i}" aria-pressed="${!!p.exclude}">${p.exclude ? "연락 안 함" : "연락하지 않기"}</button>
        <button class="save" data-rm="${p.i}">지우기</button></div></div>`).join("")}</div>`).join("")
      : `<div class="empty" style="margin-top:14px">아직 적은 분이 없어요.</div>`;
  };
  const addAll = (rows) => {
    const ppl = get("note.people", []);
    const seen = new Set(ppl.map((p) => p.name + "|" + p.phone));
    const fresh = rows.filter((r) => r.name && !seen.has(r.name + "|" + r.phone));
    noteSet("note.people", [...ppl, ...fresh]);
    draw();
    return fresh.length;
  };
  $("#p-add").addEventListener("click", () => {
    const name = $("#p-name").value.trim();
    const raw = $("#p-phone").value.trim();
    if (!name) { $("#p-msg").textContent = "이름을 적어 주세요."; return; }
    if (raw && !normPhone(raw)) { $("#p-msg").textContent = "휴대폰 번호를 확인해 주세요. 비워 두어도 됩니다."; return; }
    addAll([{ name, group: $("#p-group").value, phone: normPhone(raw), exclude: false }]);
    $("#p-name").value = ""; $("#p-phone").value = ""; $("#p-msg").textContent = "";
  });
  $("#p-csv").addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const n = addAll(parseCsv(await f.text()));
    $("#p-msg").textContent = n ? `${n}분을 더했어요.` : "더할 분을 찾지 못했어요. 파일 형식을 확인해 주세요.";
    e.target.value = "";
  });
  $("#p-pick")?.addEventListener("click", async () => {
    try {
      const picked = await navigator.contacts.select(["name", "tel"], { multiple: true });
      const n = addAll(picked.map((c) => ({ name: (c.name?.[0] || "").trim(), group: $("#p-group").value, phone: normPhone(c.tel?.[0]), exclude: false })));
      $("#p-msg").textContent = `${n}분을 더했어요.`;
    } catch { /* 사용자가 닫음 */ }
  });
  $("#p-list").addEventListener("click", (e) => {
    const ex = e.target.closest("[data-ex]"), rm = e.target.closest("[data-rm]");
    const ppl = get("note.people", []);
    if (ex) { ppl[+ex.dataset.ex].exclude = !ppl[+ex.dataset.ex].exclude; noteSet("note.people", ppl); draw(); }
    if (rm && confirm(`${ppl[+rm.dataset.rm].name}님을 목록에서 지울까요?`)) { ppl.splice(+rm.dataset.rm, 1); noteSet("note.people", ppl); draw(); }
  });
  draw();
}

// ── 4장 소식 전하는 글 ─────────────────────────────────
function renderObit(root) {
  const o = get("note.obit", {});
  const w = get("plan.wishes", {});
  const val = { term: o.term || "general", burial: o.burial ?? (w.burial && w.burial !== plan.LEAVE ? w.burial : ""), words: o.words || "" };
  const draft = () => obituaryDraft({ name: owner(), ...val });
  root.innerHTML = `${top({ back: "#/note" })}
  <main>
    <div class="lb" style="margin-top:28px">4장 · 나다운 마지막 인사</div>
    <h2 style="margin-top:12px">소식 전하는 글</h2>
    <p class="lead">언젠가 지킴이가 보낼 소식 글(부고)을 미리 다듬어 둡니다. 날짜와 장소는 비워 두면 지킴이가 그때 채워요.</p>
    <div class="q">표현</div>
    <div class="filters" id="term">${TERMS.map((t) => `<button class="chip" data-v="${t.id}" aria-pressed="${val.term === t.id}">${esc(t.label)}</button>`).join("")}</div>
    <p class="why">종교 단체마다 쓰는 말이 다를 수 있어요. 다니는 곳에 물어 맞는 말을 고르세요.</p>
    <div class="q">모실 곳</div>
    <input class="search" id="burial" value="${esc(val.burial)}" placeholder="비워 두면 지킴이가 채워요" maxlength="40" autocomplete="off">
    <div class="q">덧붙이는 한마디</div>
    <textarea class="search memo" id="words" rows="3" placeholder="예: 조화와 부의는 정중히 사양합니다.">${esc(val.words)}</textarea>
    <div class="q">미리 보기</div>
    <pre class="msg" id="pv">${esc(draft())}</pre>
    ${owner() ? "" : `<p class="small">이름은 <a href="#/note/keepers">노트 지킴이</a> 화면에서 적을 수 있어요.</p>`}
    <button class="btn ghost" id="copy" style="margin-top:10px">문구 복사</button>
    <p class="small" id="msg" role="status" style="margin-top:8px"></p>
  </main>${footer()}`;
  const $ = (s) => root.querySelector(s);
  const save = () => { noteSet("note.obit", { ...val }); $("#pv").textContent = draft(); };
  $("#term").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    val.term = b.dataset.v;
    root.querySelectorAll("#term .chip").forEach((x) => x.setAttribute("aria-pressed", x === b));
    save();
  });
  $("#burial").addEventListener("input", (e) => { val.burial = e.target.value; save(); });
  $("#words").addEventListener("input", (e) => { val.words = e.target.value; save(); });
  $("#copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(draft()); $("#msg").textContent = "복사했어요."; }
    catch { $("#msg").textContent = "복사하지 못했어요. 글을 길게 눌러 복사해 주세요."; }
  });
}

// ── 6장 재산 위치 메모 ─────────────────────────────────
const ASSETS = [
  { id: "banks", q: "거래하는 은행·증권사", ph: "예: ○○은행 동네 지점, ○○증권", guard: true },
  { id: "insurance", q: "가입한 보험", ph: "예: ○○생명 종신보험 (증권은 서류함)", guard: true },
  { id: "pension", q: "연금", ph: "예: 국민연금, 개인연금(○○은행)", guard: true },
  { id: "realty", q: "부동산", ph: "예: 살고 있는 집, 고향 밭 (주소만)", guard: true },
  { id: "sangjo", q: "가입한 상조회사", ph: "예: ○○상조 (증서는 안방 서랍)", guard: true },
  { id: "willPlace", q: "유언장을 썼다면 보관 장소", ph: "예: 공증사무소, 금고", guard: true },
  { id: "etc", q: "그 밖에 알려 둘 것", area: true, ph: "", guard: true },
];

function renderAssets(root) {
  root.innerHTML = `${top({ back: "#/note" })}
  <main>
    <div class="lb" style="margin-top:28px">6장 · 재산과 상속</div>
    <h2 style="margin-top:12px">어디에 무엇이 있는지</h2>
    <p class="lead">금액은 적지 않아도 돼요. 가족이 어디부터 찾아보면 되는지만 남겨 두세요.</p>
    <p class="notice" style="margin-top:12px"><b>비밀번호·계좌번호·주민등록번호는 적지 마세요.</b> 노트는 인쇄해 건네는 것이라 다른 사람 눈에 띌 수 있어요.</p>
    ${fieldsHtml(ASSETS, get("note.assets", {}))}
    <p class="why">가족은 나중에 정부24 <a href="https://www.gov.kr/portal/onestopSvc/safeInheritance" target="_blank" rel="noopener">안심상속 원스톱 서비스</a>로 금융·토지·자동차·연금 등을 한 번에 조회할 수 있어요.
      상조회사의 재무 안전성은 <a href="#/before/sangjo">상조회사 비교</a>에서 볼 수 있습니다.</p>
    ${SAVED}
  </main>${footer()}`;
  bindFields(root, "note.assets");
}

// ── 가족에게 건네는 노트 (인쇄본) ───────────────────────
const KIT = [
  { id: "story", label: "나의 이야기" }, { id: "messages", label: "마음 전하기" }, { id: "people", label: "소식 전할 분들" },
  { id: "wishes", label: "바라는 장례 방식" }, { id: "obit", label: "소식 전하는 글" }, { id: "assets", label: "어디에 무엇이 있는지" },
  { id: "digital", label: "디지털 생활" }, { id: "lst", label: "내 치료에 대한 결정" },
];

function kitSections(off, read = get) {
  const nl = (s) => esc(s).replace(/\n/g, "<br>");
  const dl = (rows) => rows.length ? `<dl class="kv">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${nl(v)}</dd>`).join("")}</dl>` : `<p class="small">적은 내용이 없습니다.</p>`;
  const pick = (fields, val) => fields.map((f) => [f.q, val[f.id]]).filter(([, v]) => String(v ?? "").trim());
  const sec = {
    story: () => dl(pick(STORY, read("note.story", {}))),
    messages: () => `<p class="small">마음을 전하는 글이며 법적 효력이 있는 유언이 아닙니다.</p>${dl(pick(MSG_FIELDS, read("note.messages", {})))}`,
    people: () => {
      const ppl = read("note.people", []);
      if (!ppl.length) return `<p class="small">적은 내용이 없습니다.</p>`;
      const groups = [...new Set(ppl.map((p) => p.group))];
      const line = (p) => p.name + (p.phone ? " " + dash(p.phone) : "");
      const ex = ppl.filter((p) => p.exclude);
      return dl(groups.map((g) => [g, ppl.filter((p) => p.group === g && !p.exclude).map(line).join("\n")]).filter(([, v]) => v))
        + (ex.length ? `<p class="small">연락하지 않을 분: ${esc(ex.map(line).join(", "))}</p>` : "");
    },
    wishes: () => dl(pick([...plan.FIELDS, ...plan.MEMOS], read("plan.wishes", {}))),
    obit: () => `<pre class="msg">${esc(obituaryDraft({ name: owner(read), ...read("note.obit", {}) }))}</pre>`,
    assets: () => dl(pick(ASSETS, read("note.assets", {}))),
    digital: () => {
      const on = read("plan.digital", []);
      return dl(plan.DIGITAL.map((d) => [d.t, on.includes(d.id) ? "해 두었어요" : "아직"]));
    },
    lst: () => dl([["사전연명의료의향서", read("note.lst", "") || "적지 않음"]]),
  };
  return KIT.filter((x) => !off.includes(x.id)).map((x) => `<section class="kit-sec"><h3>${esc(x.label)}</h3>${sec[x.id]()}</section>`).join("");
}

function renderKit(root) {
  const k = get("note.keepers", {});
  const off = get("note.kit", {}).off || [];
  const draw = () => {
    const offNow = get("note.kit", {}).off || [];
    root.querySelector("#kit-body").innerHTML = `
      <h2>${esc(owner() || "나")}의 인생 노트</h2>
      <p class="small">만든 날 ${esc(today())}${k.mode === "set" ? ` · 노트 지킴이 ${validKeepers(k.list).map((x) => esc(x.name) + (x.rel ? `(${esc(x.rel)})` : "")).join(", ")}` : ""}</p>
      ${kitSections(offNow)}
      <section class="kit-sec"><h3>가족에게 드리는 안내</h3>
        <p class="small">장례를 치러야 할 때는 더나음 장례안내(${esc(location.host + location.pathname)})의 "장례 안내"에서 할 일을 시간 순서대로 볼 수 있어요. 장례식장·화장장·상조회사도 공식 자료로 비교할 수 있습니다.</p>
        <p class="small">이 노트는 바람과 마음을 전하려고 적은 것이며 법적 효력이 있는 유언이 아닙니다. 가족이 상황에 맞게 정할 수 있어요. 재산에 관한 뜻은 민법이 정한 방식의 유언으로 따로 남겨야 합니다(민법 제1065조).</p>
      </section>`;
  };
  root.innerHTML = `${top({ back: "#/note" })}
  <main class="paper">
    <div class="noprint">
      <div class="lb" style="margin-top:28px">나의 인생 노트</div>
      <h2 style="margin-top:12px">가족에게 건네는 노트</h2>
      <p class="lead">넣을 장을 고르고 인쇄하거나, 인쇄 창에서 "PDF로 저장"을 고르세요. 봉투에 넣어 지킴이에게 직접 건네는 것을 권해요. 서버에는 아무것도 올라가지 않습니다.</p>
      <div class="filters" id="kit-pick">${KIT.map((x) => `<button class="chip" data-v="${x.id}" aria-pressed="${!off.includes(x.id)}">${esc(x.label)}</button>`).join("")}</div>
      ${k.mode === "set" && !k.place ? `<p class="small">보관 장소를 정했다면 <a href="#/note/keepers">지킴이 화면</a>에 적어 두세요. 지킴이 안내에 함께 들어가요.</p>` : ""}
      <div style="margin:16px 0 8px"><button class="btn" id="doprint">인쇄 · PDF 저장</button></div>
      <p class="small">나를 기억할 사진은 <a href="#/note/portrait">사진 화면</a>에서 따로 인쇄하거나 내려받으세요.</p>
      <hr class="rule" style="margin:24px 0">
    </div>
    <div id="kit-body"></div>
    <p class="small print-only">더나음 · 나의 인생 노트</p>
  </main>
  <div class="noprint">${footer()}</div>`;
  root.querySelector("#kit-pick").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    const on = b.getAttribute("aria-pressed") !== "true";
    b.setAttribute("aria-pressed", on);
    const cur = new Set(get("note.kit", {}).off || []);
    on ? cur.delete(b.dataset.v) : cur.add(b.dataset.v);
    set("note.kit", { off: [...cur] });
    draw();
  });
  root.querySelector("#doprint").addEventListener("click", () => window.print());
  draw();
}

// ── 백업 ──────────────────────────────────────────────
function renderBackup(root) {
  root.innerHTML = `${top({ back: "#/note" })}
  <main>
    <div class="lb" style="margin-top:28px">나의 인생 노트</div>
    <h2 style="margin-top:12px">노트 백업 · 불러오기</h2>
    <p class="lead">노트는 이 브라우저에만 있어요. 기기를 바꾸기 전이나 가끔 한 번 백업 파일을 내려받아 두세요.</p>
    <button class="btn" id="save" style="margin-top:20px">백업 파일 내려받기</button>
    <label class="btn ghost" style="margin-top:10px">백업 파일 불러오기<input type="file" id="load" accept=".json,application/json" hidden></label>
    <p class="small" id="msg" role="status" style="margin-top:10px"></p>
    <p class="notice">백업 파일에는 적은 내용이 그대로 들어 있어요. 다른 사람이 볼 수 없는 곳에 두세요.
      나를 기억할 사진은 백업 파일에 들어가지 않으니 <a href="#/note/portrait">사진 화면</a>에서 따로 내려받으세요.</p>
  </main>${footer()}`;
  const msg = root.querySelector("#msg");
  root.querySelector("#save").addEventListener("click", () => {
    const b = buildBackup((key) => get(key, undefined));
    download(new Blob([JSON.stringify(b, null, 1)], { type: "application/json" }), `인생노트-백업-${today()}.json`);
    msg.textContent = "내려받았어요.";
  });
  root.querySelector("#load").addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const { saved, data } = parseBackup(await f.text());
      const n = Object.keys(data).length;
      if (!confirm(`${saved ? saved.slice(0, 10) + "에 만든 " : ""}백업으로 이 기기의 노트를 바꿀까요? 백업에 들어 있는 ${n}개 항목을 덮어씁니다.`)) return;
      for (const key of NOTE_KEYS) if (key in data) set(key, data[key]);
      msg.textContent = "불러왔어요. 노트 표지에서 확인해 보세요.";
    } catch (err) {
      msg.textContent = err.message;
    }
  });
}

function download(blob, name) {
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
