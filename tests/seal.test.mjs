// 잠근 노트 파일 테스트. 실행: node --test tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { ITERATIONS, makeCode, normCode, seal, unseal } from "../site/js/seal.js";

test("비밀 문구: 12자, 헷갈리는 글자 없음, 4자씩 묶음", () => {
  for (let i = 0; i < 50; i++) {
    const c = makeCode();
    assert.match(c, /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    assert.doesNotMatch(c, /[01IO]/);
  }
  assert.equal(normCode(" k7mp 2qxr-9wta "), "K7MP2QXR9WTA");
});

test("잠그고 풀면 같은 내용, 띄어쓰기·소문자로 입력해도 된다", async () => {
  const payload = { data: { "note.story": { born: "통영" } } };
  const f = await seal(payload, "ABCD-EFGH-JKMN", { made: "2026-11-05" });
  assert.equal(f.kdf.iterations, ITERATIONS);
  assert.ok(!JSON.stringify(f).includes("통영"));
  const r = await unseal(JSON.stringify(f), "abcd efgh jkmn");
  assert.deepEqual(r, { made: "2026-11-05", payload });
});

test("틀린 문구, 다른 파일, 비정상 반복 횟수는 거절", async () => {
  const f = await seal({ a: 1 }, "ABCD-EFGH-JKMN");
  await assert.rejects(unseal(JSON.stringify(f), "ABCD-EFGH-JKMP"), /비밀 문구가 맞지 않습니다/);
  await assert.rejects(unseal("{}", "x"), /인생 노트 파일이 아닙니다/);
  await assert.rejects(unseal("not json", "x"), /인생 노트 파일이 아닙니다/);
  await assert.rejects(unseal(JSON.stringify({ ...f, kdf: { ...f.kdf, iterations: 1e9 } }), "ABCD-EFGH-JKMN"), /인생 노트 파일이 아닙니다/);
  await assert.rejects(seal({}, "short"), /너무 짧습니다/);
});
