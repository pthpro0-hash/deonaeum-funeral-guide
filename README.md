# 더나음 장례안내

임종 전에는 장례식장과 상조회사를 공식 자료로 비교해 두고, 임종 후에는 해야 할 일을 시간 순서로 안내하는 무료 모바일 웹.

- 설계: `docs/superpowers/specs/2026-11-02-deonaeum-funeral-guide-design.md`
- 구현 계획: `docs/superpowers/plans/2026-11-02-deonaeum-funeral-guide.md`
- 목업: `docs/mockups/`

## 구성

| 폴더 | 내용 |
|---|---|
| `pipeline/` | 공식 파일 받기 → 정규화 → 상조 안전 점수 → 지오코딩 → `site/data/*.json` |
| `site/` | 빌드 도구 없는 정적 사이트 (GitHub Pages에 그대로 올라감) |
| `data/geocache.json` | 주소 → 좌표 캐시 (커밋함, 새 주소만 조회) |
| `data/raw/` | 받은 원본 파일 (커밋 안 함) |

## 자료 (모두 인증키 불필요)

- 보건복지부 장례식장·화장시설·봉안시설·자연장지·묘지 현황 — 공공데이터포털 파일데이터
- 공정거래위원회 선불식할부거래사업자 정보공개 — ftc.go.kr 자료 다운로드(XLS)
- 좌표 — OpenStreetMap Nominatim (초당 1건 제한 준수)

## 명령

```bash
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt
.venv/Scripts/python -m pipeline.build                 # 전부 (받기 + 지오코딩)
.venv/Scripts/python -m pipeline.build --no-fetch --no-geocode   # 받은 파일·캐시로만
.venv/Scripts/python -m pytest -q pipeline/tests
python -m http.server 8765 --directory site            # 로컬 미리보기
```

## 갱신과 배포

`.github/workflows/update.yml`이 매주 월요일 05:00(KST)에 자료를 다시 받아 커밋하고 GitHub Pages에 배포한다. `main`에 코드를 push하면 배포만 다시 한다. Actions 탭에서 수동 실행도 된다.
