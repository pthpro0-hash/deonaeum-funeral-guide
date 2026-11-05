// 나의 인생 노트의 장(章) 화면들. 표지와 새 장은 note.js에 있고, 이 파일은 기존 Part 3-A 화면을 담는다.
// 모두 이 기기에만 저장하고, 가족에게는 인쇄·PDF로 전한다.
// 법 조문과 기관 안내는 2026-11-02에 원문을 열어 확인한 것만 쓴다.
import { BURIALS, RITES } from "../content.js";
import { legalShares } from "../inherit.js";
import { noteSet as set } from "../notestore.js";
import { get } from "../store.js";
import { esc, footer, top, won } from "../ui.js";

const CHECKED = "2026-11-02";
const LAW = "https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=284415";
const lawSrc = (arts) => `<div class="src">출처: <a href="${LAW}" target="_blank" rel="noopener">국가법령정보센터 민법</a> ${esc(arts)}
  ([시행 2026. 3. 17.] [법률 제21454호], ${CHECKED} 확인)</div>`;

export const NOT_WILL = `<p class="notice">이 노트에 적은 글은 <b>유언이 아닙니다.</b> 민법은 자필증서·녹음·공정증서·비밀증서·구수증서 다섯 방식의 유언만 인정합니다(제1065조).
  재산에 관한 뜻은 그 방식대로 따로 남기세요. <a href="#/note/will">법대로 남기는 방법 보기</a></p>`;

// ── 장례 선호 ─────────────────────────────────────────
export const LEAVE = "가족에게 맡김";
export const FIELDS = [
  { id: "method", q: "장법", opts: ["화장", "매장", LEAVE] },
  { id: "rite", q: "장례 방식(종교)", opts: [...RITES.map((r) => r.title), "종교 없이 간소하게", LEAVE] },
  { id: "burial", q: "모실 곳", opts: [...BURIALS.map((b) => b.title), LEAVE] },
  { id: "shroud", q: "수의", opts: ["전통 수의", "평소 즐겨 입던 옷", LEAVE] },
  { id: "guests", q: "조문객 범위", opts: ["널리 알려 주세요", "가족과 가까운 지인만", "가족끼리 조용히", LEAVE] },
];
export const MEMOS = [
  { id: "coffin", q: "수의·관에 대해 더 적을 것", ph: "예: 관은 가장 간소한 것으로" },
  { id: "photo", q: "나를 기억할 사진 (영정사진)", ph: "예: 휴대폰 사진첩 '가족여행 2024' 앨범의 바닷가 사진" },
  { id: "notify", q: "꼭 알려 줬으면 하는 곳", ph: "예: 고향 친구 모임, 다니던 성당 (연락처는 적지 않아도 됩니다)" },
  { id: "memo", q: "가족에게 남기는 말", ph: "장례와 관련해 바라는 점을 자유롭게 적으세요.", area: true },
];

export function renderWishes(root) {
  const w = get("plan.wishes", {});
  root.innerHTML = `${top({ back: "#/note" })}
  <main>
    <div class="lb" style="margin-top:28px">4장 · 나다운 마지막 인사</div>
    <h2 style="margin-top:12px">바라는 장례 방식</h2>
    <p class="lead">어떤 모습으로 인사하고 싶은지 적어 두세요. 고르는 대로 이 기기에 저장되고, 언제든 고칠 수 있어요. 정하기 어려운 항목은 "${LEAVE}"을 고르거나 비워 두세요.</p>
    ${FIELDS.map((f) => `<div class="q">${esc(f.q)}</div>
      <div class="filters" data-pick="${f.id}">${f.opts.map((o) =>
        `<button class="chip" data-v="${esc(o)}" aria-pressed="${w[f.id] === o}">${esc(o)}</button>`).join("")}</div>`).join("")}
    ${MEMOS.map((m) => `<div class="q">${esc(m.q)}</div>
      ${m.area
        ? `<textarea class="search memo" data-memo="${m.id}" rows="5" placeholder="${esc(m.ph)}">${esc(w[m.id] || "")}</textarea>`
        : `<input class="search" data-memo="${m.id}" value="${esc(w[m.id] || "")}" placeholder="${esc(m.ph)}" autocomplete="off">`}`).join("")}
    <div class="why">장례 방식과 모실 곳의 차이는 <a class="ul sub" href="#/before/rites">장례 방식 · 장지 알아두기</a>에서 볼 수 있습니다.</div>
    <div style="margin-top:30px"><a class="btn" href="#/note/kit">가족에게 건네는 노트 보기</a></div>
    <p class="small" id="saved" style="text-align:center;margin-top:10px">이 기기에 저장됨</p>
    ${NOT_WILL}
  </main>${footer()}`;

  const save = (k, v) => {
    const cur = get("plan.wishes", {});
    cur[k] = v;
    cur.updated = new Date().toISOString().slice(0, 10);
    set("plan.wishes", cur);
  };
  root.querySelectorAll("[data-pick]").forEach((box) => box.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    const on = b.getAttribute("aria-pressed") !== "true";
    box.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", on && x === b));
    save(box.dataset.pick, on ? b.dataset.v : "");
  }));
  root.querySelectorAll("[data-memo]").forEach((el) => el.addEventListener("input", () => save(el.dataset.memo, el.value)));
}

