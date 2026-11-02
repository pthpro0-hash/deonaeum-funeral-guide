import { get } from "../store.js";
import { eok, esc, footer, load, source, telHref, top, won } from "../ui.js";

const DISCLAIMER = "이 점수는 공정거래위원회 공시로 더나음이 계산한 재무 안전성 점수이며, 정부 공식 등급이 아닙니다. 서비스 품질과 가격은 포함하지 않습니다.";

export async function renderList(root) {
  const [sj, meta] = await Promise.all([load("sangjo"), load("meta")]);
  const saved = get("savedSangjo", []);
  const row = (c) => `<a class="sj" href="#/before/sangjo/${esc(c.id)}" data-name="${esc(c.name + " " + (c.legal_name || ""))}">
      <b>${esc(c.name)}${saved.includes(c.id) ? ` <span class="tag ok">담아둠</span>` : ""}</b>
      <small>${c.score ? `정상영업 · 선수금 ${eok(c.prepaid)}` : "정상영업 · 공시 재무정보 없음"}</small>
      <div class="score">${c.score ? `${c.score.total}<i>점</i>` : `<span class="small faint">-</span>`}</div></a>`;
  root.innerHTML = `${top({ back: "#/before" })}
  <main>
    <h2>상조회사 비교</h2>
    <p class="lead">가격보다 먼저 볼 것은 <b>낸 돈이 안전한지</b>입니다. 공정거래위원회 공시만으로 100점 만점 안전 점수를 매겼습니다. 제휴 여부와 상관없이 모든 회사를 같은 기준으로 보여드립니다.</p>
    <p class="small" style="margin-top:10px"><a class="ul sub" href="#/about">점수 계산 방법</a></p>
    <input class="search" id="q" type="search" placeholder="회사 이름 찾기" aria-label="상조회사 이름 찾기">
    <div id="list" style="margin-top:10px">${sj.active.map(row).join("")}</div>
    <details style="margin-top:24px">
      <summary>영업 중이 아닌 상조회사 (${sj.inactive.length}곳)</summary>
      <p class="small">폐업·등록취소·휴업한 회사입니다. 이런 회사에 가입되어 있었다면, 낸 돈의 보전 내용을 확인하거나 '내상조 그대로' 대체 서비스를 이용할 수 있습니다.
        <a class="ul sub" href="${esc(meta.links.mysangjo)}" target="_blank" rel="noopener">내상조 찾아줘 ↗</a></p>
      <div id="inactive">${sj.inactive.map((c) => `<div class="sj" data-name="${esc(c.name + " " + (c.legal_name || ""))}">
        <b>${esc(c.name)}</b><small>${esc(c.status)}${c.closed_at ? " · " + esc(fmtDate(c.closed_at)) : ""}</small>
        <div class="score"><span class="tag warn">주의</span></div></div>`).join("")}</div>
    </details>
    <p class="notice">${DISCLAIMER}</p>
    ${source(meta, "sangjo", " · 판매 품목에서 장례 서비스가 확인되는 회사만 표시")}
  </main>${footer()}`;
  root.querySelector("#q").addEventListener("input", (e) => {
    const q = e.target.value.trim();
    root.querySelectorAll("[data-name]").forEach((el) => { el.hidden = q && !el.dataset.name.includes(q); });
    if (q) root.querySelector("details").open = true;
  });
}

function fmtDate(s) {
  return /^\d{8}$/.test(s) ? `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6)}` : s;
}

