// 첫 화면. 메인 서비스는 "나의 인생 노트"(2026-11-06 결정).
// 가족을 막 떠나보낸 분이 길을 잃지 않도록 맨 위에 장례 절차 안내로 가는 줄을 늘 둔다(상주 도움 최우선).
import { get } from "../store.js";
import { esc, footer } from "../ui.js";
import { noteProgress } from "./note.js?v=20261106h";

const INSIDE = [
  ["1장", "나의 이야기", "살아온 길, 고마운 사람, 좋아하는 노래"],
  ["2장", "마음 전하기", "가족·친구·동료에게 남기는 말"],
  ["3장", "소식 전할 분들", "언젠가 연락드릴 분들을 모임별로"],
  ["4장", "나다운 마지막 인사", "바라는 장례 방식, 나를 기억할 사진"],
  ["5장", "내 치료에 대한 결정", "사전연명의료의향서 알아보기"],
  ["6장", "재산과 상속", "어디에 무엇이 있는지, 상속 미리 보기"],
  ["7장", "내 디지털 생활", "계정·사진·구독 정리"],
  ["8장", "노트 지킴이", "노트를 맡아 줄 분과 매달 안내"],
];

export function render(root) {
  const p = noteProgress();
  const after = get("started", false) ? "#/after/h0" : "#/after/start";
  root.innerHTML = `
  <a class="urgent" href="${after}">가족을 막 떠나보내셨나요? <b>장례 절차 안내 →</b></a>
  <main class="home">
    <div class="lb">나의 인생 노트</div>
    <h1 style="margin-top:14px">지금의 나를<br>정리해 두는 노트</h1>
    <p class="lead">살아온 이야기부터 가족에게 건넬 안내까지, 한 권에 스마트하게.<br>회원가입 없이 이 기기에만 저장되고, 언제든 고칠 수 있어요.</p>
    <a class="btn" href="#/note">${p.started ? "노트 이어 쓰기" : "노트 시작하기"}</a>
    ${p.started ? `<p class="small" style="text-align:center;margin-top:10px">채운 장 ${p.filled} / ${p.total}${p.updated ? ` · 마지막으로 다듬은 날 ${esc(p.updated)}` : ""}</p>` : ""}

    <h3>노트에 담기는 것</h3>
    <dl class="inside">${INSIDE.map(([no, t, d]) => `<dt><span class="ch-no">${no}</span> ${esc(t)}</dt><dd>${esc(d)}</dd>`).join("")}</dl>
    <p class="small" style="margin-top:14px">다 쓰면 인쇄하거나 PDF로 저장해, 노트를 맡아 줄 분(지킴이)에게 건넵니다. 이 노트는 바람과 마음을 전하는 글이며 법적 효력이 있는 유언이 아닙니다.</p>

    <hr class="rule">
    <div class="lb">가족을 위한 안내</div>
    <h2 style="margin-top:12px">장례를 치러야 하나요?</h2>
    <p class="lead" style="margin-bottom:6px">당황하지 않으셔도 됩니다. 지금 하실 일부터 시간 순서대로 안내해 드립니다.</p>
    <a class="row" href="${after}">장례 절차 안내 보기 <i>›</i></a>
    <a class="row" href="#/before">장례식장·상조회사 미리 비교하기 <i>›</i></a>
    <p class="small" style="margin-top:10px">공식 공공데이터와 공정거래위원회 공시만 씁니다.</p>
  </main>
  ${footer()}`;
}