// ── 법정상속분 ────────────────────────────────────────
const COUNT = [
  { id: "children", q: "자녀", max: 10, why: "먼저 세상을 떠난 자녀가 있으면 그 자녀의 자녀와 배우자가 대신 상속합니다(대습상속, 제1001조). 이 계산기는 대습상속을 나누어 계산하지 않습니다." },
  { id: "ascendants", q: "직계존속 (부모님, 안 계시면 조부모님)", max: 4, why: "같은 순위에서는 촌수가 가까운 분이 먼저입니다(제1000조②). 부모님이 한 분이라도 계시면 조부모님은 상속인이 아닙니다." },
  { id: "siblings", q: "형제자매", max: 10, why: "" },
];

export function renderInherit(root) {
  const fam = get("plan.family", { spouse: false, children: 0, ascendants: 0, siblings: 0, amount: "" });
  const sel = (id, max, v) => `<select class="num" data-n="${id}" aria-label="${id}">${Array.from({ length: max + 1 }, (_, i) =>
    `<option value="${i}"${i === v ? " selected" : ""}>${i}명</option>`).join("")}</select>`;
  root.innerHTML = `${top({ back: "#/note" })}
  <main>
    <div class="lb" style="margin-top:28px">6장 · 재산과 상속</div>
    <h2 style="margin-top:12px">우리 가족 상속 미리 보기</h2>
    <p class="lead">유언이나 가족끼리의 협의가 없을 때 민법이 정한 상속 순서와 비율(법정상속분)을 미리 봅니다. 살아 계신 가족만 넣으세요.</p>

    <div class="q">배우자</div>
    <div class="chips" id="sp">
      <button class="chip" data-v="1" aria-pressed="${fam.spouse}">있음</button>
      <button class="chip" data-v="0" aria-pressed="${!fam.spouse}">없음</button>
    </div>
    <p class="why">법률상 혼인 관계의 배우자만 해당합니다.</p>
    ${COUNT.map((c) => `<div class="q">${esc(c.q)}</div>${sel(c.id, c.max, fam[c.id])}
      ${c.why ? `<p class="why">${esc(c.why)}</p>` : ""}`).join("")}
    <div class="q">상속재산 예시 금액 (선택)</div>
    <input class="search" id="amt" inputmode="numeric" placeholder="예: 300000000" value="${esc(fam.amount)}" autocomplete="off">

    <div id="out"></div>

    <h3>계산에 쓴 규칙</h3>
    <div class="prod"><b>상속 순위 (제1000조)</b><p>① 자녀 등 직계비속 ② 직계존속 ③ 형제자매 ④ 4촌 이내 방계혈족. 앞 순위가 한 명이라도 있으면 뒤 순위는 상속받지 않습니다. 태아는 이미 태어난 것으로 봅니다.</p></div>
    <div class="prod"><b>배우자 (제1003조)</b><p>직계비속이나 직계존속과 같은 순위로 함께 상속하고, 둘 다 없으면 혼자 상속합니다. 형제자매보다 앞섭니다.</p></div>
    <div class="prod"><b>상속분 (제1009조)</b><p>같은 순위끼리는 똑같이 나누고, 배우자는 함께 상속하는 직계비속이나 직계존속 몫의 5할을 더 받습니다. 예: 배우자와 자녀 둘이면 1.5 : 1 : 1.</p></div>
    <p class="notice">실제 상속은 유언, 상속인 사이의 협의 분할, 기여분·특별수익, 상속 포기·한정승인, 상속권 상실 등에 따라 달라집니다.
      이 계산은 참고용이며 법률 자문이 아닙니다. 정확한 판단은 변호사·법무사와 상의하세요.
      고인의 재산 조회는 <a href="https://www.gov.kr/portal/onestopSvc/safeInheritance" target="_blank" rel="noopener">정부24 안심상속</a>에서 할 수 있습니다.</p>
    ${lawSrc("제1000조·제1001조·제1003조·제1009조")}
  </main>${footer()}`;

  const draw = () => {
    const r = legalShares(fam);
    const amt = Number(String(fam.amount).replace(/[^0-9]/g, "")) || 0;
    const out = root.querySelector("#out");
    if (!r.heirs.length) { out.innerHTML = `<div class="box"><div class="empty">${esc(r.note)}</div></div>`; return; }
    const ORDER = ["", "1순위 (직계비속)", "2순위 (직계존속)", "3순위 (형제자매)"];
    out.innerHTML = `<div class="box" style="margin-top:26px"><div class="box-h"><span>${r.order ? ORDER[r.order] + (fam.spouse ? " + 배우자" : "") : "배우자 단독"}</span><span>한 사람 몫</span></div>
      ${r.heirs.map((h) => {
        const p = h.each.n / h.each.d;
        return `<div class="bar-row"><div class="bar-h"><b>${esc(h.label)}${h.count > 1 ? ` ${h.count}명 각각` : ""}</b>
          <span>${h.each.n}/${h.each.d} · ${(p * 100).toFixed(1)}%</span></div>
          <div class="bar"><div style="width:${(p * 100).toFixed(1)}%"></div></div>
          ${amt ? `<div class="bar-n">약 ${esc(won(amt * p))}</div>` : ""}</div>`;
      }).join("")}
      ${r.note ? `<div class="bar-n" style="padding:8px 0">${esc(r.note)}</div>` : ""}</div>`;
  };
  const save = () => { set("plan.family", fam); draw(); };
  root.querySelector("#sp").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    fam.spouse = b.dataset.v === "1";
    root.querySelectorAll("#sp .chip").forEach((x) => x.setAttribute("aria-pressed", x === b));
    save();
  });
  root.querySelectorAll("[data-n]").forEach((s) => s.addEventListener("change", () => { fam[s.dataset.n] = Number(s.value); save(); }));
  root.querySelector("#amt").addEventListener("input", (e) => { fam.amount = e.target.value; save(); });
  draw();
}

