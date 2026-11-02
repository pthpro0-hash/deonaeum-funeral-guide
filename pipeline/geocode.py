"""주소 → 좌표. 키가 필요 없는 Nominatim(OSM)을 쓰고 data/geocache.json 에 캐시한다.

실패한 주소는 null 로 캐시해 다시 묻지 않는다(재시도하려면 캐시에서 지운다).
"""
import json
import re
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "data" / "geocache.json"
URL = "https://nominatim.openstreetmap.org/search"
UA = {"User-Agent": "deonaeum-funeral-guide/1.0 (pthpro0@gmail.com)"}
_last = [0.0]


def load_cache() -> dict:
    return json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}


def save_cache(cache: dict) -> None:
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=0, sort_keys=True), encoding="utf-8")


def candidates(address: str) -> list[str]:
    base = re.sub(r"\s*\(.*$", "", address).split(",")[0].strip()
    out = [base]
    toks = base.split()
    # 도로명 주소의 '도로명 번호'까지 / 지번 주소의 '읍면동'까지 줄여 재시도
    for n in (len(toks) - 1, 3):
        if 2 <= n < len(toks):
            out.append(" ".join(toks[:n]))
    return list(dict.fromkeys(out))


def _query(q: str, session) -> tuple[float, float] | None:
    wait = 1.1 - (time.monotonic() - _last[0])
    if wait > 0:
        time.sleep(wait)
    _last[0] = time.monotonic()
    r = session.get(URL, params={"q": q, "format": "json", "countrycodes": "kr", "limit": 1}, headers=UA, timeout=30)
    r.raise_for_status()
    js = r.json()
    return (round(float(js[0]["lat"]), 5), round(float(js[0]["lon"]), 5)) if js else None


def geocode(address: str, cache: dict, session) -> tuple[float, float] | None:
    if not address:
        return None
    if address in cache:
        v = cache[address]
        return tuple(v) if v else None
    hit = None
    for q in candidates(address):
        hit = _query(q, session)
        if hit:
            break
    cache[address] = list(hit) if hit else None
    return hit


def geocode_all(addresses: list[str], save_every: int = 25) -> dict:
    cache = load_cache()
    s = requests.Session()
    todo = [a for a in dict.fromkeys(addresses) if a and a not in cache]
    for i, a in enumerate(todo, 1):
        try:
            geocode(a, cache, s)
        except requests.RequestException:
            time.sleep(5)
            continue
        if i % save_every == 0:
            save_cache(cache)
            print(f"geocode {i}/{len(todo)}", flush=True)
    save_cache(cache)
    return cache
