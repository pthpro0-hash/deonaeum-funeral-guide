# 더나음 장례안내 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공식 공공데이터로 임종 전 비교(장례식장·상조 안전 점수)와 임종 후 단계별 안내를 제공하는 정적 모바일 웹을 만들고, 정기 자동 갱신으로 GitHub Pages에 배포한다.

**Architecture:** Python 파이프라인(`pipeline/`)이 키 없이 받을 수 있는 공식 파일(공공데이터포털 파일데이터 5종, 공정위 XLS)을 받아 정규화·점수화·지오코딩한 뒤 `site/data/*.json`을 만든다. `site/`는 빌드 도구 없는 바닐라 JS 정적 사이트(해시 라우팅, localStorage)다. GitHub Actions가 주 1회 파이프라인을 돌리고 Pages에 배포한다.

**Tech Stack:** Python 3.12+ (requests 2.32.3, xlrd 2.0.1, pytest 8.3.3), 바닐라 HTML/CSS/JS(ES modules), Noto Serif KR(Google Fonts) + Pretendard 1.3.9(jsdelivr), Nominatim(OSM) 지오코딩, GitHub Actions + Pages.

**Spec:** `docs/superpowers/specs/2026-11-02-deonaeum-funeral-guide-design.md`

## Global Constraints

- 공식 자료만 쓴다. 모든 수치 옆에 출처 기관·자료명·기준일·링크를 표시한다.
- 제휴 여부로 노출·순서·점수를 바꾸지 않는다.
- 로그인·서버 저장·방문 통계 없음. 사용자 입력과 체크 상태는 localStorage에만, URL에 넣지 않는다.
- 업체 연결은 `tel:` 링크까지만.
- 상조 안전 점수 = 선수금 보전 50 + 지급여력 30 + 부채 부담 20. 정상영업이 아니면 점수 없이 "주의".
- 상조 상세에 "자세한 상품·계약 내용은 해당 상조회사에 문의하세요" + 전화번호.
- 점수 고지 문구: "이 점수는 공정거래위원회 공시로 더나음이 계산한 재무 안전성 점수이며, 정부 공식 등급이 아닙니다. 서비스 품질과 가격은 포함하지 않습니다."
- 디자인 토큰: paper `#f5f2ec`, ink `#2a2824`, sub `#6d675d`, faint `#a39c90`, line `#dcd5c8`, soft `#ece7de`, warn `#8a3b2a`. 제목 Noto Serif KR, 본문 Pretendard, `word-break: keep-all`, 버튼 모서리 2px, 아이콘·이모지·그라데이션 없음, 다크 모드 없음.
- 인증키·비밀값을 저장소에 커밋하지 않는다.

## Review Focus

- 화장시설 관내 판정: 시도 단위 운영(예: 서울시립승화원 시도=시군구="서울특별시") 시설은 해당 시도 전체 주민을 관내로 본다. 사설은 관내 표시 없음.
- 공정위 행 중 여행·크루즈 전용 업체가 상조 목록에 섞이지 않아야 한다. 총선수금 0인 신규 업체는 "공시 재무정보 없음"으로 점수 없이 표시.
- 지급여력비율 극단값(952972, -1478)과 음수 자본이 점수를 깨지 않아야 한다(0~30 범위로 고정).
- 좌표를 못 찾은 시설도 목록에서 사라지지 않고 "거리 정보 없음"으로 시군구 기준 정렬 뒤쪽에 나온다.
- localStorage가 막힌 브라우저(사생활 모드)에서도 화면이 동작해야 한다(try/catch, 메모리 대체).

---

## File Structure