// ── 유언 방식 ─────────────────────────────────────────
const WILLS = [
  { art: "제1066조", title: "자필증서", how: "유언자가 유언의 전문과 연월일, 주소, 성명을 직접 손으로 쓰고 날인합니다. 고치거나 지우거나 덧붙인 곳도 직접 쓰고 날인해야 합니다.",
    watch: "다섯 가지(전문·연월일·주소·성명 자서, 날인) 중 하나라도 빠지면 효력을 인정받기 어렵습니다. 컴퓨터로 쓰거나 출력한 것, 복사본은 자필이 아닙니다. 사망 후 보관자나 발견자가 법원에 검인을 청구해야 합니다(제1091조)." },
  { art: "제1067조", title: "녹음", how: "유언자가 유언의 취지, 자기 성명, 연월일을 말로 녹음하고, 참여한 증인이 유언이 정확하다는 것과 증인 자신의 성명을 말해야 합니다.",
    watch: "증인이 자기 이름과 유언이 정확하다는 말을 녹음에 남기지 않으면 요건을 갖추지 못합니다. 사망 후 법원 검인이 필요합니다(제1091조)." },
  { art: "제1068조", title: "공정증서", how: "증인 2명이 참여한 가운데 공증인 앞에서 유언의 취지를 말하고, 공증인이 받아 적어 읽어 준 뒤 유언자와 증인이 정확함을 확인하고 각자 서명 또는 기명날인합니다.",
    watch: "공증인이 관여합니다. 사망 후 법원 검인이 필요 없습니다(제1091조②)." },
  { art: "제1069조", title: "비밀증서", how: "유언자가 필자의 성명을 적은 증서를 봉하고 날인해 증인 2명 이상 앞에 내고, 봉투 겉면에 제출 연월일을 적어 유언자와 증인이 각자 서명 또는 기명날인합니다.",
    watch: "겉면에 적은 날부터 5일 안에 공증인이나 법원서기에게 내고 확정일자인을 받아야 합니다. 방식에 흠이 있어도 자필증서 요건을 갖췄다면 자필증서 유언으로 봅니다(제1071조)." },
  { art: "제1070조", title: "구수증서", how: "질병 등 급박한 사유로 다른 방식을 쓸 수 없을 때만 씁니다. 증인 2명 이상이 참여하고 그중 1명에게 유언의 취지를 말하면, 받아 적어 읽어 준 뒤 유언자와 증인이 정확함을 확인하고 각자 서명 또는 기명날인합니다.",
    watch: "증인이나 이해관계인이 급박한 사유가 끝난 날부터 7일 안에 법원에 검인을 신청해야 합니다." },
];

