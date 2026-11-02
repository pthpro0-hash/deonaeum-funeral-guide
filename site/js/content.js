// 임종 후 단계별 할 일. 사용자가 준 원문(설계문서 6.2)을 바탕으로 한 정적 안내.
// who: family = 가족이 직접 하거나 결정, provider = 상조·장례식장이 진행
// facility: 이 할 일 아래에 붙일 시설 목록 (halls | crematoria | burial)
// places: 이 임종 장소일 때만 보여줌 (없으면 항상)

export const STAGES = [
  { id: "h0", label: "0~4시간", title: "임종 직후" },
  { id: "h4", label: "4~12시간", title: "장례 준비" },
  { id: "d1", label: "1일차", title: "빈소 차림과 부고" },
  { id: "d2", label: "2일차", title: "입관" },
  { id: "d3", label: "3일차", title: "발인과 안치" },
  { id: "after", label: "장례 후", title: "행정 절차" },
];

export const PLACES = [
  { id: "hospital", label: "병원" },
  { id: "home", label: "자택" },
  { id: "care", label: "요양원·요양병원" },
  { id: "other", label: "그 외" },
];

export const TASKS = [
  { id: "cert-hospital", stage: "h0", who: "family", places: ["hospital", "care"],
    title: "사망진단서 발급",
    desc: "임종을 확인한 담당 의사에게 받습니다. 화장 예약·사망신고·금융 정리에 계속 필요하니 5~10통 넉넉히 받아 두세요." },
  { id: "cert-home", stage: "h0", who: "family", places: ["home", "other"],
    title: "신고하고 시체검안서 받기",
    desc: "병원 밖에서 임종하시면 112 또는 119에 알립니다. 경찰 입회 하에 의사가 검안한 뒤 시체검안서를 발급합니다. 사망진단서와 같은 용도로 쓰이니 5~10통 넉넉히 받아 두세요." },
  { id: "sangjo-call", stage: "h0", who: "family",
    title: "상조회사 접수",
    desc: "가입한 상조회사가 있으면 고객센터에 연락해 이송과 장례지도사 파견을 요청합니다. 가입하지 않았다면 상조회사를 비교하거나 병원 장례식장 직영 상품을 알아봅니다.",
    links: [{ href: "#/before/sangjo", label: "상조회사 비교" }] },
  { id: "transfer", stage: "h0", who: "provider",
    title: "고인 이송",
    desc: "자택·요양원 등에서 임종하셨다면 상조회사나 장례식장 차량으로 장례식장 안치실에 모십니다. 장례식장을 정하면 그쪽에서 모시러 옵니다.",
    facility: "halls" },

  { id: "hall-contract", stage: "h4", who: "family",
    title: "장례식장 빈소·안치실 계약",
    desc: "유족의 거주지, 조문객이 오기 편한 곳, 예상 조문객 수에 맞는 빈소 크기를 따져 정합니다. 빈소 사용료·안치료 등 가격표는 장례식장이 e하늘에 등록해 두었습니다.",
    facility: "halls", ehaneul: true },
  { id: "sangjo-contract", stage: "h4", who: "family",
    title: "상조 상품 최종 계약",
    desc: "장례지도사와 만나 상품 구성(도우미 인원, 상복 대여, 제단 장식 등)을 확정합니다. 상품에 포함되지 않아 추가로 드는 비용이 무엇인지 계약 전에 꼭 물어보세요." },
  { id: "rite", stage: "h4", who: "family",
    title: "장례 방식 결정",
    desc: "유교식(일반), 기독교식, 천주교식, 불교식 등 고인과 유족의 종교에 따라 절차가 달라집니다. 화장할지 매장할지도 이때 정해 두면 이후가 수월합니다.",
    links: [{ href: "#/before/rites", label: "장례 방식·장지 알아보기" }] },

  { id: "obituary", stage: "d1", who: "family",
    title: "부고 알리기",
    desc: "모바일 부고장을 만들어 보내고 친지·지인에게 연락합니다. 빈소 위치, 발인 일시, 상주 이름을 정확히 적습니다." },
  { id: "binso", stage: "d1", who: "provider",
    title: "상복·제단·꽃장식·접객 도우미",
    desc: "상조회사나 장례식장이 준비합니다. 가족은 상품에 포함된 범위와 실제로 받는 내용이 같은지 확인합니다." },
  { id: "cremation-book", stage: "d1", who: "provider",
    title: "화장장 예약",
    desc: "보건복지부 e하늘 장사정보시스템에서 예약합니다. 보통 장례식장이나 상조회사가 대신 해 주지만, 어느 화장장 몇 시 회차인지 꼭 확인하세요. 화장장은 고인 주소지 주민에게 요금이 훨씬 쌉니다.",
    facility: "crematoria", ehaneul: true },
  { id: "burial-place", stage: "d1", who: "family",
    title: "장지(모실 곳) 정하기",
    desc: "봉안당·봉안담, 수목장·잔디장 같은 자연장, 공원묘지, 해양장 가운데 고르고 시설에 미리 연락해 둡니다.",
    facility: "burial", links: [{ href: "#/before/rites", label: "추모 방법 비교" }] },

  { id: "encoffin", stage: "d2", who: "provider",
    title: "입관",
    desc: "고인을 깨끗이 모시고 수의를 입혀 관에 모시는 절차입니다. 장례지도사가 진행하고 가족은 참관하며 마지막 인사를 드립니다." },

  { id: "balin", stage: "d3", who: "provider",
    title: "발인제와 운구",
    desc: "장례식장을 떠나기 전 마지막 제를 올리고, 운구차(리무진·버스)로 화장장이나 장지로 모십니다." },
  { id: "cremation", stage: "d3", who: "provider",
    title: "화장",
    desc: "예약한 화장장에서 진행합니다. 사망진단서(시체검안서)와 화장 예약 내역을 챙깁니다.",
    facility: "crematoria" },
  { id: "enshrine", stage: "d3", who: "family",
    title: "안치",
    desc: "정해 둔 봉안시설·자연장지·묘지에 모십니다. 시설마다 필요한 서류(화장증명서 등)가 다르니 미리 확인하세요.",
    facility: "burial" },

  { id: "death-report", stage: "after", who: "family",
    title: "사망신고",
    desc: "사망 사실을 안 날부터 1개월 이내에 가까운 읍·면·동 주민센터 등에 신고합니다. 늦으면 과태료가 부과됩니다. 사망진단서(시체검안서)를 가져갑니다.",
    links: [{ key: "gov24_death", label: "정부24 사망신고 안내" }] },
  { id: "inherit", stage: "after", who: "family",
    title: "안심상속 원스톱 서비스",
    desc: "고인의 금융 자산, 토지, 자동차, 세금, 국민연금 가입 내역 등을 한 번에 조회합니다. 신청 기한이 있으니 사망신고 때 함께 신청하는 것이 가장 편합니다.",
    links: [{ key: "gov24_inherit", label: "정부24 안심상속" }] },
  { id: "sangjo-find", stage: "after", who: "family",
    title: "고인 명의 상조 가입 확인",
    desc: "고인이 가입해 둔 상조가 있는지 모르겠다면 '내상조 찾아줘'나 안심상속으로 조회할 수 있습니다. 해약할 경우 예상 환급금도 계산해 볼 수 있습니다.",
    links: [{ key: "mysangjo", label: "내상조 찾아줘" }, { key: "refund_calc", label: "해약환급금 계산기" }] },
];

