from collections import Counter
from pathlib import Path

import pytest

from pipeline.ftc import display_name, is_funeral, load_companies
from pipeline.score import FULL_PREPAID, apply_scale, credibility, safety_score

RAW = Path(__file__).resolve().parents[2] / "data" / "raw"
needs_raw = pytest.mark.skipif(not (RAW / "ftc.xls").exists(), reason="data/raw 없음")


def _c(rate, solv, debt, equity=1, status="정상영업", prepaid=1000):
    return {"status": status, "prepaid": prepaid, "guarantee_rate": rate, "solvency": solv,
            "debt_ratio": debt, "equity": equity}


def test_score_bounds():
    assert safety_score(_c(50, 100, 50))["total"] == 60
    assert safety_score(_c(100, 952972, 6))["total"] == 100
    assert safety_score(_c(50, -1478, 157, equity=-5))["total"] == 25


def test_no_score_cases():
    assert safety_score(_c(50, 100, 50, status="폐업")) is None
    assert safety_score(_c(50, 100, 50, prepaid=0)) is None


def _scored(raw, prepaid):
    return {"prepaid": prepaid, "score": {"total": raw, "parts": {}}}


def test_credibility_square_root_rule():
    assert credibility(FULL_PREPAID) == 1
    assert credibility(FULL_PREPAID * 30) == 1
    assert credibility(FULL_PREPAID / 4) == 0.5
    assert credibility(0) == 0


def test_scale_pulls_small_high_scores_to_large_median():
    large = [_scored(t, FULL_PREPAID * 5) for t in (30, 40, 50)]
    tiny = _scored(92, 5_480_000)            # 선수금 548만 원, 비율만 보면 92점
    mid = _scored(80, FULL_PREPAID / 4)      # 선수금 25억 → 신뢰도 0.5
    bad = _scored(25, 2e8)                   # 작고 나쁜 회사는 그대로
    bench = apply_scale(large + [tiny, mid, bad])
    assert bench == 40
    assert tiny["score"]["total"] == 41 and tiny["score"]["raw"] == 92
    assert mid["score"]["total"] == 60 and mid["score"]["z"] == 0.5
    assert bad["score"]["total"] == 25 and bad["score"]["adj"] == 0
    assert [c["score"]["total"] for c in large] == [30, 40, 50]


def test_scale_without_large_companies_keeps_scores():
    small = _scored(80, 1e8)
    assert apply_scale([small]) is None
    assert small["score"] == {"total": 80, "parts": {}}


def test_display_name():
    assert display_name("[휴업](주)더라이프") == "(주)더라이프"
    assert display_name("(주)웰리빙라이프[구, 한국통합상조(주)]") == "(주)웰리빙라이프"
    assert display_name("세종라이프(주)(구. 세종라이프상조(주))") == "세종라이프(주)"


@needs_raw
def test_load_companies():
    cs = load_companies(RAW / "ftc.xls")
    st = Counter(c["status"] for c in cs)
    assert st["정상영업"] >= 60 and st["폐업"] >= 150
    a = next(c for c in cs if c["name"] == "(주)아정라이프케어")
    assert (a["guarantee_rate"], a["debt_ratio"], a["prepaid"]) == (50, 6, 6304100)
    assert a["started"] is None and a["registered"] == "2025-07-28"
    assert next(c for c in cs if c["name"] == "㈜천화")["started"] == "1998-01-07"


@needs_raw
def test_is_funeral():
    by = {c["name"]: c for c in load_companies(RAW / "ftc.xls")}
    assert is_funeral(by["코웨이라이프솔루션(주)"])
    assert not is_funeral(by["(주)하나로크루즈"])
    assert not is_funeral(by["에이치디투어존(주)"])
    assert not is_funeral(by["(주)나드리가자"])  # 품목에 장례 근거 없음, 예전 상호에만 '상조'
