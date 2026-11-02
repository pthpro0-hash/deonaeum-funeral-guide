"""상조 안전 점수 (100점) = 선수금 보전 50 + 지급여력 30 + 부채 부담 20, 그다음 규모 보정.

구간은 2026-11 공정위 공시 분포를 보고 정했다. 화면의 '점수 계산 방법'에 RULES와 SCALE을 그대로 보여준다.

규모 보정: 선수금이 작으면 비율이 쉽게 부풀려진다(법정 자본금 15억에 선수금 수백만 원이면
지급여력비율이 수만 %). 그래서 선수금 100억(공정위가 '대형업체'로 묶는 기준) 미만 회사는
대형업체 중앙값보다 높은 만큼을 신뢰도 Z = √(선수금 / 100억)만큼만 인정한다(보험계리의 제한변동
신뢰도 제곱근 규칙). 중앙값보다 낮은 점수는 그대로 둔다. 나쁜 신호는 규모와 상관없이 위험이기 때문이다.
"""
import math
import statistics

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
    """공시 비율만으로 매긴 점수. 규모 보정 전이다."""
    if c.get("status") != "정상영업" or not c.get("prepaid"):
        return None
    parts = {
        "guarantee": round(guarantee_points(c.get("guarantee_rate")), 1),
        "solvency": round(solvency_points(c.get("solvency")), 1),
        "debt": round(debt_points(c.get("debt_ratio"), c.get("equity")), 1),
    }
    return {"total": round(sum(parts.values())), "parts": parts}


FULL_PREPAID = 100e8  # 공정위 정보공개의 '선수금 100억 원 이상 대형업체' 기준

SCALE = {
    "label": "규모 보정",
    "full_prepaid": FULL_PREPAID,
    "rule": "선수금 100억 원 미만이면, 대형업체 중앙값보다 높은 만큼에 √(선수금 ÷ 100억)을 곱해 인정합니다. 중앙값보다 낮은 점수는 깎지도 올리지도 않습니다.",
    "why": "선수금이 작으면 법정 자본금(15억 원)만으로도 지급여력비율이 수천~수만 %로 부풀어, 실제보다 안전해 보입니다. 공정위는 선수금 100억 원 이상을 대형업체로 따로 집계합니다. 판단 근거가 적은 만큼만 인정하는 방식은 보험계리의 신뢰도 이론(제곱근 규칙)에서 가져왔고, 좋은 신호만 줄이고 나쁜 신호는 그대로 두는 것은 회계의 보수주의 원칙을 따른 것입니다.",
}


def credibility(prepaid: float) -> float:
    return min(1.0, math.sqrt(max(prepaid, 0) / FULL_PREPAID))


def apply_scale(companies: list[dict]) -> float | None:
    """점수가 있는 회사들에 규모 보정을 적용하고, 기준이 된 대형업체 중앙값을 돌려준다.

    c["score"]에 total(보정 후), raw(보정 전), z(신뢰도), adj(깎인 점수)를 채운다.
    """
    scored = [c for c in companies if c.get("score")]
    large = [c["score"]["total"] for c in scored if c["prepaid"] >= FULL_PREPAID]
    if not large:
        return None
    bench = statistics.median(large)
    for c in scored:
        s = c["score"]
        raw = s["total"]
        z = credibility(c["prepaid"])
        total = round(bench + z * (raw - bench)) if raw > bench else raw
        s.update(raw=raw, total=total, z=round(z, 2), adj=raw - total)
    return bench
