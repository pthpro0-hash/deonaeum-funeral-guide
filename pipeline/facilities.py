"""보건복지부 장사시설 CSV(CP949) → 정규화된 시설 목록."""
import csv
import io
from pathlib import Path

from .regions import canon_sido, parse_region

# kind별 추가 필드: (출력 키, CSV 열 이름)
EXTRA = {
    "halls": [("rooms", "빈소수"), ("morgue", "안치가능구수")],
    "crematoria": [("furnaces", "화장로수")],
    "charnels": [("period_years", "최초안치기간"), ("extend_years", "연장가능년"), ("extend_times", "연장가능횟수")],
    "cemeteries": [("capacity", "총매장능력")],
    "natural": [("capacity", "안치능력")],
}


def _num(v: str | None) -> int | None:
    v = (v or "").replace(",", "").strip()
    if not v:
        return None
    try:
        return int(float(v))
    except ValueError:
        return None


def _col(row: dict, *names: str) -> str:
    for n in names:
        if n in row and row[n] is not None:
            return row[n].strip()
    return ""


def _url(v: str) -> str | None:
    v = v.strip()
    if not v or v in ("-", "없음"):
        return None
    return v if v.startswith("http") else "http://" + v


def load_facilities(kind: str, path: Path) -> list[dict]:
    text = Path(path).read_bytes().decode("cp949", errors="replace")
    out = []
    for i, row in enumerate(csv.DictReader(io.StringIO(text))):
        name = _col(row, "시설명")
        if not name:
            continue
        op_sido = canon_sido(_col(row, "시도")) or _col(row, "시도")
        op_sigungu = _col(row, "시군구")
        if canon_sido(op_sigungu):
            op_sigungu = canon_sido(op_sigungu)
        address = _col(row, "주소")
        sido, sigungu = parse_region(address, fallback_sido=op_sido)
        item = {
            "id": f"{kind}-{i + 1}",
            "kind": kind,
            "name": name,
            "sido": sido,
            "sigungu": sigungu,
            "op_sido": op_sido,
            "op_sigungu": op_sigungu,
            "address": address,
            "tel": _col(row, "전화번호") or None,
            "homepage": _url(_col(row, "홈페이지", "홈페이지 주소")),
            "parking": _num(_col(row, "주차가능대수", "주차대수")),
            "public": _col(row, "공-사설구분", "공-사설 구분") == "공설",
        }
        for key, colname in EXTRA.get(kind, []):
            item[key] = _num(_col(row, colname))
        out.append(item)
    return out
