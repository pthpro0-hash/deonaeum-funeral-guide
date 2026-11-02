"""공정위 선불식할부거래사업자 등록업체 상세 화면 → 이메일, 감사보고서, 변경이력, 위반이력.

XLS에는 없는 정보다. 목록(key=249)에서 회사별 bzmnSn을 얻고 상세 화면을 하나씩 읽는다.
받기에 실패하면 지난번 결과(data/ftc-detail.json)를 그대로 쓴다.
"""
import html
import json
import re
import time
from pathlib import Path

import requests

BASE = "https://www.ftc.go.kr/www/"
LIST = BASE + "selectBizPpitRegWebList.do"
VIEW = BASE + "selectBizPpitRegWebView.do"
VIEW_URL = VIEW + "?key=249&bzmnSn={sn}"
UA = "Mozilla/5.0 (deonaeum-funeral-guide; +https://pthpro0-hash.github.io/deonaeum-funeral-guide/)"


def _cells(tr: str) -> list[str]:
    return [re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", c))).strip()
            for c in re.findall(r"<t[hd][^>]*>(.*?)</t[hd]>", tr, re.S)]


def _tbody_after(page: str, caption: str) -> list[list[str]]:
    i = page.find(caption)
    if i < 0:
        return []
    j = page.find("<tbody", i)
    k = page.find("</tbody>", j)
    rows = [_cells(tr) for tr in re.findall(r"<tr.*?</tr>", page[j:k], re.S)]
    return [r for r in rows if len(r) > 1]  # '이력이 없습니다' 한 칸짜리 행은 뺀다


def parse_list(page: str) -> list[dict]:
    tb = page[page.find("<tbody"): page.find("</tbody>")]
    out = []
    for tr in re.findall(r"<tr.*?</tr>", tb, re.S):
        sn = re.search(r"bzmnSn=(\d+)", tr)
        c = _cells(tr)
        if sn and len(c) >= 3:
            out.append({"sn": sn[1], "name": c[1], "reg_no": c[2]})
    return out


def parse_detail(page: str) -> dict:
    email = re.search(r"E-mail\s*</th>\s*<td[^>]*>(.*?)</td>", page, re.S)
    audits = [{"year": r[0].rstrip("년"), "auditor": r[3], "note": r[4] if len(r) > 4 else ""}
              for r in _tbody_after(page, "회계감사 보고서 상세")]
    changes = [{"date": r[0], "kind": r[1], "before": r[2], "after": r[3]}
               for r in _tbody_after(page, "주요 변경이력 -") if len(r) >= 4]
    violations = [{"type": r[1], "law": r[2], "action": r[3], "date": r[4]}
                  for r in _tbody_after(page, "위반내역이력 -") if len(r) >= 5]
    return {"email": re.sub(r"<[^>]+>|\s", "", email[1]) if email else None,
            "audits": audits, "changes": changes, "violations": violations}


def norm_reg(s: str) -> str:
    """등록번호 표기 차이(공백·하이픈·'제')를 없앤 비교용 키."""
    return re.sub(r"[\s\-제호]", "", s or "")


def fetch_all(session: requests.Session, delay: float = 0.6) -> dict[str, dict]:
    firms = []
    for i in range(1, 30):
        page = session.get(LIST, params={"key": 249, "pageUnit": 10, "pageIndex": i, "searchCnd": "all"}, timeout=30).text
        got = parse_list(page)
        if not got:
            break
        firms += got
        time.sleep(delay)
    if not firms:
        raise RuntimeError("공정위 등록업체 목록이 비었습니다")
    out = {}
    for f in firms:
        page = session.get(VIEW, params={"key": 249, "bzmnSn": f["sn"]}, timeout=30).text
        out[norm_reg(f["reg_no"])] = {**f, **parse_detail(page)}
        time.sleep(delay)
    return out


def load_or_fetch(cache: Path, fetch: bool) -> dict[str, dict]:
    old = json.loads(cache.read_text(encoding="utf-8")) if cache.exists() else {}
    if not fetch:
        return old
    try:
        s = requests.Session()
        s.headers["User-Agent"] = UA
        new = fetch_all(s)
    except Exception as e:  # 공정위 화면이 바뀌거나 막혀도 지난 결과로 계속 만든다
        print(f"공정위 상세 받기 실패, 지난 자료 사용: {e}")
        return old
    cache.write_text(json.dumps(new, ensure_ascii=False, indent=1), encoding="utf-8")
    return new
