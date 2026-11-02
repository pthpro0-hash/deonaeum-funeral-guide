// 법정상속분 계산. 민법 제1000조(순위), 제1003조(배우자), 제1009조(상속분)만 따른다.
// 국가법령정보센터 민법 [시행 2026. 3. 17.] [법률 제21454호] 기준, 2026-11-02 확인.
// 대습상속·상속결격·기여분·특별수익은 계산하지 않는다(화면에서 따로 안내).

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const frac = (n, d) => { const g = gcd(n, d); return { n: n / g, d: d / g }; };

// family: { spouse: bool, children: n, ascendants: n, siblings: n }
// 돌려줌: { order, heirs: [{ key, label, count, each: {n,d} }], note }
export function legalShares({ spouse = false, children = 0, ascendants = 0, siblings = 0 } = {}) {
  const groups = [
    { order: 1, key: "children", label: "자녀(직계비속)", count: children },
    { order: 2, key: "ascendants", label: "직계존속", count: ascendants },
    { order: 3, key: "siblings", label: "형제자매", count: siblings },
  ];
  // 제1000조①: 앞 순위가 있으면 뒤 순위는 상속인이 되지 못한다.
  // 제1003조①: 배우자는 1·2순위와 공동상속, 없으면 단독상속(형제자매보다 앞선다).
  let g = groups.find((x) => x.count > 0) || null;
  if (spouse && g && g.order === 3) g = null;

  if (!g && !spouse) {
    return { order: 4, heirs: [], note: "4촌 이내의 방계혈족이 상속인이 됩니다(제1000조①4호). 이 계산기 범위 밖이니 전문가와 상의하세요." };
  }
  if (!g) {
    return { order: 0, heirs: [{ key: "spouse", label: "배우자", count: 1, each: { n: 1, d: 1 } }], note: "배우자가 단독상속인이 됩니다(제1003조①)." };
  }
  // 제1009조: 같은 순위는 균분, 배우자는 5할 가산. 반 단위로 세면 배우자 3, 나머지 2.
  const total = (spouse ? 3 : 0) + 2 * g.count;
  const heirs = [];
  if (spouse) heirs.push({ key: "spouse", label: "배우자", count: 1, each: frac(3, total) });
  heirs.push({ key: g.key, label: g.label, count: g.count, each: frac(2, total) });
  return { order: g.order, heirs, note: "" };
}
