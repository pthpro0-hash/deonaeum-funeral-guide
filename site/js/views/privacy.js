// 개인정보처리방침. 서버에 두는 것은 "매달 알림"을 켠 분의 알림 받을 주소와 날짜뿐이다.
import { OPERATOR, PRIVACY_DATE, pushReady } from "../config.js";
import { esc, footer, top } from "../ui.js";

export function render(root) {
  const op = OPERATOR || {};
  const v = (x) => (x ? esc(x) : `<span class="faint">준비 중</span>`);
  root.innerHTML = `${top({ back: "#/" })}
  <main>
    <h2>개인정보처리방침</h2>
    <p class="small">시행일 ${esc(PRIVACY_DATE)}</p>
    <p class="lead">더나음 장례안내와 나의 인생 노트는 회원가입이 없습니다. 고른 지역, 체크한 할 일, 인생 노트에 적은 내용과 사진은 쓰시는 휴대폰·컴퓨터의 브라우저에만 저장되고 서버로 보내지 않습니다.</p>

    <h3>1. 서버에 보관하는 정보</h3>
    <p class="small">인생 노트에서 <b>"매달 알림 받기"를 직접 켠 경우에만</b> 아래 정보를 보관합니다.${pushReady() ? "" : " (이 기능은 아직 열리지 않았습니다.)"}</p>
    <dl class="kv">
      <dt>항목</dt><dd>알림 받을 주소(브라우저가 만든 푸시 구독 주소), 알림 날짜(매달 1~28일 중 하나), 마지막으로 알림을 보낸 달</dd>
      <dt>목적</dt><dd>매달 정한 날, 노트 지킴이에게 안내를 보낼 때가 되었다고 이 기기에 알리기</dd>
      <dt>보관 기간</dt><dd>알림을 끄면 바로 삭제합니다. 브라우저에서 알림을 지우거나 앱을 지워 주소가 더는 쓰이지 않으면, 다음 알림 때 확인되는 대로 삭제합니다.</dd>
      <dt>받지 않는 것</dt><dd>이름, 전화번호, 지킴이·지인 정보, 노트 내용. 알림은 내용 없이 보내고 문구는 기기 안에서 띄웁니다.</dd>
    </dl>

    <h3>2. 맡기는 곳</h3>
    <dl class="kv">
      <dt>서버 운영</dt><dd>Cloudflare, Inc. (알림 서버와 위 정보 보관)</dd>
      <dt>알림 전달</dt><dd>쓰시는 브라우저 회사의 푸시 서비스 (Google, Apple, Mozilla, Microsoft 중 해당 회사)</dd>
    </dl>
    <p class="small">위 정보를 다른 곳에 팔거나 제공하지 않습니다. 광고와 방문 통계 도구를 쓰지 않습니다.</p>

    <h3>3. 지우는 방법</h3>
    <p class="small">인생 노트 → 8장 → 이번 달 지킴이 안내 화면에서 "알림 끄기"를 누르면 서버의 정보가 바로 지워집니다. 기기에 저장된 노트는 브라우저 설정의 "사이트 데이터 삭제"로 지울 수 있습니다.</p>

    <h3>4. 운영자와 문의</h3>
    <dl class="kv">
      <dt>운영</dt><dd>${v(op.name)}</dd>
      <dt>대표자</dt><dd>${v(op.ceo)}</dd>
      <dt>연락처</dt><dd>${v(op.contact)}</dd>
      <dt>개인정보 보호책임자</dt><dd>${v(op.officer)}</dd>
    </dl>
    <p class="small">개인정보 침해에 대한 상담은 개인정보침해신고센터(국번 없이 118)에도 할 수 있습니다.</p>
  </main>${footer()}`;
}