```
pipeline/
  sources.py      # 출처 메타(기관, 자료명, 링크) 상수
  fetch.py        # 공공데이터포털 파일 + 공정위 XLS 다운로드 → data/raw/
  facilities.py   # CSV(CP949) → 정규화된 시설 dict 목록
  ftc.py          # XLS → 상조회사 dict 목록 (장례 업체만)
  score.py        # 안전 점수 계산
  geocode.py      # Nominatim + data/geocache.json 캐시
  regions.py      # 주소 → (시도, 시군구) 파싱, 시도 정식명 표
  build.py        # 전체 실행 → site/data/*.json
  tests/          # pytest
site/
  index.html
  css/app.css
  js/app.js        # 라우터, 화면 렌더
  js/store.js      # localStorage 래퍼
  js/geo.js        # 거리 계산, 위치 권한
  js/content.js    # 단계별 할 일·장례 방식·행정 안내 (정적 문구 + 출처)
  data/            # 생성물 (halls, crematoria, charnels, cemeteries, natural, sangjo, regions, meta).json
.github/workflows/update.yml
requirements.txt
```

---

### Task 1: 출처·다운로드 (`sources.py`, `fetch.py`)

**Interfaces:**
- Produces: `DATASETS: dict[str, dict]` (키: `halls|crematoria|charnels|cemeteries|natural`, 값: `pk, title, org, url`), `FTC = {title, org, url, download}`; `fetch_datago(pk: str, out: Path, session) -> Path`; `fetch_ftc(out: Path, session) -> Path`; `main()` → `data/raw/{key}.csv`, `data/raw/ftc.xls`.

- [ ] Step 1: `fetch_datago`는 `https://www.data.go.kr/data/{pk}/fileData.do`에서 `fn_fileDataDown('{pk}', '{uddi}'` 정규식으로 uddi를 얻고, `POST /tcs/dss/selectFileDataDownload.do` (`publicDataDetailPk, publicDataPk, atchFileId=, fileDetailSn=1, publicDataTyCode=PR0051`, 헤더 `X-Requested-With: XMLHttpRequest`)의 `atchFileId, fileDetailSn`으로 `/cmm/cmm/fileDownload.do`를 받는다. 페이지 `<title>`의 `_YYYYMMDD`를 기준일로 반환 dict에 담는다.
- [ ] Step 2: `fetch_ftc`는 `https://www.ftc.go.kr/www/downloadBizPpitExcel.do?pageUnit=10&pageIndex=1&searchCnd=all&key=250`을 받고 첫 8바이트가 `D0CF11E0`인지 확인, 아니면 예외.
- [ ] Step 3: 실제 실행해서 6개 파일과 `data/raw/fetch-meta.json`(기준일, 받은 시각) 생성 확인.

### Task 2: 시설 정규화 (`regions.py`, `facilities.py`)

**Interfaces:**
- Produces: `parse_region(address: str) -> tuple[str, str]` (시도 정식명, 시군구; 세종은 `("세종특별자치시","세종특별자치시")`); `load_facilities(kind: str, path: Path) -> list[dict]` — 공통 필드 `id, kind, name, sido, sigungu, op_sido, op_sigungu, address, tel, homepage, parking:int|None, public:bool`, kind별 `rooms, morgue`(halls), `furnaces`(crematoria), `period_years`(charnels), `capacity`(cemeteries, natural).

- [ ] Step 1: 테스트 `test_parse_region`: `"경기도 고양시 덕양구 통일로 504"` → `("경기도","고양시")`, `"서울특별시 강남구 일원로 81"` → `("서울특별시","강남구")`, `"강원도 춘천시 …"` → `("강원특별자치도","춘천시")`, `"전라북도 전주시 완산구 …"` → `("전북특별자치도","전주시")`.
- [ ] Step 2: 테스트 `test_load_halls`: `data/raw/halls.csv` 로드 시 1,080건, `삼성서울병원장례식장`의 `rooms==14, morgue==26, public is False`, 시도 값 끝 공백 제거됨.
- [ ] Step 3: 테스트 `test_crematoria_operator`: `서울시립승화원`은 `op_sido=="서울특별시"`, `op_sigungu=="서울특별시"`, 소재지 `sigungu=="고양시"`.
- [ ] Step 4: 구현(CP949 디코딩, 숫자 필드 쉼표 제거, 빈 값 None, `id` = kind + 순번). 테스트 통과.

### Task 3: 상조 파싱·점수 (`ftc.py`, `score.py`)

