from pipeline.geocode import candidates, geocode


class NoCall:
    def get(self, *a, **k):
        raise AssertionError("캐시에 있는 주소는 호출하면 안 됨")


def test_geocode_uses_cache():
    cache = {"서울특별시 강남구 일원로 81": [37.488, 127.085], "없는 주소": None}
    assert geocode("서울특별시 강남구 일원로 81", cache, NoCall()) == (37.488, 127.085)
    assert geocode("없는 주소", cache, NoCall()) is None


def test_candidates_strip_parens():
    c = candidates("서울특별시 강남구 일원로 81 (일원동, 삼성의료원)")
    assert c[0] == "서울특별시 강남구 일원로 81"
    assert "서울특별시 강남구 일원로" in c
