import { get } from "../store.js";
import { esc, footer, top } from "../ui.js";

export function render(root) {
  const here = get("here", null);
  const right = here?.sido ? `<a class="linkbtn" href="#/after/start">${esc(here.sigungu || here.sido)}</a>` : "";
  root.innerHTML = `${top({ right })}
  <main class="home">
    <div class="lb">임종 후</div>
    <h1 style="margin-top:14px">지금 임종하셨나요?</h1>
    <p class="lead">당황하지 않으셔도 됩니다.<br>지금 하실 일부터 하나씩 안내해 드립니다.</p>
    <a class="btn" href="${get("started", false) ? "#/after/h0" : "#/after/start"}">지금 할 일 보기</a>
    <hr class="rule">
    <div class="lb">임종 전</div>
    <h2 style="margin-top:12px">미리 준비하기</h2>
    <p class="lead" style="margin-bottom:18px">장례식장과 상조회사를 차분히 비교해 두세요.<br>공식 공공데이터와 공정거래위원회 공시만 씁니다.</p>
    <a class="ul" href="#/before">준비 시작하기 →</a>
    <hr class="rule">
    <div class="lb">내 부고 준비</div>
    <h2 style="margin-top:12px">나의 마지막을 적어 두기</h2>
    <p class="lead" style="margin-bottom:18px">바라는 장례 방식, 법정상속분, 유언 방식, 디지털 자산과 사전연명의료의향서까지.<br>이 기기에만 저장하고, 인쇄해 가족에게 전합니다.</p>
    <a class="ul" href="#/plan">적어 두기 →</a>
  </main>
  ${footer()}`;
}
