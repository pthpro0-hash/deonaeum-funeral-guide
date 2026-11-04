// 내 부고 → 영정사진 만들기. 사진은 이 기기 안에서만 처리하고 최대 3장까지 보관한다.
import { DEFAULTS, FRAMES, MAX_ZOOM, OUT_H, OUT_W, cropRect, decode, draw, photoBox, printQuality } from "../portrait.js";
import { MAX_PORTRAITS, deletePortrait, listPortraits, putPortrait } from "../photos.js";
import { esc, footer, top } from "../ui.js";

const PREVIEW_W = 480, PREVIEW_H = 600;
const LONG_SIDE = 4000; // 보관할 원본의 긴 변 최대. 8×10인치 300dpi에 충분하다.

const TIPS = `<ul class="steps">
  <li>정면을 보고 어깨까지 나온 사진이 좋습니다. 모자나 짙은 안경은 피하세요.</li>
  <li>밝은 곳에서 초점이 맞게 찍힌 사진을 고르세요.</li>
  <li>휴대폰 앨범의 <b>원본 사진</b>을 쓰세요. 메신저로 주고받은 사진은 작아져 인화하면 흐릿합니다.</li>
  <li>배경은 바꾸지 않습니다. 배경을 바꾸거나 다듬으려면 내려받은 파일을 사진관에 맡기세요.</li>
</ul>`;

export async function render(root) {
  const list = await listPortraits();
  const full = list.length >= MAX_PORTRAITS;
  root.innerHTML = `${top({ back: "#/plan" })}
  <main>
    <div class="noprint">
      <div class="lb" style="margin-top:28px">내 부고 준비</div>
      <h2 style="margin-top:12px">영정사진 만들기</h2>
      <p class="lead">사진을 올리면 영정사진 비율(8×10인치)로 자르고 흑백·액자·근조 리본을 입혀 드립니다. 사진은 <b>이 기기 안에서만</b> 처리되며 서버로 보내지 않습니다. 최대 ${MAX_PORTRAITS}장까지 보관할 수 있습니다.</p>
      <div class="pt-list" id="pt-list">${list.length ? list.map((p, i) => `<div class="pt-item" data-id="${esc(p.id)}">
          <canvas width="240" height="300" aria-label="영정사진 ${i + 1}"></canvas>
          <div class="pt-acts">
            <b>${i + 1}번 사진</b>
            <span class="small">${esc(new Date(p.created).toLocaleDateString("ko-KR"))}</span>
            <button class="linkbtn" data-act="edit">고치기</button>
            <button class="linkbtn" data-act="down">내려받기</button>
            <button class="linkbtn" data-act="print">인쇄</button>
            <button class="linkbtn" data-act="del">지우기</button>
          </div></div>`).join("") : `<div class="empty">아직 만든 영정사진이 없습니다.</div>`}</div>
      <label class="btn${full ? " ghost" : ""}" style="margin-top:18px" ${full ? 'aria-disabled="true"' : ""}>
        ${full ? `${MAX_PORTRAITS}장을 모두 보관 중입니다` : `사진 고르기 (${list.length}/${MAX_PORTRAITS})`}
        <input type="file" accept="image/*" id="pick" hidden ${full ? "disabled" : ""}>
      </label>
      ${full ? `<p class="small" style="margin-top:8px">새로 만들려면 위에서 한 장을 지우세요.</p>` : ""}
      <h3>사진 고르는 법</h3>${TIPS}
      <p class="small" id="pt-msg" role="status" style="margin-top:12px"></p>
    </div>
    <div class="print-only pt-print"><img id="pt-print" alt="영정사진"></div>
  </main><div class="noprint">${footer()}</div>`;

  const byId = Object.fromEntries(list.map((p) => [p.id, p]));
  for (const el of root.querySelectorAll(".pt-item")) {
    const p = byId[el.dataset.id];
    decode(p.src).then((img) => draw(el.querySelector("canvas").getContext("2d"), img, p.settings, 240, 300))
      .catch(() => { el.querySelector("canvas").replaceWith(Object.assign(document.createElement("div"), { className: "empty", textContent: "사진을 열 수 없습니다." })); });
  }
  root.querySelector("#pick").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      editor(root, { id: newId(), created: Date.now(), settings: { ...DEFAULTS }, src: await shrink(file) }, true);
    } catch {
      msg(root, "이 사진을 열 수 없습니다. JPG나 PNG 사진으로 다시 골라 주세요.");
    }
  });
  root.querySelector("#pt-list").addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;
    const p = byId[b.closest(".pt-item").dataset.id];
    if (b.dataset.act === "edit") editor(root, p, false);
    if (b.dataset.act === "down") download(p, list.indexOf(p) + 1);
    if (b.dataset.act === "print") printOne(root, p);
    if (b.dataset.act === "del" && confirm("이 영정사진을 지울까요? 지운 사진은 되살릴 수 없습니다.")) {
      await deletePortrait(p.id);
      render(root);
    }
  });
}