export function renderWill(root) {
  root.innerHTML = `${top({ back: "#/note" })}
  <main>
    <div class="lb" style="margin-top:28px">6장 · 재산과 상속</div>
    <h2 style="margin-top:12px">내 뜻을 법대로 남기는 방법</h2>
    <p class="lead">재산에 관한 뜻은 유언으로 남겨야 효력이 있어요. 민법은 자필증서, 녹음, 공정증서, 비밀증서, 구수증서 다섯 가지 방식의 유언만 인정합니다(제1065조). 방식을 지키지 않은 유언은 효력을 인정받기 어렵습니다.</p>
    <p class="notice" style="margin-top:14px"><b>이 노트에서 적거나 인쇄한 어떤 글도 유언이 아닙니다.</b> 휴대폰 메모, 메신저, 단순한 영상도 위 방식을 갖추지 않으면 유언으로 인정받기 어렵습니다.</p>
    ${WILLS.map((x) => `<div class="prod"><b>${esc(x.title)} <span class="faint">· ${esc(x.art)}</span></b>
      <p>${esc(x.how)}</p><p class="warn-t">${esc(x.watch)}</p></div>`).join("")}

    <h3>증인이 될 수 없는 사람 (제1072조)</h3>
    <p class="small">미성년자, 피성년후견인과 피한정후견인, 유언으로 이익을 받을 사람과 그 배우자·직계혈족. 공정증서 유언에서는 공증인법에 따른 결격자도 증인이 될 수 없습니다.</p>

    <h3>자필 유언 작성 체크리스트</h3>
    <p class="small">체크는 이 기기에만 저장됩니다. 유언의 내용은 여기에 적지 말고 종이에 직접 쓰세요.</p>
    <div id="wcl">${WILL_CHECK.map((c) => checkItem("plan.willcheck", c)).join("")}</div>
    <div style="margin-top:22px"><a class="btn ghost" href="#/note/willform">인쇄용 안내지와 빈 종이 보기</a></div>
    <p class="notice">이 안내는 민법 조문을 쉽게 옮긴 것이며 법률 자문이 아닙니다. 재산이 많거나 가족 관계가 복잡하면 변호사·공증인과 상의하세요.</p>
    ${lawSrc("제1065조~제1072조, 제1091조")}
  </main>${footer()}`;
  bindChecks(root, "plan.willcheck");
}

