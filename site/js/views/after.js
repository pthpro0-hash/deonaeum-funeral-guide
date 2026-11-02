import { PLACES, STAGES, TASKS } from "../content.js";
import { locate, nearestRegion, origin, rank } from "../geo.js";
import { get, set } from "../store.js";
import { bindRegionPicker, esc, facilityItem, footer, listWithMore, load, regionPicker, source, top } from "../ui.js";

// ── 시작 질문 ─────────────────────────────────────────
export async function renderStart(root) {
  const regions = await load("regions");
  const place = get("place", null);
  const here = get("here", {}) || {};
  const dec = get("deceasedRegion", {}) || {};
  root.innerHTML = `${top({ right: `<a class="linkbtn" href="#/">닫기</a>` })}
  <main>
    <h2>몇 가지만 여쭙겠습니다</h2>
    <p class="lead">답에 맞춰 해야 할 일과 가까운 시설을 골라 드립니다. 모르시면 건너뛰셔도 됩니다.</p>

    <div class="q">지금 어디에 계신가요?</div>
    <div class="chips" id="place">${PLACES.map((p) =>
      `<button class="chip" data-v="${p.id}" aria-pressed="${place === p.id}">${p.label}</button>`).join("")}</div>

    <div class="q">지금 계신 지역은요?</div>
    ${regionPicker(regions, "here", here)}
    <div class="gps"><button class="linkbtn" id="gps">현재 위치로 찾기</button> <span class="small" id="gps-msg"></span></div>
    <div class="why">가까운 장례식장과 시설을 거리순으로 보여드립니다.</div>

    <div class="q">고인의 주민등록 주소지는요?</div>
    ${regionPicker(regions, "dec", dec)}
    <div class="why">화장장은 고인 주소지(사망 직전 주민등록 기준) 주민에게 관내 요금을 적용합니다. 관외 요금은 지역에 따라 몇 배까지 차이 납니다.</div>

    <div style="margin-top:36px"><a class="btn" href="#/after/h0" id="go">안내 시작</a></div>
    <p style="text-align:center;margin-top:12px"><a class="ul sub" href="#/after/h0">건너뛰기</a></p>
  </main>${footer()}`;

  root.querySelector("#place").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    root.querySelectorAll("#place .chip").forEach((x) => x.setAttribute("aria-pressed", x === b));
    set("place", b.dataset.v);
  });
  bindRegionPicker(root, regions, "here", (v) => set("here", v));
  bindRegionPicker(root, regions, "dec", (v) => set("deceasedRegion", v));
  root.querySelector("#gps").addEventListener("click", async () => {
    const msg = root.querySelector("#gps-msg");
    msg.textContent = "확인 중…";
    try {
      const p = await locate();
      const r = nearestRegion(p, regions);
      set("here", { lat: p[0], lon: p[1], ...r });
      root.querySelector("#here-sido").value = r.sido || "";
      root.querySelector("#here-sido").dispatchEvent(new Event("change"));
      root.querySelector("#here-sgg").value = r.sigungu || "";
      set("here", { lat: p[0], lon: p[1], ...r });
      msg.textContent = `${r.sigungu || r.sido || ""} 근처로 찾았습니다.`;
    } catch (err) {
      msg.textContent = err.message;
    }
  });
  root.querySelector("#go").addEventListener("click", () => set("started", true));
}

// ── 단계별 할 일 ──────────────────────────────────────
export async function render(root, stageId = "h0") {
  const stage = STAGES.find((s) => s.id === stageId) || STAGES[0];
  const [regions, meta] = await Promise.all([load("regions"), load("meta")]);
  const place = get("place", null);
  const here = get("here", null);
  const checks = get("checks", {});
  const tasks = TASKS.filter((t) => t.stage === stage.id && (!t.places || !place || t.places.includes(place)));
  const done = tasks.filter((t) => checks[t.id]).length;
  const placeLabel = PLACES.find((p) => p.id === place)?.label;
  const right = `<a class="linkbtn" href="#/after/start">${esc([here?.sigungu || here?.sido, placeLabel].filter(Boolean).join(" · ") || "지역 정하기")}</a>`;

  const blocks = await Promise.all(tasks.map((t) => taskHtml(t, checks, regions, meta)));
  root.innerHTML = `${top({ right })}
  <nav class="stages">${STAGES.map((s) =>
    `<a href="#/after/${s.id}" aria-current="${s.id === stage.id}">${s.label}</a>`).join("")}</nav>
  <main class="pb">
    <h2 style="margin-top:22px">${esc(stage.title)}</h2>
    <div class="small faint" id="prog">${tasks.length}가지 중 ${done}가지 완료</div>
    <div style="margin-top:12px">${blocks.join("")}</div>
    ${nextLink(stage)}
  </main>${footer()}`;

  root.querySelectorAll(".task input").forEach((cb) => cb.addEventListener("change", () => {
    const c = get("checks", {});
    c[cb.dataset.id] = cb.checked;
    set("checks", c);
    cb.closest(".task").classList.toggle("done", cb.checked);
    const n = tasks.filter((t) => c[t.id]).length;
    root.querySelector("#prog").textContent = `${tasks.length}가지 중 ${n}가지 완료`;
  }));
}

