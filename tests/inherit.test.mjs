// 법정상속분 계산기 테스트. 실행: node --test tests/*.test.mjs
// 기대값은 민법 제1000조·제1003조·제1009조 조문에서 손으로 계산한 값이다.
import { test } from "node:test";
import assert from "node:assert/strict";
import { legalShares } from "../site/js/inherit.js";

const view = (r) => Object.fromEntries(r.heirs.map((h) => [h.key, `${h.each.n}/${h.each.d}x${h.count}`]));

test("배우자 + 자녀 2명: 1.5 : 1 : 1 → 3/7, 2/7씩", () => {
  assert.deepEqual(view(legalShares({ spouse: true, children: 2 })), { spouse: "3/7x1", children: "2/7x2" });
});

test("배우자 + 자녀 1명: 3/5, 2/5", () => {
  assert.deepEqual(view(legalShares({ spouse: true, children: 1 })), { spouse: "3/5x1", children: "2/5x1" });
});

test("배우자 + 자녀 3명: 3/9=1/3, 2/9씩", () => {
  assert.deepEqual(view(legalShares({ spouse: true, children: 3 })), { spouse: "1/3x1", children: "2/9x3" });
});

test("자녀가 있으면 직계존속·형제자매는 상속인이 아니다", () => {
  const r = legalShares({ spouse: true, children: 2, ascendants: 2, siblings: 3 });
  assert.equal(r.order, 1);
  assert.deepEqual(view(r), { spouse: "3/7x1", children: "2/7x2" });
});

test("배우자 + 부모 2명(자녀 없음): 3/7, 2/7씩", () => {
  const r = legalShares({ spouse: true, ascendants: 2, siblings: 2 });
  assert.equal(r.order, 2);
  assert.deepEqual(view(r), { spouse: "3/7x1", ascendants: "2/7x2" });
});

test("배우자 + 형제자매(자녀·직계존속 없음): 배우자 단독", () => {
  const r = legalShares({ spouse: true, siblings: 3 });
  assert.deepEqual(view(r), { spouse: "1/1x1" });
});

test("배우자만: 단독상속", () => {
  assert.deepEqual(view(legalShares({ spouse: true })), { spouse: "1/1x1" });
});

test("배우자 없이 자녀 3명: 1/3씩", () => {
  assert.deepEqual(view(legalShares({ children: 3 })), { children: "1/3x3" });
});

test("배우자·자녀 없이 부모 2명: 1/2씩, 형제자매 제외", () => {
  assert.deepEqual(view(legalShares({ ascendants: 2, siblings: 4 })), { ascendants: "1/2x2" });
});

test("형제자매 4명만: 1/4씩", () => {
  const r = legalShares({ siblings: 4 });
  assert.equal(r.order, 3);
  assert.deepEqual(view(r), { siblings: "1/4x4" });
});

test("아무도 없으면 4순위 안내", () => {
  const r = legalShares({});
  assert.equal(r.order, 4);
  assert.equal(r.heirs.length, 0);
});

test("모든 경우 합계는 1", () => {
  for (const spouse of [true, false]) for (let c = 0; c < 5; c++) for (let a = 0; a < 3; a++) for (let s = 0; s < 3; s++) {
    const r = legalShares({ spouse, children: c, ascendants: a, siblings: s });
    if (!r.heirs.length) continue;
    const sum = r.heirs.reduce((t, h) => t + (h.each.n / h.each.d) * h.count, 0);
    assert.ok(Math.abs(sum - 1) < 1e-12, JSON.stringify({ spouse, c, a, s, sum }));
  }
});
