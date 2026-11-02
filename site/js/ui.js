// 화면 공용 조각. 데이터는 공식 파일에서 오지만 화면에 넣기 전 항상 이스케이프한다.
import { get, set } from "./store.js";

const cache = new Map();
export function load(name) {
  if (!cache.has(name)) {
    const p = fetch(`data/${name}.json`).then((r) => {
      if (!r.ok) throw new Error(`${name} 데이터를 불러오지 못했습니다.`);
      return r.json();
    });
    p.catch(() => cache.delete(name)); // 실패는 기억하지 않고 다음에 다시 받는다
    cache.set(name, p);
  }
  return cache.get(name);
}

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const telHref = (t) => "tel:" + String(t).replace(/[^0-9+]/g, "");
export const won = (n) => n == null ? "-" : Math.round(n).toLocaleString("ko-KR") + "원";
export const eok = (n) => {
  if (n == null) return "-";
  const a = Math.abs(n);
  return a >= 1e8 ? (n < 0 ? "-" : "") + (a / 1e8).toFixed(a >= 1e10 ? 0 : 1) + "억 원" : won(n);
};

export function top({ right = "", back = null } = {}) {
  return `<header class="top">
    ${back ? `<a class="back" href="${esc(back)}">‹ 뒤로</a>` : `<a class="wm" href="#/">더나음</a>`}
    <div class="top-r">${right}</div></header>`;
}

export function footer() {
  return `<footer>
    운영 · 더나음 · 정보 제공만 하며 업체를 중개하지 않습니다.<br>
    개인정보를 수집하지 않습니다. 입력한 내용은 이 기기에만 저장됩니다.<br>
    <a href="#/about">출처와 기준일 · 점수 계산 방법</a>
  </footer>`;
}

export function source(meta, key, extra = "") {
  const s = meta.sources[key];
  if (!s) return "";
  const date = s.base_date ? ` (${esc(s.base_date)} 기준)` : "";
  return `<div class="src">출처: <a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.org)} ${esc(s.title)}</a>${date}${extra}</div>`;
}

export function regionPicker(regions, prefix, value = {}) {
  const sido = value.sido || "";
  const opts = (list, cur, ph) => `<option value="">${ph}</option>` +
    list.map((x) => `<option${x === cur ? " selected" : ""}>${esc(x)}</option>`).join("");
  return `<div class="region">
    <select id="${prefix}-sido" aria-label="시·도">${opts(regions.sido, sido, "시·도")}</select>
    <select id="${prefix}-sgg" aria-label="시·군·구">${opts(sido ? regions.sigungu[sido] || [] : [], value.sigungu, "시·군·구")}</select>
  </div>`;
}

export function bindRegionPicker(root, regions, prefix, onChange) {
  const a = root.querySelector(`#${prefix}-sido`), b = root.querySelector(`#${prefix}-sgg`);
  a.addEventListener("change", () => {
    const list = regions.sigungu[a.value] || [];
    b.innerHTML = `<option value="">시·군·구</option>` + list.map((x) => `<option>${esc(x)}</option>`).join("");
    if (a.value === "세종특별자치시") b.value = "세종특별자치시";
    onChange({ sido: a.value, sigungu: b.value || null });
  });
  b.addEventListener("change", () => onChange({ sido: a.value, sigungu: b.value || null }));
}

const KIND_INFO = {
  halls: (f) => [f.rooms != null && `빈소 ${f.rooms}`, f.morgue != null && `안치 ${f.morgue}구`],
  crematoria: (f) => [f.furnaces != null && `화장로 ${f.furnaces}`],
  charnels: (f) => [f.period_years && `기본 ${f.period_years}년`, f.extend_years && `연장 ${f.extend_years}년×${f.extend_times ?? "-"}회`],
  cemeteries: (f) => [f.capacity && `매장 ${f.capacity.toLocaleString("ko-KR")}기`],
  natural: (f) => [f.capacity && `안치 ${f.capacity.toLocaleString("ko-KR")}구`],
};

export function facilityItem(kind, r, { saveKey = null, badge = "" } = {}) {
  const f = r.f;
  const info = [
    r.d != null ? `${r.d < 10 ? r.d.toFixed(1) : Math.round(r.d)}km` : null,
    ...(KIND_INFO[kind]?.(f) || []),
    f.public ? "공설" : "사설",
    f.parking ? `주차 ${f.parking}대` : null,
  ].filter(Boolean).join(" · ");
  const saved = saveKey && get(saveKey, []).includes(f.id);
  return `<div class="fac">
    <div><b>${esc(f.name)}</b>${badge}</div>
    <div class="meta">${esc(info)}<br>${esc(f.address)}</div>
    <div class="acts">
      ${f.tel ? `<a class="call" href="${telHref(f.tel)}">전화</a>` : ""}
      ${saveKey ? `<button class="save" data-save="${esc(saveKey)}" data-id="${esc(f.id)}" aria-pressed="${saved}">${saved ? "담아둠" : "담아두기"}</button>` : ""}
    </div></div>`;
}

export function bindSave(root) {
  root.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-save]");
    if (!b) return;
    const list = get(b.dataset.save, []);
    const on = !list.includes(b.dataset.id);
    set(b.dataset.save, on ? [...list, b.dataset.id] : list.filter((x) => x !== b.dataset.id));
    b.setAttribute("aria-pressed", on);
    b.textContent = on ? "담아둠" : "담아두기";
  });
}

// 처음 n개만 보이고 '더 보기'로 펼친다
export function listWithMore(itemsHtml, n = 5) {
  if (!itemsHtml.length) return `<div class="empty">조건에 맞는 시설이 없습니다.</div>`;
  const head = itemsHtml.slice(0, n).join("");
  const rest = itemsHtml.slice(n);
  if (!rest.length) return head;
  return head + `<div hidden data-rest>${rest.join("")}</div>
    <button class="more" data-more>더 보기 (${rest.length}곳)</button>`;
}

export function bindMore(root) {
  root.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-more]");
    if (!b) return;
    b.previousElementSibling.hidden = false;
    b.remove();
  });
}
