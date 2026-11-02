from pathlib import Path

import pytest

from pipeline.facilities import load_facilities
from pipeline.regions import parse_region

RAW = Path(__file__).resolve().parents[2] / "data" / "raw"
needs_raw = pytest.mark.skipif(not (RAW / "halls.csv").exists(), reason="data/raw 없음 (python -m pipeline.fetch 먼저)")


def test_parse_region():
    assert parse_region("경기도 고양시 덕양구 통일로 504") == ("경기도", "고양시")
    assert parse_region("서울특별시 강남구 일원로 81") == ("서울특별시", "강남구")
    assert parse_region("강원도 춘천시 동내면 1") == ("강원특별자치도", "춘천시")
    assert parse_region("전라북도 전주시 완산구 효자동") == ("전북특별자치도", "전주시")
    assert parse_region("세종특별자치시 연기면 1") == ("세종특별자치시", "세종특별자치시")
    assert parse_region("포항시 남구 1", fallback_sido="경상북도") == ("경상북도", "포항시")


@needs_raw
def test_load_halls():
    halls = load_facilities("halls", RAW / "halls.csv")
    assert len(halls) == 1080
    s = next(h for h in halls if h["name"] == "삼성서울병원장례식장")
    assert (s["rooms"], s["morgue"], s["public"]) == (14, 26, False)
    assert s["op_sido"] == "서울특별시"


@needs_raw
def test_crematoria_operator():
    cr = load_facilities("crematoria", RAW / "crematoria.csv")
    s = next(c for c in cr if c["name"] == "서울시립승화원")
    assert s["op_sido"] == "서울특별시" and s["op_sigungu"] == "서울특별시"
    assert s["sigungu"] == "고양시" and s["furnaces"] == 23
