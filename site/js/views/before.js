import { BURIALS, RITES } from "../content.js";
import { origin, rank } from "../geo.js";
import { get, set } from "../store.js";
import { bindRegionPicker, esc, facilityItem, footer, listWithMore, load, regionPicker, source, top } from "../ui.js";

export function renderMenu(root) {
  root.innerHTML = `${top({ back: "#/" })}
  <main>
    <div class="lb" style="margin-top:28px">임종 전</div>
    <h2 style="margin-top:12px">미리 준비하기</h2>
    <p class="lead">임종 전에는 장례식장을 예약할 수 없습니다. 대신 후보를 비교해 담아 두면, 임종 후 안내에서 맨 위에 보여드립니다.</p>
    <div style="margin-top:22px">
      <a class="row" href="#/before/halls">장례식장 비교 <i>›</i></a>
      <a class="row" href="#/before/sangjo">상조회사 비교 · 안전 점수 <i>›</i></a>
      <a class="row" href="#/before/rites">장례 방식 · 장지 알아두기 <i>›</i></a>
    </div>
  </main>${footer()}`;
}

const HALL_FILTERS = [
  { id: "public", label: "공설", fn: (f) => f.public },
  { id: "private", label: "사설", fn: (f) => !f.public },
  { id: "rooms3", label: "빈소 3개 이상", fn: (f) => (f.rooms || 0) >= 3 },
  { id: "parking", label: "주차 가능", fn: (f) => (f.parking || 0) > 0 },
];

export async function renderHalls(root) {
  const [regions, halls, meta] = await Promise.all([load("regions"), load("halls"), load("meta")]);
  const prep = get("prepRegion", null) || get("here", null) || {};
  let active = new Set();

  root.innerHTML = `${top({ back: "#/before" })}
  <main>
    <h2>장례식장 비교</h2>
    <p class="lead">거주지나 연고지 주변 후보를 살펴보세요. 마음에 드는 곳은 담아 두면 임종 후 안내에 먼저 나옵니다.</p>
    <div class="q">어느 지역을 볼까요?</div>
    ${regionPicker(regions, "prep", prep)}
    <div class="filters" id="flt">${HALL_FILTERS.map((x) => `<button class="chip" data-f="${x.id}" aria-pressed="false">${x.label}</button>`).join("")}</div>
    <div id="list"></div>
    <div class="why">빈소 사용료·안치료·장례용품 가격은 장례식장이 e하늘 장사정보시스템에 등록한 가격표에서 확인할 수 있습니다.
      <a class="ul sub" href="${esc(meta.links.ehaneul)}" target="_blank" rel="noopener">e하늘 가격 정보 ↗</a></div>
    ${source(meta, "halls")}
  </main>${footer()}`;

  const draw = () => {
    const cur = get("prepRegion", null) || {};
    const list = root.querySelector("#list");
    if (!cur.sido) { list.innerHTML = `<div class="empty">시·도를 고르면 장례식장을 보여드립니다.</div>`; return; }
    const saved = get("savedHalls", []);
    const org = origin(regions, "prepRegion");
    let pool = halls.filter((f) => f.sido === cur.sido && (!cur.sigungu || f.sigungu === cur.sigungu));
    for (const id of active) pool = pool.filter(HALL_FILTERS.find((x) => x.id === id).fn);
    const ranked = rank(pool, org).sort((a, b) => saved.includes(b.f.id) - saved.includes(a.f.id));
    const items = ranked.map((r) => facilityItem("halls", r, { saveKey: "savedHalls" }));
    list.innerHTML = `<div class="box"><div class="box-h"><span>${esc(cur.sigungu || cur.sido)} · ${pool.length}곳</span><span>담아 둔 곳 먼저</span></div>${listWithMore(items, 10)}</div>`;
  };

  if (!get("prepRegion", null) && prep.sido) set("prepRegion", { sido: prep.sido, sigungu: prep.sigungu });
  bindRegionPicker(root, regions, "prep", (v) => { set("prepRegion", v); draw(); });
  root.querySelector("#flt").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    const on = b.getAttribute("aria-pressed") !== "true";
    b.setAttribute("aria-pressed", on);
    on ? active.add(b.dataset.f) : active.delete(b.dataset.f);
    if (on && (b.dataset.f === "public" || b.dataset.f === "private")) {
      const other = b.dataset.f === "public" ? "private" : "public";
      active.delete(other);
      root.querySelector(`[data-f="${other}"]`).setAttribute("aria-pressed", "false");
    }
    draw();
  });
  draw();
}

