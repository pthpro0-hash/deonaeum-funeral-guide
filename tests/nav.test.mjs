// 상단 메뉴에서 지금 화면이 어느 칸인지 고르는 규칙. 실행: node --test tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { navKey } from "../site/js/nav.js";

test("각 영역의 하위 화면도 같은 칸으로 표시한다", () => {
  assert.equal(navKey("/after/start"), "after");
  assert.equal(navKey("/after/d2"), "after");
  assert.equal(navKey("/before/sangjo/s12"), "before");
  assert.equal(navKey("/plan"), "plan");
  assert.equal(navKey("/plan/will"), "plan");
  assert.equal(navKey("/help"), "help");
});

test("홈과 출처 화면은 어느 칸도 아니다", () => {
  assert.equal(navKey("/"), null);
  assert.equal(navKey("/about"), null);
});

test("이름이 비슷한 다른 경로를 잘못 고르지 않는다", () => {
  assert.equal(navKey("/afterwards"), null);
  assert.equal(navKey("/planner"), null);
});