const WILL_CHECK = [
  { id: "hand", t: "처음부터 끝까지 내 손으로 직접 쓴다", d: "컴퓨터 작성, 출력, 대필, 복사본은 자필증서가 아닙니다." },
  { id: "date", t: "작성한 연·월·일을 직접 쓴다", d: "날짜까지 빠짐없이 씁니다." },
  { id: "addr", t: "주소를 직접 쓴다", d: "" },
  { id: "name", t: "성명을 직접 쓴다", d: "" },
  { id: "seal", t: "날인한다", d: "이름 옆에 도장을 찍습니다." },
  { id: "fix", t: "고친 곳에도 직접 쓰고 날인한다", d: "글자를 넣거나 지우거나 바꾼 곳마다 직접 쓰고 날인해야 합니다(제1066조②)." },
  { id: "what", t: "누구에게 무엇을 남기는지 분명히 쓴다", d: "재산은 주소, 계좌 은행처럼 다른 것과 헷갈리지 않게 적습니다." },
  { id: "keep", t: "보관 장소를 믿을 만한 사람에게 알린다", d: "사망 후 보관자나 발견자가 법원에 검인을 청구해야 합니다(제1091조)." },
];

function checkItem(key, c) {
  const on = get(key, []).includes(c.id);
  return `<label class="task${on ? " done" : ""}"><input type="checkbox" data-c="${c.id}"${on ? " checked" : ""}>
    <div><div class="tt">${esc(c.t)}</div>${c.d ? `<div class="td">${esc(c.d)}</div>` : ""}</div></label>`;
}

function bindChecks(root, key) {
  root.addEventListener("change", (e) => {
    const box = e.target.closest("input[data-c]");
    if (!box) return;
    const list = get(key, []);
    set(key, box.checked ? [...new Set([...list, box.dataset.c])] : list.filter((x) => x !== box.dataset.c));
    box.closest(".task").classList.toggle("done", box.checked);
  });
}

export function renderWillForm(root) {
  root.innerHTML = `${top({ back: "#/note/will" })}
  <main class="paper">
    <div class="noprint">
      <p class="lead">1쪽은 안내지, 2쪽은 아무 글자도 없는 줄 종이입니다. 인쇄한 뒤 유언 본문은 2쪽(또는 아무 백지)에 직접 손으로 쓰세요.</p>
      <div style="margin:16px 0 8px"><button class="btn" id="doprint">인쇄 · PDF 저장</button></div>
    </div>
    <section class="sheet">
      <h2>자필 유언을 쓰기 전에</h2>
      <p class="small">이 안내지는 유언이 아닙니다. 이 종이에 유언을 쓰지 마세요.</p>
      <ol class="guide">
        <li>유언 전문을 처음부터 끝까지 직접 손으로 씁니다.</li>
        <li>작성한 연·월·일을 직접 씁니다.</li>
        <li>주소를 직접 씁니다.</li>
        <li>성명을 직접 씁니다.</li>
        <li>날인합니다.</li>
        <li>고치거나 지우거나 덧붙인 곳에도 직접 쓰고 날인합니다.</li>
        <li>누구에게 무엇을 남기는지 헷갈리지 않게 적습니다.</li>
        <li>보관 장소를 믿을 만한 사람에게 알립니다. 사망 후 보관자나 발견자는 법원에 검인을 청구해야 합니다.</li>
      </ol>
      <p class="small">근거: 민법 제1066조(자필증서에 의한 유언), 제1091조(유언증서의 검인). 하나라도 빠지면 효력을 인정받기 어렵습니다.
        재산이 많거나 가족 관계가 복잡하면 공정증서 유언(제1068조)을 함께 고려하고 전문가와 상의하세요.</p>
    </section>
    <section class="sheet lined" aria-label="빈 줄 종이"></section>
  </main>
  <div class="noprint">${footer()}</div>`;
  root.querySelector("#doprint").addEventListener("click", () => window.print());
}

