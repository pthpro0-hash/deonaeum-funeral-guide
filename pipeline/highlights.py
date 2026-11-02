"""상조회사 상세 맨 위에 보여줄 '특장점'과 '주의할 점'.

모두 공정위 공시 숫자와 이력에서 규칙으로 뽑는다. 더나음의 의견이나 광고 문구는 넣지 않는다.
"""
import re
from datetime import date

from .score import FULL_PREPAID

RECENT_YEARS = 3       # 위반·감사의견은 최근 3년만 본다
CHANGE_YEARS = 5       # 상호·주소 변경은 최근 5년을 센다
NAME_ADDR = re.compile(r"상호|주소|소재지")


def _eok(n: float) -> str:
    a = abs(n)
    s = f"{a / 1e8:,.0f}억" if a >= 1e10 else f"{a / 1e8:,.1f}억" if a >= 1e8 else f"{a / 1e4:,.0f}만"
    return s + " 원"


def _d(s: str | None) -> date | None:
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", s or "")
    return date(int(m[1]), int(m[2]), int(m[3])) if m else None


def _years(a: date, b: date) -> float:
    return (b - a).days / 365.25


def highlights(c: dict, detail: dict | None, asof: date) -> dict:
    good, watch = [], []
    add = lambda lst, text, basis: lst.append({"text": text, "basis": basis})
    prepaid, rate = c.get("prepaid") or 0, c.get("guarantee_rate")
    solv, debt, equity = c.get("solvency"), c.get("debt_ratio"), c.get("equity")
    small = prepaid < FULL_PREPAID

    # 낸 돈의 보전
    if rate is not None and rate > 50:
        add(good, f"선수금의 {rate:g}%를 은행·공제조합 등에 보전합니다. 법정 최소(50%)보다 높습니다.", "공정위 선수금 보전 현황")
    elif rate == 50:
        add(watch, "보전비율이 법정 최소인 50%입니다. 회사가 문을 닫으면 낸 돈의 절반 정도만 보상받습니다.", "공정위 선수금 보전 현황")
    elif rate is not None and rate < 50:
        add(watch, f"보전비율이 {rate:g}%로 법정 최소(50%)에 못 미칩니다.", "공정위 선수금 보전 현황")

    # 재무
    if equity is not None and equity < 0:
        add(watch, f"자본잠식 상태입니다. 부채가 자산보다 {_eok(-equity)} 많습니다.", "공정위 재무현황")
    elif solv is not None and solv < 100:
        add(watch, f"지급여력비율이 {solv:g}%입니다. 100% 미만이면 지금 문을 닫을 때 낸 돈 전부를 돌려주기 어렵습니다.", "공정위 재무현황")
    elif solv is not None and solv >= 100 and not small:
        add(good, f"지급여력비율 {solv:g}%로, 지금 문을 닫아도 낸 돈을 돌려줄 수 있는 수준(100% 이상)입니다.", "공정위 재무현황")
    if debt is not None and 0 <= debt <= 50 and (equity or 0) >= 0 and not small:
        add(good, f"자산 대비 부채가 {debt:g}%로 낮습니다.", "공정위 재무현황")

    # 규모와 업력
    if small:
        add(watch, f"선수금이 {_eok(prepaid)}인 소형 회사입니다. 규모가 작으면 비율이 쉽게 좋아 보여 재무 숫자만으로 판단하기 어렵습니다.", "공정위 선수금 현황")
    else:
        add(good, f"선수금 {_eok(prepaid)} 규모로, 공정위가 대형업체로 집계하는 100억 원 이상입니다.", "공정위 선수금 현황")
    start = _d(c.get("started")) or _d(c.get("registered"))
    if start:
        y = _years(start, asof)
        if y >= 10:
            add(good, f"{start.year}년부터 {int(y)}년째 영업하고 있습니다.", "공정위 영업 개시일")
        elif y < 3:
            add(watch, f"영업을 시작한 지 3년이 안 된 회사입니다({start.year}년).", "공정위 영업 개시일")

    if detail is None:
        return {"good": good, "watch": watch}

    # 감사의견 (최근 3년 안의 '한정' 등)
    for a in sorted(detail.get("audits", []), key=lambda a: a["year"], reverse=True):
        if a["year"].isdigit() and asof.year - int(a["year"]) <= RECENT_YEARS:
            # 비고는 '감사의견: 한정의견(사유)'로도, '한정의견'만으로도 적혀 있다
            m = re.search(r"(한정의견|부적정의견|의견거절)\s*(?:\(([^)]*)\))?", a["note"])
            if m:
                why = f" ({m[2].strip()})" if m[2] else ""
                add(watch, f"{a['year']}년 회계감사 의견이 '{m[1].strip()}'입니다{why}.", "공정위 회계감사 보고서")
                break

    # 공정위 조치
    recent = [v for v in detail.get("violations", [])
              if (d := _d(v["date"])) and _years(d, asof) <= RECENT_YEARS]
    for v in sorted(recent, key=lambda v: v["date"], reverse=True)[:3]:
        add(watch, f"{v['date']} 공정위 {v['action']}: {v['type']}", "공정위 위반내역")
    if not recent:
        add(good, f"최근 {RECENT_YEARS}년 동안 공정위 위반 조치 이력이 없습니다.", "공정위 위반내역")

    # 상호·주소를 자주 바꾸는 회사 (공정위 주의 안내)
    moved = [x for x in detail.get("changes", [])
             if NAME_ADDR.search(x["kind"]) and (d := _d(x["date"])) and _years(d, asof) <= CHANGE_YEARS]
    if len(moved) >= 2:
        add(watch, f"최근 {CHANGE_YEARS}년 동안 상호·주소를 {len(moved)}번 바꿨습니다. 공정위는 상호·주소를 자주 바꾸는 업체를 주의하라고 안내합니다.", "공정위 주요 변경이력")
    return {"good": good, "watch": watch}