export async function renderRites(root) {
  const [regions, meta] = await Promise.all([load("regions"), load("meta")]);
  const prep = get("prepRegion", null) || get("here", null) || {};
  root.innerHTML = `${top({ back: "#/before" })}
  <main>
    <h2>장례 방식 · 장지 알아두기</h2>
    <h3>종교에 따른 장례 방식</h3>
    <p class="small">상조회사·장례식장에 미리 알리면 절차를 맞춰 준비합니다.</p>
    ${RITES.map((r) => `<div class="prod"><b>${esc(r.title)}</b><p>${esc(r.desc)}</p></div>`).join("")}

    <h3>추모 방법</h3>
    ${BURIALS.map((b) => `<div class="prod"><b>${esc(b.title)}</b><p>${esc(b.desc)}</p></div>`).join("")}

    <h3>지역의 장지 시설</h3>
    ${regionPicker(regions, "rite", prep)}
    <div class="filters" id="kinds">${BURIALS.filter((b) => b.kind).map((b, i) =>
      `<button class="chip" data-k="${b.kind}" aria-pressed="${i === 0}">${esc(b.title.split(" ")[0])}</button>`).join("")}</div>
    <div class="filters" id="pub"><button class="chip" data-p="1" aria-pressed="false">공설만</button></div>
    <div id="list"></div>
    <div id="src"></div>
  </main>${footer()}`;

  let kind = "charnels";
  let pubOnly = false;
  const draw = async () => {
    const cur = get("prepRegion", null) || {};
    const list = root.querySelector("#list");
    root.querySelector("#src").innerHTML = source(meta, kind);
    if (!cur.sido) { list.innerHTML = `<div class="empty">시·도를 고르면 시설을 보여드립니다.</div>`; return; }
    const data = await load(kind);
    // 공설 시설은 운영 지자체 기준으로도 찾는다 (서울시립 시설은 경기도에 있음)
    const pool = data.filter((f) => (f.sido === cur.sido && (!cur.sigungu || f.sigungu === cur.sigungu))
      || (f.public && f.op_sido === cur.sido && (!cur.sigungu || f.op_sigungu === cur.sigungu || f.op_sigungu === cur.sido)))
      .filter((f) => !pubOnly || f.public);
    const items = rank(pool, origin(regions, "prepRegion")).map((r) => facilityItem(kind, r, {
      badge: r.f.sido !== cur.sido ? `<span class="tag">${esc(r.f.sido)} 소재</span>` : "" }));
    list.innerHTML = `<div class="box"><div class="box-h"><span>${esc(cur.sigungu || cur.sido)} · ${pool.length}곳</span><span>공설은 운영 지자체 포함</span></div>${listWithMore(items, 8)}</div>`;
  };
  bindRegionPicker(root, regions, "rite", (v) => { set("prepRegion", v); draw(); });
  root.querySelector("#kinds").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    root.querySelectorAll("#kinds .chip").forEach((x) => x.setAttribute("aria-pressed", x === b));
    kind = b.dataset.k;
    draw();
  });
  root.querySelector("#pub").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    pubOnly = !pubOnly;
    b.setAttribute("aria-pressed", pubOnly);
    draw();
  });
  if (!get("prepRegion", null) && prep.sido) set("prepRegion", { sido: prep.sido, sigungu: prep.sigungu });
  draw();
}
