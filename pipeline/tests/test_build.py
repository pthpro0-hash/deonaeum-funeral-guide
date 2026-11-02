import json
from pathlib import Path

import pytest

OUT = Path(__file__).resolve().parents[2] / "site" / "data"
needs_out = pytest.mark.skipif(not (OUT / "sangjo.json").exists(), reason="빌드 결과 없음")


def _load(name):
    return json.loads((OUT / f"{name}.json").read_text(encoding="utf-8"))


@needs_out
def test_build_outputs():
    for n in ("halls", "crematoria", "charnels", "cemeteries", "natural", "sangjo", "regions", "meta"):
        assert (OUT / f"{n}.json").exists()
    sangjo = _load("sangjo")
    names = {c["name"] for c in sangjo["active"]}
    assert not names & {"(주)하나로크루즈", "트래블뱅크(주)", "에이치디투어존(주)", "㈜우리관광"}
    assert all("score" in c or c.get("no_financials") for c in sangjo["active"])
    totals = [c["score"]["total"] for c in sangjo["active"] if "score" in c]
    assert totals == sorted(totals, reverse=True) and all(0 <= t <= 100 for t in totals)
    # 규모 보정: 대형업체 중앙값보다 높은 소형 회사만 깎이고, 중앙값 아래로는 내려가지 않는다
    bench = sangjo["benchmark"]
    for c in sangjo["active"]:
        s = c.get("score")
        if not s:
            continue
        if c["prepaid"] >= 100e8 or s["raw"] <= bench:
            assert s["total"] == s["raw"]
        else:
            assert bench <= s["total"] <= s["raw"]


@needs_out
def test_regions_cover_all_sido():
    r = _load("regions")
    assert len(r["sido"]) == 17
    assert "강남구" in r["sigungu"]["서울특별시"] and "고양시" in r["sigungu"]["경기도"]