// ── 편집 ──────────────────────────────────────────────
async function editor(root, rec, isNew) {
  const img = await decode(rec.src);
  const st = { ...DEFAULTS, ...rec.settings };
  const chips = (name, items, cur) => items.map((x) =>
    `<button class="chip" data-${name}="${x.id}" aria-pressed="${String(x.id) === String(cur)}">${x.label}</button>`).join("");
  root.innerHTML = `${top({ back: "#/plan/portrait" })}
  <main>
    <h2 style="margin-top:8px">${isNew ? "영정사진 만들기" : "영정사진 고치기"}</h2>
    <p class="small">사진을 끌어서 얼굴 위치를 맞추고, 아래에서 크기와 색을 고르세요.</p>
    <div class="pt-stage"><canvas id="pv" width="${PREVIEW_W}" height="${PREVIEW_H}" aria-label="영정사진 미리보기"></canvas></div>
    <p class="small" id="q" role="status"></p>

    <div class="q">크기</div>
    <input type="range" class="range" id="zoom" min="1" max="${MAX_ZOOM}" step="0.01" value="${st.zoom}" aria-label="확대">
    <div class="q">색</div>
    <div class="chips">${chips("mono", [{ id: "true", label: "흑백" }, { id: "false", label: "컬러" }], st.mono)}</div>
    <div class="q">밝기</div>
    <input type="range" class="range" id="bright" min="-30" max="30" step="1" value="${st.bright}" aria-label="밝기">
    <div class="q">액자</div>
    <div class="chips three">${chips("frame", FRAMES, st.frame)}</div>

    <div style="display:flex;gap:8px;margin-top:28px">
      <button class="btn" id="save">이 기기에 저장</button>
      <a class="btn ghost" href="#/plan/portrait">취소</a>
    </div>
    <p class="small" id="pt-msg" role="status" style="margin-top:10px"></p>
  </main>${footer()}`;

  const cv = root.querySelector("#pv"), ctx = cv.getContext("2d");
  let queued = false;
  const paint = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const c = draw(ctx, img, st, PREVIEW_W, PREVIEW_H);
      Object.assign(st, { cx: c.cx, cy: c.cy });
      const q = printQuality(c.sh);
      root.querySelector("#q").innerHTML = `<span class="${q.level === "low" ? "warn" : ""}">${esc(q.text)}</span>`;
    });
  };
  paint();

  // 끌어서 옮기기: 화면에서 움직인 거리만큼 원본의 잘라 낼 중심을 반대로 옮긴다
  let drag = null;
  cv.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const c = cropRect(img.width, img.height, st);
    const box = photoBox(PREVIEW_W, PREVIEW_H, st.frame);
    st.cx -= (e.clientX - drag.x) / (cv.clientWidth * (box.w / PREVIEW_W)) * (c.sw / img.width);
    st.cy -= (e.clientY - drag.y) / (cv.clientHeight * (box.h / PREVIEW_H)) * (c.sh / img.height);
    drag = { x: e.clientX, y: e.clientY };
    paint();
  });
  const end = () => { drag = null; };
  cv.addEventListener("pointerup", end);
  cv.addEventListener("pointercancel", end);

  root.querySelector("#zoom").addEventListener("input", (e) => { st.zoom = +e.target.value; paint(); });
  root.querySelector("#bright").addEventListener("input", (e) => { st.bright = +e.target.value; paint(); });
  root.querySelector("main").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-mono], button[data-frame]");
    if (!b) return;
    const key = b.dataset.mono !== undefined ? "mono" : "frame";
    st[key] = key === "mono" ? b.dataset.mono === "true" : b.dataset.frame;
    b.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
    paint();
  });
  root.querySelector("#save").addEventListener("click", async () => {
    try {
      await putPortrait({ ...rec, settings: { ...st } });
      backToList(root);
    } catch (err) {
      msg(root, err.message || "저장하지 못했습니다. 브라우저 저장 공간을 확인해 주세요.");
    }
  });
  // 편집 화면은 주소가 목록과 같아서, 뒤로·취소를 누르면 직접 목록을 다시 그린다
  root.querySelectorAll('a[href="#/plan/portrait"]').forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    backToList(root);
  }));
}

function backToList(root) {
  render(root);
  window.scrollTo(0, 0);
}

// ── 내려받기·인쇄 ────────────────────────────────────
async function renderFull(p) {
  const img = await decode(p.src);
  const cv = document.createElement("canvas");
  cv.width = OUT_W;
  cv.height = OUT_H;
  draw(cv.getContext("2d"), img, p.settings, OUT_W, OUT_H);
  return cv;
}

async function download(p, n) {
  const cv = await renderFull(p);
  cv.toBlob((blob) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `영정사진-${n}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
  }, "image/jpeg", 0.92);
}

async function printOne(root, p) {
  const cv = await renderFull(p);
  const el = root.querySelector("#pt-print");
  el.src = cv.toDataURL("image/jpeg", 0.92);
  await el.decode();
  window.print();
}

// ── 도움 ──────────────────────────────────────────────
function msg(root, text) {
  const el = root.querySelector("#pt-msg");
  if (el) el.textContent = text;
}

function newId() {
  return globalThis.crypto?.randomUUID?.() || `p${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

// 너무 큰 원본은 긴 변 4000px로 줄여 보관한다(회전 정보는 decode에서 이미 반영).
async function shrink(file) {
  const img = await decode(file);
  const k = LONG_SIDE / Math.max(img.width, img.height);
  if (k >= 1 && file.size < 8e6) return file;
  const cv = document.createElement("canvas");
  cv.width = Math.round(img.width * Math.min(1, k));
  cv.height = Math.round(img.height * Math.min(1, k));
  cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
  return new Promise((resolve) => cv.toBlob(resolve, "image/jpeg", 0.92));
}