// ── 디지털 자산 ───────────────────────────────────────
// 링크는 2026-11-02에 열어 내용을 확인한 공식 도움말만 둔다.
export const DIGITAL = [
  { id: "phone", t: "휴대폰 잠금 해제 방법을 가족 한 사람과 정해 두기",
    d: "비밀번호는 이 서비스나 메모 앱에 적지 마세요. 봉투에 넣어 보관하는 등 직접 전할 방법을 정합니다." },
  { id: "google", t: "Google 휴면 계정 관리자 설정",
    d: "일정 기간 쓰지 않으면 지정한 사람(최대 10명)에게 알리고 데이터 일부를 공유하도록 미리 정합니다. 가족은 고인 계정의 폐쇄나 데이터 요청을 따로 할 수 있지만 비밀번호는 받을 수 없습니다.",
    links: [["설정 안내", "https://support.google.com/accounts/answer/3036546?hl=ko"], ["고인 계정 요청 (가족용)", "https://support.google.com/accounts/troubleshooter/6357590?hl=ko"]] },
  { id: "apple", t: "Apple 유산 관리자 추가",
    d: "지정한 사람이 사망 후 접근 키와 사망 진단서로 사진·메시지·메모·파일 등에 접근할 수 있습니다. 구입한 콘텐츠와 키체인의 암호·결제 정보는 넘어가지 않습니다.",
    links: [["Apple 지원", "https://support.apple.com/ko-kr/102631"]] },
  { id: "facebook", t: "Facebook 기념 계정 관리자 지정",
    d: "기념 계정으로 바뀌면 아무도 로그인할 수 없습니다. 생전에 관리자를 지정해 두거나, 사후 계정 삭제를 고를 수 있습니다.",
    links: [["기념 계정 관리자", "https://www.facebook.com/help/1568013990080948"], ["기념 계정", "https://www.facebook.com/help/1017717331640041"]] },
  { id: "instagram", t: "Instagram 기념 계정 · 사후 삭제 선택",
    d: "기념 계정 프로필에는 아무도 로그인할 수 없고, 관리자가 없으면 내용을 바꿀 수 없습니다. 프로필이 남지 않기를 원하면 사후 계정 삭제를 고를 수 있습니다.",
    links: [["Instagram 고객 센터", "https://help.instagram.com/231764660354188"]] },
  { id: "kakao", t: "카카오톡 추모 프로필 알아 두기",
    d: "고인의 프로필을 '(알 수 없음)'으로 바꾸지 않고 남겨 두는 기능입니다. 전환하면 아무도 계정에 접근할 수 없고 되돌릴 수 없으며, 기본 5년(연장 시 최대 10년) 뒤 자동 탈퇴됩니다.",
    links: [["카카오 고객센터", "https://cs.kakao.com/helps_html/1073209595"]] },
  { id: "others", t: "그 밖의 서비스 목록 적어 두기",
    d: "포털, 쇼핑몰, 게임 등은 서비스마다 사망자 계정 처리 방법이 다릅니다. 쓰는 서비스 이름만 목록으로 남기면 가족이 각 고객센터에 문의할 수 있습니다." },
  { id: "subs", t: "자동결제 구독 목록 정리",
    d: "음악·영상·클라우드 등 매달 빠져나가는 구독을 목록으로 남겨, 가족이 해지할 수 있게 합니다." },
  { id: "photos", t: "남기고 싶은 사진·문서 백업",
    d: "가족에게 남길 사진과 문서를 한곳에 모으고, 그 위치를 알려 둡니다." },
  { id: "crypto", t: "암호화폐 · 전자 지갑이 있다면 존재를 알리기",
    d: "어느 거래소나 지갑을 쓰는지 가족이 알 수 있게 합니다. 복구 문구나 비밀번호는 온라인에 적지 말고, 안전한 전달 방법을 전문가와 상의하세요." },
];

export function renderDigital(root) {
  root.innerHTML = `${top({ back: "#/note" })}
  <main>
    <div class="lb" style="margin-top:28px">7장</div>
    <h2 style="margin-top:12px">내 디지털 생활 정리</h2>
    <p class="lead">계정과 사진, 구독은 나중에 가족이 찾기 가장 어려운 것들이에요. 지금 할 수 있는 설정부터 하나씩 해 두세요. 체크는 이 기기에만 저장됩니다.</p>
    <div style="margin-top:16px">${DIGITAL.map((c) => {
      const on = get("plan.digital", []).includes(c.id);
      return `<label class="task${on ? " done" : ""}"><input type="checkbox" data-c="${c.id}"${on ? " checked" : ""}>
        <div><div class="tt">${esc(c.t)}</div><div class="td">${esc(c.d)}</div>
        ${c.links ? `<div class="links">${c.links.map(([l, h]) => `<a class="ul sub" href="${h}" target="_blank" rel="noopener">${esc(l)} ↗</a>`).join("")}</div>` : ""}
        </div></label>`;
    }).join("")}</div>
    <p class="notice">각 회사의 정책은 바뀔 수 있습니다. 링크는 각 회사 공식 도움말이며 ${CHECKED}에 내용을 확인했습니다. 더나음은 이 회사들과 제휴하지 않습니다.</p>
  </main>${footer()}`;
  bindChecks(root, "plan.digital");
}

