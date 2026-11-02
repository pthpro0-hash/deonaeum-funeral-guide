"""상조 안전 점수 (100점) = 선수금 보전 50 + 지급여력 30 + 부채 부담 20.

구간은 2026-11 공정위 공시 분포를 보고 정했다. 화면의 '점수 계산 방법'에 RULES를 그대로 보여준다.
"""

RULES = [
    {"key": "guarantee", "label": "선수금 보전", "max": 50, "field": "보전비율(%)",
     "rule": "50% 미만 0점 · 50%면 25점 · 100%면 50점 (사이는 비례)",
     "why": "회사가 문을 닫아도 돌려받을 수 있는 돈의 비율입니다. 법정 최소는 50%입니다."},
    {"key": "solvency", "label": "지급여력", "max": 30, "field": "지급여력비율(%)",
     "rule": "0 이하 0점 · 100이면 15점 · 200 이상 30점 (사이는 비례)",
     "why": "고객에게 줄 서비스·환급금을 감당할 여력이 있는지 봅니다."},
    {"key": "debt", "label": "부채 부담", "max": 20, "field": "부채비율(%)",
     "rule": "50% 이하 20점 · 100% 이상 0점 (사이는 비례) · 자본잠식이면 0점",
     "why": "공시의 부채비율은 자산 대비 부채입니다. 100%를 넘으면 빚이 자산보다 많다는 뜻입니다."},
]


def _lerp(x: float, x0: float, x1: float, y0: float, y1: float) -> float:
    return y0 + (y1 - y0) * (x - x0) / (x1 - x0)


def guarantee_points(rate: float | None) -> float:
    if rate is None or rate < 50:
        return 0.0
    return min(50.0, _lerp(rate, 50, 100, 25, 50))


def solvency_points(v: float | None) -> float:
    if v is None or v <= 0:
        return 0.0
    if v <= 100:
        return _lerp(v, 0, 100, 0, 15)
    if v <= 200:
        return _lerp(v, 100, 200, 15, 30)
    return 30.0


def debt_points(ratio: float | None, equity: float | None) -> float:
    if ratio is None or (equity is not None and equity < 0) or ratio < 0:
        return 0.0
    if ratio <= 50:
        return 20.0
    if ratio >= 100:
        return 0.0
    return _lerp(ratio, 50, 100, 20, 0)


def safety_score(c: dict) -> dict | None:
    if c.get("status") != "정상영업" or not c.get("prepaid"):
        return None
    parts = {
        "guarantee": round(guarantee_points(c.get("guarantee_rate")), 1),
        "solvency": round(solvency_points(c.get("solvency")), 1),
        "debt": round(debt_points(c.get("debt_ratio"), c.get("equity")), 1),
    }
    return {"total": round(sum(parts.values())), "parts": parts}
