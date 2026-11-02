"""공식 자료 출처 정의. 화면의 출처 표기는 모두 여기서 나온다."""

DATAGO_PAGE = "https://www.data.go.kr/data/{pk}/fileData.do"

DATASETS = {
    "halls": {"pk": "15143467", "title": "장례식장 현황", "org": "보건복지부"},
    "crematoria": {"pk": "15143493", "title": "화장시설 현황", "org": "보건복지부"},
    "charnels": {"pk": "15143497", "title": "봉안시설 현황", "org": "보건복지부"},
    "cemeteries": {"pk": "15143496", "title": "묘지 현황", "org": "보건복지부"},
    "natural": {"pk": "15143492", "title": "자연장지 현황", "org": "보건복지부"},
}
for _d in DATASETS.values():
    _d["url"] = DATAGO_PAGE.format(pk=_d["pk"])

FTC = {
    "title": "선불식할부거래사업자 정보공개",
    "org": "공정거래위원회",
    "url": "https://www.ftc.go.kr/www/selectBizPpitOpenList.do?key=248",
    "download": "https://www.ftc.go.kr/www/downloadBizPpitExcel.do?pageUnit=10&pageIndex=1&searchCnd=all&key=250",
}

LINKS = {
    "ehaneul": "https://15774129.go.kr/",
    "refund_calc": "https://www.mysangjo.or.kr/web/sangjo/refund.do",
    "mysangjo": "https://www.mysangjo.or.kr/",
    "gov24_inherit": "https://www.gov.kr/portal/onestopSvc/Inheritance",
    "gov24_death": "https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000015",
}