**Interfaces:**
- Produces: `load_companies(path: Path) -> list[dict]` — `name, status, reg_no, address, tel, products: list[{name, terms}], assets, liabilities, equity, solvency, debt_ratio, prepaid, guarantee_rate, guarantors: list[str], guarantee_amount`; `is_funeral(c) -> bool`; `safety_score(c) -> dict | None` — `{total, parts: {guarantee, solvency, debt}}`.

점수 구간 (공시 분포 확인 결과로 정함, 화면 "계산 방법"에 그대로 공개):
- 선수금 보전(50): 보전비율 <50 → 0; 50→25; 100→50; 사이는 선형.
- 지급여력(30): 지급여력비율 ≤0 → 0; 0~100 → 0~15 선형; 100~200 → 15~30 선형; ≥200 → 30.
- 부채 부담(20): 자본총계 <0 → 0; 부채비율 ≤50 → 20; ≥300 → 0; 사이 선형.
- 반올림은 항목별 소수 첫째 자리, 총점은 정수.
- `status != "정상영업"` 또는 `prepaid == 0` → `None`.

- [ ] Step 1: 테스트 `test_score_bounds`: (보전 50, 지급여력 100, 부채비율 50, 자본>0) → 25+15+20=60; (보전 100, 지급여력 952972, 부채비율 6) → 100; (보전 50, 지급여력 -1478, 부채비율 157, 자본<0) → 25+0+0=25.
- [ ] Step 2: 테스트 `test_is_funeral`: 상품 설명에 `수의|관\(|장례|상조|염습|빈소|발인|장의` 중 하나가 있거나 상호에 `상조`가 있으면 True. 실제 XLS에서 `코웨이라이프솔루션(주)` True, `(주)하나로크루즈` False, `에이치디투어존(주)` False.
- [ ] Step 3: 테스트 `test_load_companies`: 실제 XLS에서 `status` 분포가 정상영업 74 / 폐업 203 / 등록취소 87 / 휴업 1. `(주)아정라이프케어`의 `guarantee_rate==50, debt_ratio==6, prepaid==6304100`.
- [ ] Step 4: 구현(헤더는 5행부터 데이터, 열 위치는 4행 하위 헤더로 고정: 상품 13~18, 자산 19~21, 부채 22~24, 자본총계 25, 지급여력 27, 부채비율 29, 총선수금 31, 보전비율 32, 체결기관 33, 보전금액 35). 상호의 `[휴업]` 같은 접두어는 제거하고 status로 이동. 테스트 통과.

### Task 4: 지오코딩 (`geocode.py`)

**Interfaces:**
- Produces: `geocode(address: str, cache: dict, session) -> tuple[float, float] | None`; 캐시 파일 `data/geocache.json` (`{주소: [lat, lon] | null}`).

- [ ] Step 1: Nominatim `https://nominatim.openstreetmap.org/search?format=json&countrycodes=kr&limit=1&q=`, User-Agent `deonaeum-funeral-guide/1.0 (pthpro0@gmail.com)`, 요청 간 1.1초. 괄호 이하 제거한 도로명 주소로 먼저, 실패하면 "시도 시군구 읍면동" 수준으로 재시도. 캐시에 있으면 호출 안 함(null도 캐시하되 30일 후 재시도 안 함 — 단순화: null 영구 캐시, 수동 삭제로 재시도).
- [ ] Step 2: 테스트 `test_geocode_uses_cache`: 캐시에 있는 주소는 session 호출 0회.
- [ ] Step 3: 전체 시설 1회 실행(백그라운드, 약 45분), 성공률 기록.

### Task 5: 빌드 (`build.py`)

**Interfaces:**
- Consumes: Task 1~4 전부.
- Produces: `site/data/{halls,crematoria,charnels,cemeteries,natural,sangjo,regions,meta}.json`. `regions.json` = `{시도: [시군구…]}` (시설 주소+운영 지자체에서 수집, 정렬). `meta.json` = 자료별 `{title, org, url, base_date, fetched_at}` + 점수 구간 설명.
- 시설 JSON은 키를 줄인 배열(`lat, lon` 포함, 없으면 null). 시군구 대표 좌표 `regions_center`(해당 시군구 시설 좌표 평균)도 `regions.json`에 포함.