export async function renderDetail(root, id) {
  const [sj, meta] = await Promise.all([load("sangjo"), load("meta")]);
  const c = sj.active.find((x) => x.id === id);
  if (!c) { location.hash = "#/before/sangjo"; return; }
  const rules = Object.fromEntries(meta.score_rules.map((r) => [r.key, r]));
  const raw = { guarantee: `보전비율 ${c.guarantee_rate ?? "-"}%`, solvency: `지급여력비율 ${c.solvency ?? "-"}%`, debt: `부채비율 ${c.debt_ratio ?? "-"}%${c.equity < 0 ? " · 자본잠식" : ""}` };
  const bars = c.score ? Object.entries(c.score.parts).map(([k, v]) => `<div class="bar-row">
      <div class="bar-h">${esc(rules[k].label)} <span>${v} / ${rules[k].max}</span></div>
      <div class="bar"><div style="width:${(v / rules[k].max) * 100}%"></div></div>
      <div class="bar-n">${esc(raw[k])} — ${esc(rules[k].why)}</div></div>`).join("") : "";
  const saved = get("savedSangjo", []).includes(c.id);
  root.innerHTML = `${top({ back: "#/before/sangjo" })}
  <main>
    <h2>${esc(c.name)}</h2>
    ${c.score ? `<div class="big">${c.score.total}<i> / 100</i></div>` : `<p class="lead">공시된 재무 정보가 없어 점수를 매기지 않았습니다.</p>`}
    <div class="small">정상영업 · 보전기관 ${esc((c.guarantors || []).join(", ") || "-")}</div>
    <p style="margin-top:12px"><button class="save" data-save="savedSangjo" data-id="${esc(c.id)}" aria-pressed="${saved}">${saved ? "담아둠" : "담아두기"}</button></p>
    ${bars}

    <h3>공시 내용</h3>
    <dl class="kv">
      <dt>총선수금</dt><dd>${won(c.prepaid)}</dd>
      <dt>보전 방식</dt><dd>${esc(c.guarantee_type || "-")}${c.guarantee_amount != null ? ` · ${won(c.guarantee_amount)}` : ""}</dd>
      <dt>보전기관</dt><dd>${esc(c.guarantee_branch || (c.guarantors || []).join(", ") || "-")}${c.guarantee_tel ? ` · <a href="${telHref(c.guarantee_tel)}">${esc(c.guarantee_tel)}</a>` : ""}</dd>
      <dt>자산 / 부채</dt><dd>${eok(c.assets)} / ${eok(c.liabilities)}</dd>
      <dt>자본총계</dt><dd>${eok(c.equity)}${c.equity < 0 ? ` <span class="tag warn">자본잠식</span>` : ""}</dd>
      <dt>등록번호</dt><dd>${esc(c.reg_no || "-")}</dd>
      <dt>소재지</dt><dd>${esc(c.address || "-")}</dd>
    </dl>
    ${c.guarantee_tel ? `<p class="small" style="margin-top:10px">내가 낸 돈이 실제로 보전되고 있는지는 위 보전기관에 직접 조회할 수 있습니다.</p>` : ""}

    ${c.products?.length ? `<h3>현재 판매 중인 주요 상품</h3>
      ${c.products.map((p) => `<div class="prod"><b>${esc(p.name)}</b><p>${esc(p.terms || "")}</p></div>`).join("")}
      <p class="small">상품 구성이 회사마다 달라 가격으로 순위를 매기지 않습니다.</p>` : ""}

    <div class="box" style="margin-top:24px;padding:14px">
      <div class="small">자세한 상품·계약 내용은 해당 상조회사에 문의하세요.</div>
      ${c.tel ? `<a class="btn" style="margin-top:12px" href="${telHref(c.tel)}">${esc(c.tel)} 전화하기</a>` : ""}
    </div>
    <p class="notice">${DISCLAIMER} 재무 수치는 회사가 공정위에 제출한 결산 기준이라 최신이 아닐 수 있습니다.
      이미 가입했다면 <a href="${esc(meta.links.refund_calc)}" target="_blank" rel="noopener">해약환급금 계산기 ↗</a>로 예상 환급금을 확인할 수 있습니다.</p>
    ${source(meta, "sangjo", " (공정위 파일 다운로드일)")}
  </main>${footer()}`;
}
