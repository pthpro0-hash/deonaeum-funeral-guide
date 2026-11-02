from datetime import date
from pathlib import Path

from pipeline.ftc_detail import norm_reg, parse_detail, parse_list
from pipeline.highlights import highlights

ASOF = date(2026, 11, 2)


def _co(**kw):
    base = {"prepaid": 500e8, "guarantee_rate": 50, "solvency": 120, "debt_ratio": 80, "equity": 1e9,
            "started": "2005-01-01"}
    return {**base, **kw}


def _texts(h, key):
    return " / ".join(x["text"] for x in h[key])


def test_large_healthy_company():
    h = highlights(_co(guarantee_rate=60, debt_ratio=40), {"audits": [], "violations": [], "changes": []}, ASOF)
    g = _texts(h, "good")
    assert "60%를" in g and "지급여력비율 120%" in g and "부채가 40%" in g
    assert "대형업체" in g and "21년째" in g and "위반 조치 이력이 없습니다" in g
    assert h["watch"] == []
    assert all(x["basis"].startswith("공정위") for x in h["good"])


def test_small_new_company_gets_no_ratio_praise():
    h = highlights(_co(prepaid=5_480_000, guarantee_rate=85, solvency=39779, debt_ratio=9, started="2025-07-28"),
                   None, ASOF)
    g, w = _texts(h, "good"), _texts(h, "watch")
    assert "85%" in g
    assert "지급여력" not in g and "부채가" not in g        # 소형이면 비율 칭찬을 하지 않는다
    assert "소형 회사" in w and "548만 원" in w and "3년이 안 된" in w


def test_impaired_company_and_records():
    detail = {
        "audits": [{"year": "2025", "auditor": "X", "note": "감사의견: 한정의견(재고자산 감사증거 미확보), 기타"},
                   {"year": "2019", "auditor": "X", "note": "감사의견: 한정의견(오래됨)"}],
        "violations": [{"type": "금지행위 관련 위반", "law": "제34조", "action": "시정명령", "date": "2025-07-25"},
                       {"type": "오래된 위반", "law": "-", "action": "경고", "date": "2019-01-01"}],
        "changes": [{"date": "2023-01-01", "kind": "상호", "before": "a", "after": "b"},
                    {"date": "2024-05-01", "kind": "소재지", "before": "a", "after": "b"},
                    {"date": "2024-06-01", "kind": "대표자", "before": "a", "after": "b"},
                    {"date": "2015-01-01", "kind": "주소", "before": "a", "after": "b"}],
    }
    h = highlights(_co(equity=-21.3e8, solvency=97, debt_ratio=103), detail, ASOF)
    w = _texts(h, "watch")
    assert "절반 정도만" in w and "자본잠식" in w and "21.3억 원" in w
    assert "2025년 회계감사 의견이 '한정의견'입니다 (재고자산 감사증거 미확보)" in w and "오래됨" not in w
    assert "2025-07-25 공정위 시정명령" in w and "오래된 위반" not in w
    assert "상호·주소를 2번" in w
    assert "위반 조치 이력이 없습니다" not in _texts(h, "good")


def test_audit_note_without_prefix():
    detail = {"audits": [{"year": "2025", "auditor": "X", "note": "한정의견"}], "violations": [], "changes": []}
    assert "2025년 회계감사 의견이 '한정의견'입니다." in _texts(highlights(_co(), detail, ASOF), "watch")


def test_norm_reg_matches_xls_and_web_forms():
    assert norm_reg("서울-2010-제32호") == norm_reg("서울 2010 32호") == "서울201032"


FIXTURE = """
<table><caption>등록업체현황 일반현황 상세</caption><tr><th>E-mail</th><td>life@example.co.kr</td></tr></table>
<table><caption>회계감사 보고서 상세 - </caption><tbody>
<tr><th>2025년</th><td>보고서</td><td><a>f.pdf</a></td><td>회계법인</td><td>감사의견: 한정의견(사유)</td></tr>
</tbody></table>
<table><caption>주요 변경이력 - </caption><tbody>
<tr><td>2024-01-02</td><td>상호</td><td>옛 이름</td><td>새 이름</td></tr></tbody></table>
<table><caption>위반내역이력 - </caption><tbody><tr><td colspan="7">위반 내용 이력이 없습니다.</td></tr></tbody></table>
"""


def test_parse_detail_fixture():
    d = parse_detail(FIXTURE)
    assert d["email"] == "life@example.co.kr"
    assert d["audits"] == [{"year": "2025", "auditor": "회계법인", "note": "감사의견: 한정의견(사유)"}]
    assert d["changes"] == [{"date": "2024-01-02", "kind": "상호", "before": "옛 이름", "after": "새 이름"}]
    assert d["violations"] == []


def test_parse_list_fixture():
    page = '<tbody><tr><td>1</td><td><a href="./x.do?bzmnSn=113&amp;key=249">보람상조개발(주)</a></td><td>서울-2010-제32호</td></tr></tbody>'
    assert parse_list(page) == [{"sn": "113", "name": "보람상조개발(주)", "reg_no": "서울-2010-제32호"}]
