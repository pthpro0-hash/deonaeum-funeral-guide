// 첫 화면. 메인 서비스는 "나의 인생 노트"(2026-11-06 결정).
// 핵심은 "왜 써야 하나". 이유 세 가지를 먼저 보이고, 담기는 장은 이름만 나열한다.
// 가족을 막 떠나보낸 분이 길을 잃지 않도록 맨 위에 장례 절차 안내로 가는 줄을 늘 둔다(상주 도움 최우선).
import { get } from "../store.js";
import { esc, footer } from "../ui.js";
import { noteProgress } from "./note.js?v=20261106w";

const WHY = [
  ["가족이 헤매지 않아요", "어떤 인사를 바랐는지, 누구에게 알려야 하는지 짐작하지 않아도 됩니다."],
  ["내 이야기를 내 말로 남겨요", "살아온 길, 고마운 사람, 꼭 하고 싶은 말을 직접 적어 둡니다."],
  ["흩어진 것이 한 권에 모여요", "은행·보험·계정이 어디 있는지 이 노트 하나면 찾을 수 있어요."],
];

const CHAPTERS = ["나의 이야기", "마음 전하기", "소식 전할 분들", "나다운 마지막 인사", "내 치료에 대한 결정", "재산과 상속", "내 디지털 생활", "노트 지킴이"];

export function render(root) {
  const p = noteProgress();
  const after = get("started", false) ? "#/after/h0" : "#/after/start";
  root.innerHTML = `
  <a class="urgent" href="${after}">가족을 막 떠나보내셨나요? <b>장례 절차 안내 →</b></a>
  <main class="home">
    <div class="lb">나의 인생 노트</div>
    <h1 style="margin-top:14px">왜 지금<br>인생 노트일까요?</h1>

    <ol class="why3">${WHY.map(([t, d], i) => `<li><span class="why-no">${i + 1}</span><div><b>${esc(t)}</b><p>${esc(d)}</p></div></li>`).join("")}</ol>

    <a class="btn" href="#/note">${p.started ? "노트 이어 쓰기" : "노트 시작하기"}</a>
    <p class="small" style="text-align:center;margin-top:10px">${p.started
      ? `채운 장 ${p.filled} / ${p.total}${p.updated ? ` · 마지막으로 다듬은 날 ${esc(p.updated)}` : ""}`
      : "회원가입 없이 이 기기에만 저장 · 언제든 고칠 수 있어요"}</p>

    <h3>노트에 담기는 것</h3>
    <ol class="chlist">${CHAPTERS.map((c) => `<li>${esc(c)}</li>`).join("")}</ol>

    <hr class="rule">
    <div class="lb">가족을 위한 안내</div>
    <h2 style="margin-top:12px">장례를 치러야 하나요?</h2>
    <p class="lead" style="margin-bottom:6px">지금 하실 일부터 시간 순서대로 안내해 드립니다.</p>
    <a class="row" href="${after}">장례 절차 안내 보기 <i>›</i></a>
    <a class="row" href="#/before">장례식장·상조회사 미리 비교하기 <i>›</i></a>
  </main>
  ${footer()}`;
}