export const LST_STATUS = ["등록했어요", "아직이에요", "하지 않기로 했어요"];

// ── 사전연명의료의향서 ─────────────────────────────────
export function renderLst(root) {
  const L = (p) => `https://www.lst.go.kr/addt/${p}.do`;
  root.innerHTML = `${top({ back: "#/note" })}
  <main>
    <div class="lb" style="margin-top:28px">5장</div>
    <h2 style="margin-top:12px">내 치료에 대한 결정</h2>
    <p class="lead">삶의 마지막 시기에 받을 치료에 대해 내 뜻을 미리 남겨 두는 제도가 있어요. 사전연명의료의향서라고 하며, 19세 이상이면 누구나 쓸 수 있습니다. 법령상으로는 임종 과정에 있는 환자가 되었을 때의 연명의료와 호스피스에 관한 뜻입니다.</p>
    <div class="q">내 등록 상태 (인쇄본에 들어가요)</div>
    <div class="filters" id="lst-st">${LST_STATUS.map((x) => `<button class="chip" data-v="${esc(x)}" aria-pressed="${get("note.lst", "") === x}">${esc(x)}</button>`).join("")}</div>

    <h3>어떻게 쓰나요</h3>
    <div class="prod"><b>등록기관에 직접 방문</b><p>보건복지부가 지정한 사전연명의료의향서 등록기관을 찾아가 충분한 설명을 듣고 본인이 직접 작성합니다. 신분증을 가져갑니다.</p></div>
    <div class="prod"><b>등록되어야 효력</b><p>등록기관을 통해 작성·등록되어 연명의료 정보처리시스템에 보관되어야 법적 효력을 인정받습니다. 이 서비스나 다른 종이에 적은 것으로는 효력이 없습니다.</p></div>
    <div class="prod"><b>효력이 없는 경우</b><p>본인이 직접 쓰지 않았거나, 자발적인 뜻이 아니었거나, 작성 전 설명을 듣고 확인하지 않은 경우입니다. 등록 후 연명의료계획서를 새로 쓰면 그때부터 의향서는 효력을 잃습니다.</p></div>
    <div class="prod"><b>변경과 철회</b><p>언제든지 바꾸거나 철회할 수 있습니다. 처음 작성한 곳이 아니어도 지정된 등록기관이면 어디서든 됩니다.</p></div>
    <div class="prod"><b>조회와 가족 열람</b><p>본인은 언제든 조회할 수 있습니다. 가족이 열람하려면 신청서와 가족관계증명서 등이 필요하고, 본인이 허용하지 않았다면 거부될 수 있습니다.</p></div>
    <p class="small">비용은 등록기관마다 다를 수 있으니 방문 전에 전화로 확인하세요.</p>

    <div style="margin-top:22px">
      <a class="row" href="${L("composableorgan")}" target="_blank" rel="noopener">가까운 등록기관 찾기 <i>↗</i></a>
      <a class="row" href="${L("medicalintent")}" target="_blank" rel="noopener">사전연명의료의향서란 <i>↗</i></a>
      <a class="row" href="${L("attentionpoint")}" target="_blank" rel="noopener">작성 시 유의사항 · 변경과 철회 <i>↗</i></a>
      <a class="row" href="${L("application")}" target="_blank" rel="noopener">조회 · 열람 신청 <i>↗</i></a>
    </div>
    <p class="small" style="margin-top:14px">국립연명의료관리기관 대표전화 <a href="tel:18550075">1855-0075</a></p>
    <div class="src">출처: <a href="https://www.lst.go.kr" target="_blank" rel="noopener">국립연명의료관리기관</a> 안내 페이지 (${CHECKED} 확인)</div>
  </main>${footer()}`;
  root.querySelector("#lst-st").addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    const on = b.getAttribute("aria-pressed") !== "true";
    root.querySelectorAll("#lst-st .chip").forEach((x) => x.setAttribute("aria-pressed", on && x === b));
    set("note.lst", on ? b.dataset.v : "");
  });
}
