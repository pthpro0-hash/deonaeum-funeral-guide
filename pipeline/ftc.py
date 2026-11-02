"""공정위 선불식할부거래사업자 XLS → 상조회사 목록."""
import re
from pathlib import Path

import xlrd

FIRST_ROW = 5  # 0~4행은 제목·헤더
FUNERAL_WORDS = re.compile(r"수의|관\(|장례|상조|염습|빈소|발인|장의|입관")


def _num(v) -> float | None:
    if isinstance(v, (int, float)):
        return float(v)
    v = str(v).replace(",", "").strip()
    if not v:
        return None
    try:
        return float(v)
    except ValueError:
        return None


def _text(v) -> str:
    return re.sub(r"\s+", " ", str(v)).strip()


def display_name(raw: str) -> str:
    name = re.sub(r"^\[[^\]]*\]\s*", "", raw.strip())          # [휴업] 같은 접두어
    name = re.sub(r"\s*[\[(]\s*\(?구[\s.,].*$", "", name)       # [구, …] / (구. …) 이전 상호
    return name.strip() or raw.strip()


def load_companies(path: Path) -> list[dict]:
    sh = xlrd.open_workbook(str(path)).sheet_by_index(0)
    out = []
    for r in range(FIRST_ROW, sh.nrows):
        v = sh.row_values(r)
        if not _text(v[0]):
            continue
        products = [{"name": _text(v[c]), "terms": _text(v[c + 1])} for c in (13, 15, 17) if _text(v[c])]
        guarantors = [g.strip() for g in _text(v[33]).split("/") if g.strip()]
        out.append({
            "legal_name": _text(v[0]),
            "name": display_name(_text(v[0])),
            "reg_no": _text(v[2]),
            "address": _text(v[6]),
            "tel": _text(v[8]) or None,
            "status": _text(v[10]),
            "closed_at": _text(v[12]) or None,
            "products": products,
            "assets": _num(v[21]),
            "liabilities": _num(v[24]),
            "equity": _num(v[25]),
            "solvency": _num(v[27]),
            "debt_ratio": _num(v[29]),
            "prepaid": _num(v[31]),
            "guarantee_rate": _num(v[32]),
            "guarantors": list(dict.fromkeys(guarantors)),
            "guarantee_type": _text(v[34]) or None,
            "guarantee_amount": _num(v[35]),
            "guarantee_branch": _text(v[36]) or None,
            "guarantee_tel": _text(v[37]) or None,
        })
    return out


def is_funeral(c: dict) -> bool:
    """판매 품목에 장례 서비스가 보이면 상조회사로 본다.

    품목으로 판단할 수 없을 때만 상호를 본다. 영업 중인 회사는 현재 상호에 '상조'가 있어야 하고,
    영업 중이 아닌 회사는 예전 상호까지 본다(유족이 옛 이름으로 찾을 수 있게).
    """
    blob = " ".join(p["name"] + " " + p["terms"] for p in c["products"])
    if FUNERAL_WORDS.search(blob):
        return True
    name = c["name"] if c["status"] == "정상영업" else c["legal_name"]
    return "상조" in name