- [ ] Step 1: 테스트 `test_build_outputs`: 빌드 후 모든 JSON이 존재, `sangjo.json`에 여행 전용 업체 없음, 정상영업 업체는 score 또는 `no_financials:true`.
- [ ] Step 2: 구현, 실행, 결과 건수 확인.

### Task 6: 사이트 골격·홈·디자인 (`index.html`, `app.css`, `app.js`, `store.js`)

- [ ] Step 1: 해시 라우트 `#/`, `#/after`, `#/after/start`, `#/before`, `#/before/halls`, `#/before/sangjo`, `#/before/sangjo/:id`, `#/before/rites`, `#/about`(운영자·출처·개인정보 고지·점수 계산 방법).
- [ ] Step 2: 홈은 목업 `docs/mockups/visual-direction.html` 1번(비움)과 동일한 구성.
- [ ] Step 3: `store.js` — `get(key, fallback)`, `set(key, value)`; localStorage 실패 시 메모리 Map 사용. 키: `dn.place`, `dn.deceasedRegion`, `dn.here`, `dn.checks`, `dn.savedHalls`, `dn.savedSangjo`.

### Task 7: 임종 후 안내 (`content.js`, `geo.js`, after 화면)

- [ ] Step 1: `content.js`에 설계문서 6.2 표의 할 일을 단계별로 정의(`id, stage, title, desc, who: 'family'|'provider', place?: 'home'|'hospital'|…, facility?: 'halls'|'crematoria'|'burial'`, `links`), 자택 임종 전용 할 일 포함.
- [ ] Step 2: 시작 질문 화면(목업 after-flow 왼쪽), 지금 있는 곳 = GPS 버튼 또는 시군구 선택.
- [ ] Step 3: 단계 탭 + 체크리스트(목업 after-flow 오른쪽), 시설 블록: 담아 둔 곳 먼저 → 거리순(좌표 없으면 같은 시군구 → 같은 시도). 화장시설은 관내 먼저 + 관외 경고, 각 시설 `tel:` 버튼, e하늘 링크와 "연결이 안 되면 시설에 직접 전화" 문구.

### Task 8: 임종 전 비교 (halls, sangjo, rites 화면)

- [ ] Step 1: 장례식장 비교(목업 before-flow 왼쪽): 지역 선택, 필터 공설/사설/빈소 3개 이상/주차, 담아두기, e하늘 가격 링크.
- [ ] Step 2: 상조 목록·상세(목업 sangjo-score): 점수순, "주의" 업체 하단, 상세에 항목별 점수·원수치·기준일·상품 3개·보전기관·문의 안내·고지 문구.
- [ ] Step 3: 장례 방식·장지: 종교별 절차 요약, 추모 방법 4종 설명, 지역별 봉안·자연장·묘지 목록.

### Task 9: 검증

- [ ] Step 1: pytest 전부 통과.
- [ ] Step 2: 로컬 서버로 브라우저 확인(모바일 375폭): 모든 라우트, 콘솔 에러 0, 체크/담아두기 새로고침 후 유지.

### Task 10: 배포·자동 갱신

- [ ] Step 1: `.github/workflows/update.yml`: `schedule: cron '0 0 * * 1'`(매주 월 09:00 KST) + `workflow_dispatch`; Python 설치 → `pip install -r requirements.txt` → `python -m pipeline.build` → `site/data` 변경 시 커밋 → `actions/upload-pages-artifact`(path `site`) → `actions/deploy-pages`.
- [ ] Step 2: git 저장소 초기화, `.gitignore`(.venv, data/raw, .superpowers, __pycache__). `data/geocache.json`은 커밋(Actions에서 재사용).
- [ ] Step 3: 원격 저장소가 없으면 사용자 조치 목록에 "GitHub 저장소 생성 + Pages 소스를 GitHub Actions로 설정"을 넣는다.