function nextLink(stage) {
  const i = STAGES.indexOf(stage);
  const n = STAGES[i + 1];
  return n ? `<div style="margin-top:28px"><a class="btn ghost" href="#/after/${n.id}">다음 단계 · ${esc(n.label)}</a></div>` : "";
}

async function taskHtml(t, checks, regions, meta) {
  const links = (t.links || []).map((l) =>
    l.href ? `<a class="ul sub" href="${l.href}">${esc(l.label)}</a>`
      : `<a class="ul sub" href="${esc(meta.links[l.key])}" target="_blank" rel="noopener">${esc(l.label)} ↗</a>`);
  if (t.ehaneul) links.push(`<a class="ul sub" href="${esc(meta.links.ehaneul)}" target="_blank" rel="noopener">e하늘 장사정보시스템 ↗</a>`);
  const fac = t.facility ? await facilityBlock(t.facility, regions, meta) : "";
  const who = t.who === "family" ? `<span class="who family">가족</span>` : `<span class="who">상조·장례식장</span>`;
  return `<div class="task${checks[t.id] ? " done" : ""}">
    <input type="checkbox" aria-label="${esc(t.title)} 완료" data-id="${t.id}"${checks[t.id] ? " checked" : ""}>
    <div><div class="tt">${esc(t.title)}${who}</div>
      <div class="td">${esc(t.desc)}</div>
      ${links.length ? `<div class="links">${links.join("")}</div>` : ""}
      ${fac}</div></div>`;
}

export function inJurisdiction(f, dec) {
  if (!f.public || !dec?.sido) return null;
  if (f.op_sido !== dec.sido) return false;
  if (!f.op_sigungu || f.op_sigungu === f.op_sido) return true;
  return dec.sigungu ? f.op_sigungu === dec.sigungu : null;
}

async function facilityBlock(kind, regions, meta) {
  const org = origin(regions);
  if (!org?.sido) {
    return `<div class="box"><div class="empty">지금 계신 지역을 정하면 가까운 시설을 보여드립니다. <a class="ul" href="#/after/start">지역 정하기</a></div></div>`;
  }
  if (kind === "halls") {
    const halls = await load("halls");
    const saved = get("savedHalls", []);
    const ranked = rank(halls, org);
    const first = ranked.filter((r) => saved.includes(r.f.id));
    const rest = ranked.filter((r) => !saved.includes(r.f.id)).slice(0, 30);
    const items = [...first, ...rest].map((r) => facilityItem("halls", r, { saveKey: "savedHalls",
      badge: saved.includes(r.f.id) ? `<span class="tag ok">담아둠</span>` : "" }));
    return `<div class="box"><div class="box-h"><span>가까운 장례식장</span><span>${first.length ? "담아 둔 곳 먼저 · " : ""}거리순</span></div>
      ${listWithMore(items, 4)}</div>${source(meta, "halls")}`;
  }
  if (kind === "crematoria") {
    const list = await load("crematoria");
    const dec = get("deceasedRegion", null);
    const ranked = rank(list, org).map((r) => ({ ...r, j: inJurisdiction(r.f, dec) }));
    ranked.sort((a, b) => (b.j === true) - (a.j === true));
    const items = ranked.slice(0, 20).map((r) => facilityItem("crematoria", r, {
      badge: r.j === true ? `<span class="tag ok">관내 가능성 높음</span>`
        : r.j === false ? `<span class="tag warn">관외 요금 가능성</span>` : "" }));
    const note = dec?.sido ? "" : `<div class="empty">고인 주소지를 정하면 관내 화장장을 먼저 보여드립니다. <a class="ul" href="#/after/start">주소지 정하기</a></div>`;
    return `<div class="box"><div class="box-h"><span>화장시설</span><span>${dec?.sido ? "관내 먼저 · " : ""}거리순</span></div>
      ${note}${listWithMore(items, 4)}</div>
      <div class="why">관내 범위·거주 기간 요건·요금은 시설마다 다릅니다. 반드시 시설에 직접 확인하세요. e하늘 연결이 안 되면 화장시설에 바로 전화하시면 됩니다.</div>
      ${source(meta, "crematoria")}`;
  }
  // burial: 봉안·자연장·묘지 합쳐서 가까운 순
  const [a, b, c] = await Promise.all([load("charnels"), load("natural"), load("cemeteries")]);
  const tagged = [...a.map((f) => ({ ...f, _k: "charnels", _t: "봉안" })), ...b.map((f) => ({ ...f, _k: "natural", _t: "자연장" })),
    ...c.map((f) => ({ ...f, _k: "cemeteries", _t: "묘지" }))];
  const items = rank(tagged, org).slice(0, 30).map((r) => facilityItem(r.f._k, r, { badge: `<span class="tag">${r.f._t}</span>` }));
  return `<div class="box"><div class="box-h"><span>가까운 장지 시설</span><span>거리순</span></div>${listWithMore(items, 4)}</div>
    ${source(meta, "charnels", " 외 자연장지·묘지 현황")}`;
}
