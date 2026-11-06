# 실서비스 전환 체크리스트 (별도 관리)

지금은 시범 운영 단계라 아래 항목을 **켜지 않고** 진행한다 (2026-11-06 결정). 실서비스로 전환할 때 이 문서를 위에서부터 처리한다.
기획 근거: `docs/superpowers/specs/2026-11-05-life-note-advanced-plan.md` 5.3절, 11절, 17절.

## 1. 인생 노트 "매달 알림 받기" (3-A, Cloudflare Workers 무료 구간)

**현재 상태:** 코드 배포됨, 화면에서 꺼짐 (`site/js/config.js`의 `PUSH_API`, `OPERATOR`가 비어 있음). 대신 캘린더 매월 알림이 같은 역할을 한다.
**왜 Cloudflare인가:** 정적 사이트(GitHub Pages)는 알림 주소를 받아 두거나 정해진 시간에 보낼 수 없다. 카드 등록 없이 받는 곳·저장·매일 실행이 모두 무료인 곳이 Cloudflare Workers였다. 전환 전에 Cloudflare 요금 안내에서 무료 한도를 다시 확인한다.

사용자가 할 일:
1. Cloudflare 무료 계정 만들기: https://dash.cloudflare.com/sign-up
2. 대시보드 **Workers & Pages** 를 한 번 열어 `계정이름.workers.dev` 주소 정하기 → 계정이름 전달
3. **My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" 템플릿**으로 토큰 만들기
4. GitHub 저장소 Secrets에 두 개 넣기: https://github.com/pthpro0-hash/deonaeum-funeral-guide/settings/secrets/actions
   - `CLOUDFLARE_API_TOKEN` = 3번 토큰
   - `CLOUDFLARE_ACCOUNT_ID` = Workers & Pages 화면의 Account ID

개발이 할 일 (사용자가 "알림 켜"라고 하면):
- `worker` 워크플로 실행 → KV 저장소·알림 키 자동 생성, 서버 배포
- `site/js/config.js`에 `PUSH_API`(서버 주소)와 `OPERATOR` 채우기 → 사이트 배포
- 실제 안드로이드·아이폰(홈 화면 추가)에서 알림 켜기 → 다음 날 09:00 알림 수신 확인

## 2. 개인정보처리방침 운영자 표시

3-A를 켜면 서버에 알림 주소를 보관하므로 운영자를 공개해야 한다. `#/privacy` 화면은 이미 있고, 지금은 "준비 중"으로 보인다.
- 상호, 대표자, 연락처(이메일 또는 전화), 개인정보 보호책임자(이름과 연락처)

## 3. 제휴 상조 표시

결정: 모든 상조회사를 같은 안전 점수로 정렬하고 제휴사에 "제휴" 표시만 붙인다. 단독 버튼·팝업 없음.
- 제휴 상조회사 목록(공정위 공시 상호 기준)과 제휴 시작일

## 4. 3-B (보류, 재개 조건)

지킴이에게 알림톡 자동 발송, 노트 서버 보관. 아래가 모두 갖춰져야 연다.
1. 알림톡·문자 발송 비용 부담 재결정
2. 사업자등록증, 카카오 비즈니스 채널·알림톡 발신 프로필
3. 지킴이 번호 보관·정기 발송·서류 없는 노트 열기에 대한 변호사 검토
