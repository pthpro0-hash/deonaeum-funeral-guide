import { esc, footer, load, top } from "../ui.js";

export async function render(root) {
  const meta = await load("meta");
  const order = ["halls", "crematoria", "charnels", "natural", "cemeteries", "sangjo"];
  root.innerHTML = `${top({ back: "#/" })}
  <main>
    <h2>출처와 기준</h2>
    <p class="lead">더나음 장례안내는 상주와 유족이 스스로 판단할 수 있도록 공식 자료만으로 정보를 제공합니다. 모든 정보는 무료이며, 업체를 중개하지 않습니다.</p>

    <h3>사용한 공식 자료</h3>
    ${order.map((k) => {
      const s = meta.sources[k];
      return `<div class="prod"><b>${esc(s.org)} · ${esc(s.title)}</b>
        <p>${s.base_date ? `기준일 ${esc(s.base_date)}` : ""}${k === "sangjo" ? " (다운로드일, 수시 갱신 자료)" : ""}
        · <a href="${esc(s.url)}" target="_blank" rel="noopener">원문 ↗</a></p></div>`;
    }).join("")}
    <p class="small" style="margin-top:10px">자료는 매주 자동으로 다시 받아 갱신합니다. 마지막 갱신: ${esc(meta.built_at.slice(0, 10))}</p>

    <h3>상조 안전 점수 계산 방법</h3>
    <p class="small">공정거래위원회 선불식할부거래사업자 공시의 세 가지 수치로만 계산합니다. 정상영업이 아닌 회사는 점수 없이 "주의"로 표시합니다.</p>
    ${meta.score_rules.map((r) => `<div class="prod"><b>${esc(r.label)} · ${r.max}점</b>
      <p>${esc(r.field)} — ${esc(r.rule)}<br>${esc(r.why)}</p></div>`).join("")}
    ${meta.score_scale ? `<div class="prod"><b>${esc(meta.score_scale.label)} · 감점만</b>
      <p>${esc(meta.score_scale.rule)}<br>${esc(meta.score_scale.why)}</p>
      <p>예) 대형업체 중앙값이 40점이고 비율 점수가 90점인 회사의 선수금이 25억 원이면, 반영 비율은 √(25÷100) = 50%입니다. 40 + (90−40)×50% = 65점이 됩니다.</p></div>` : ""}
    <p class="small" style="margin-top:10px">참고한 기준: 공정거래위원회 상조업 정보공개의 '선수금 100억 원 이상 대형업체' 집계, 할부거래법의 등록 자본금 15억 원 요건, 보험계리 제한변동 신뢰도의 제곱근 규칙, 금융감독원 보험사 경영실태평가처럼 비율 하나로 판단하지 않는 원칙.</p>
    <p class="notice">이 점수는 공정거래위원회 공시로 더나음이 계산한 재무 안전성 점수이며, 정부 공식 등급이 아닙니다. 서비스 품질과 가격은 포함하지 않습니다.</p>

    <h3>위치와 거리</h3>
    <p class="small">공공데이터에는 좌표가 없어 주소를 OpenStreetMap(Nominatim)으로 좌표로 바꿨습니다. 좌표를 찾지 못한 시설은 같은 시·군·구 기준으로 정렬합니다. 거리는 직선거리입니다.</p>

    <h3>개인정보</h3>
    <p class="small">회원가입이 없고 서버에 아무것도 저장하지 않습니다. 고른 지역, 체크한 할 일, 담아 둔 업체는 이 기기의 브라우저에만 저장됩니다. 방문 통계 도구도 쓰지 않습니다.</p>
  </main>${footer()}`;
}
