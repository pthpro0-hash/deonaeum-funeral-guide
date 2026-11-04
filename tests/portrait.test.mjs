// 영정사진 자르기·품질 규칙. 실행: node --test tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { ASPECT, cropRect, photoBox, printQuality, tone } from "../site/js/portrait.js";

const near = (a, b) => Math.abs(a - b) < 1e-6;

test("가로로 긴 사진은 높이를 다 쓰고 4:5로 가운데를 자른다", () => {
  const c = cropRect(4000, 3000, { zoom: 1, cx: 0.5, cy: 0.5 });
  assert.ok(near(c.sh, 3000) && near(c.sw, 2400) && near(c.sx, 800) && near(c.sy, 0));
  assert.ok(near(c.sw / c.sh, ASPECT));
});

test("세로로 긴 사진은 폭을 다 쓴다", () => {
  const c = cropRect(3000, 6000, { zoom: 1, cx: 0.5, cy: 0.3 });
  assert.ok(near(c.sw, 3000) && near(c.sh, 3750));
  assert.ok(near(c.sy, 0)); // 중심 1800에서 위로 1875 → 넘치므로 0에서 멈춘다
});

test("확대하면 영역이 줄고, 가장자리 밖으로는 나가지 않는다", () => {
  const c = cropRect(4000, 3000, { zoom: 2, cx: 0.99, cy: 0.99 });
  assert.ok(near(c.sw, 1200) && near(c.sh, 1500));
  assert.ok(near(c.sx + c.sw, 4000) && near(c.sy + c.sh, 3000));
  const z = cropRect(4000, 3000, { zoom: 99 });
  assert.ok(near(z.sh, 750)); // 최대 4배
});

test("액자가 있으면 사진 자리가 안쪽으로 들어가고 비율은 비슷하다", () => {
  assert.deepEqual(photoBox(2400, 3000, "none"), { x: 0, y: 0, w: 2400, h: 3000 });
  assert.deepEqual(photoBox(2400, 3000, "ribbon"), { x: 144, y: 144, w: 2112, h: 2712 });
});

test("인쇄 품질은 잘라 낸 원본 높이로 판단한다", () => {
  assert.equal(printQuality(3000).level, "good");
  assert.equal(printQuality(1500).level, "ok");
  assert.equal(printQuality(900).level, "low");
});

test("흑백은 세 채널을 같은 밝기로, 밝기는 255를 넘지 않는다", () => {
  const d = tone(new Uint8ClampedArray([200, 100, 50, 255]), { mono: true, bright: 0 });
  assert.equal(d[0], d[1]); assert.equal(d[1], d[2]); assert.equal(d[3], 255);
  const b = tone(new Uint8ClampedArray([250, 10, 10, 255]), { mono: false, bright: 30 });
  assert.equal(b[0], 255); assert.equal(b[1], 13);
});