export const RITES = [
  { title: "유교식 (일반)", desc: "가장 흔한 방식입니다. 입관 뒤 성복(상복을 갖춰 입음), 발인 전 발인제를 지냅니다." },
  { title: "기독교식", desc: "입관·발인 때 예배를 드리고 제사 대신 추모 예배를 합니다. 소속 교회에 먼저 알립니다." },
  { title: "천주교식", desc: "연도(위령 기도)와 장례 미사를 드립니다. 소속 성당에 먼저 알립니다." },
  { title: "불교식", desc: "염불과 독경으로 고인을 보내며, 사찰에서 49재를 올리기도 합니다." },
];

export const BURIALS = [
  { kind: "charnels", title: "봉안당·봉안담", desc: "화장한 유골을 유골함에 담아 실내(봉안당)나 실외 벽(봉안담)에 모십니다. 안치 기간과 연장 조건이 시설마다 다릅니다." },
  { kind: "natural", title: "수목장·잔디장 (자연장)", desc: "화장한 골분을 나무, 잔디, 화초 밑에 묻는 친환경 방식입니다." },
  { kind: "cemeteries", title: "공원묘지", desc: "전통적인 매장묘나 가족 납골묘 형태입니다." },
  { kind: null, title: "해양장 (바다장)", desc: "지정된 해역에 골분을 뿌리는 방식입니다. 공공데이터에 시설 목록이 없어 상조회사나 전문 업체에 문의해야 합니다." },
];
