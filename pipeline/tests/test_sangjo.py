from collections import Counter
from pathlib import Path

import pytest

from pipeline.ftc import display_name, is_funeral, load_companies
from pipeline.score import safety_score

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


@needs_raw
def test_is_funeral():
    by = {c["name"]: c for c in load_companies(RAW / "ftc.xls")}
    assert is_funeral(by["코웨이라이프솔루션(주)"])
    assert not is_funeral(by["(주)하나로크루즈"])
    assert not is_funeral(by["에이치디투어존(주)"])
    assert not is_funeral(by["(주)나드리가자"])  # 품목에 장례 근거 없음, 예전 상호에만 '상조'
