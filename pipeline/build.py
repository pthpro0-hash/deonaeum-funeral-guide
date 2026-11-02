"""전체 파이프라인: 받기 → 정규화 → 점수 → 지오코딩 → site/data/*.json

  python -m pipeline.build            # 받기부터 전부
  python -m pipeline.build --no-fetch # data/raw 에 있는 파일로만
  --no-geocode                        # 새 주소를 묻지 않고 캐시만 사용
"""
import json
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from . import fetch
from .facilities import load_facilities
from .ftc import is_funeral, load_companies
from .geocode import geocode_all, load_cache
from .regions import SIDO
from .score import RULES, SCALE, apply_scale, safety_score
from .sources import DATASETS, FTC, LINKS

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT = ROOT / "site" / "data"


def _clean(d: dict) -> dict:
    return {k: v for k, v in d.items() if v is not None and v != [] and v != ""}


def _write(name: str, obj) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"{name}.json").write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def build_facilities(geocode: bool = True) -> dict[str, list[dict]]:
    data = {k: load_facilities(k, RAW / f"{k}.csv") for k in DATASETS}
    addrs = [f["address"] for items in data.values() for f in items]
    cache = geocode_all(addrs) if geocode else load_cache()
    for items in data.values():
        for f in items:
            ll = cache.get(f["address"])
            f["lat"], f["lon"] = (ll[0], ll[1]) if ll else (None, None)
            f.pop("kind", None)
    return data


def build_regions(data: dict[str, list[dict]]) -> dict:
    names = defaultdict(set)
    pts = defaultdict(list)
    for items in data.values():
        for f in items:
            if f["sido"] and f["sigungu"]:
                names[f["sido"]].add(f["sigungu"])
                if f["lat"] is not None:
                    pts[f"{f['sido']} {f['sigungu']}"].append((f["lat"], f["lon"]))
            if f["op_sido"] in SIDO and f["op_sigungu"] and f["op_sigungu"] not in SIDO:
                names[f["op_sido"]].add(f["op_sigungu"])
    centers = {k: [round(sum(p[0] for p in v) / len(v), 4), round(sum(p[1] for p in v) / len(v), 4)]
               for k, v in pts.items()}
    return {"sido": SIDO, "sigungu": {s: sorted(names[s]) for s in SIDO}, "centers": centers}


def build_sangjo() -> dict:
    companies = [c for c in load_companies(RAW / "ftc.xls") if is_funeral(c)]
    active, inactive = [], []
    for i, c in enumerate(companies, 1):
        c["id"] = f"s{i}"
        if c["status"] == "정상영업":
            s = safety_score(c)
            c["score"] = s
            if not s:
                c["no_financials"] = True
            active.append(_clean(c))
        else:
            inactive.append(_clean({k: c.get(k) for k in ("id", "name", "legal_name", "status", "closed_at", "reg_no")}))
    bench = apply_scale(active)
    active.sort(key=lambda c: (-(c.get("score") or {}).get("total", -1), c["name"]))
    return {"active": active, "inactive": inactive, "benchmark": bench}


def build_meta(fetch_meta: dict) -> dict:
    sources = {k: {**{x: v[x] for x in ("title", "org", "url")}, **fetch_meta.get(k, {})} for k, v in DATASETS.items()}
    sources["sangjo"] = {"title": FTC["title"], "org": FTC["org"], "url": FTC["url"], **fetch_meta.get("sangjo", {})}
    return {"built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "sources": sources, "score_rules": RULES, "score_scale": SCALE, "links": LINKS}


def main(argv: list[str]) -> None:
    fetch_meta = fetch.main() if "--no-fetch" not in argv else \
        json.loads((RAW / "fetch-meta.json").read_text(encoding="utf-8"))
    data = build_facilities(geocode="--no-geocode" not in argv)
    for k, items in data.items():
        _write(k, [_clean(f) for f in items])
    _write("regions", build_regions(data))
    sangjo = build_sangjo()
    _write("sangjo", sangjo)
    _write("meta", build_meta(fetch_meta))
    geo = sum(1 for items in data.values() for f in items if f["lat"] is not None)
    total = sum(len(v) for v in data.values())
    print(f"시설 {total}곳 (좌표 {geo}), 상조 영업 {len(sangjo['active'])} / 비영업 {len(sangjo['inactive'])}")


if __name__ == "__main__":
    main(sys.argv[1:])
