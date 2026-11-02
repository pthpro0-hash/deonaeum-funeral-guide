"""주소 → (시도 정식명, 시군구). 시+구 도시는 시 단위로 묶는다(화장장 관내 판정이 시 단위)."""

SIDO = [
    "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시", "대전광역시", "울산광역시",
    "세종특별자치시", "경기도", "강원특별자치도", "충청북도", "충청남도", "전북특별자치도", "전라남도",
    "경상북도", "경상남도", "제주특별자치도",
]

ALIASES = {
    "서울": "서울특별시", "서울시": "서울특별시", "부산": "부산광역시", "대구": "대구광역시",
    "인천": "인천광역시", "광주": "광주광역시", "대전": "대전광역시", "울산": "울산광역시",
    "세종": "세종특별자치시", "세종시": "세종특별자치시", "경기": "경기도",
    "강원": "강원특별자치도", "강원도": "강원특별자치도", "충북": "충청북도", "충남": "충청남도",
    "전북": "전북특별자치도", "전라북도": "전북특별자치도", "전남": "전라남도",
    "경북": "경상북도", "경남": "경상남도", "제주": "제주특별자치도", "제주도": "제주특별자치도",
}


def canon_sido(name: str) -> str | None:
    name = (name or "").strip()
    if name in SIDO:
        return name
    return ALIASES.get(name)


def parse_region(address: str, fallback_sido: str = "") -> tuple[str | None, str | None]:
    tokens = (address or "").replace(",", " ").split()
    if not tokens:
        return canon_sido(fallback_sido), None
    sido = canon_sido(tokens[0])
    rest = tokens[1:] if sido else tokens
    sido = sido or canon_sido(fallback_sido)
    if sido == "세종특별자치시":
        return sido, sido
    if not rest:
        return sido, None
    sigungu = rest[0]
    if not sigungu.endswith(("시", "군", "구")):
        return sido, None
    return sido, sigungu
