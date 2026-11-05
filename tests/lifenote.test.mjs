// 나의 인생 노트 계산 테스트. 실행: node --test tests/*.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addMonth, buildBackup, keepersDecided, looksLikeBequest, looksLikeSecretNumber, noticeDue, noticeIcs,
  noticeText, normPhone, obituaryDraft, parseBackup, parseCsv, validKeepers,
} from "../site/js/lifenote.js";

test("지킴이: 정하지 않으면 미결정, '없음'은 결정", () => {
  assert.equal(keepersDecided(null), false);
  assert.equal(keepersDecided({ mode: "set", list: [] }), false);
  assert.equal(keepersDecided({ mode: "set", list: [{ name: "  " }] }), false);
  assert.equal(keepersDecided({ mode: "none" }), true);
  assert.equal(keepersDecided({ mode: "set", list: [{ name: "김딸" }] }), true);
});

test("지킴이는 최대 3명, 이름 없는 칸은 버린다", () => {
  const l = validKeepers([{ name: "a" }, { name: "" }, { name: "b" }, { name: "c" }, { name: "d" }]);
  assert.deepEqual(l.map((x) => x.name), ["a", "b", "c"]);
});

test("휴대폰 번호 정리", () => {
  assert.equal(normPhone("010-1234-5678"), "01012345678");
  assert.equal(normPhone("011 234 5678"), "0112345678");
  assert.equal(normPhone("02-123-4567"), "");
  assert.equal(normPhone(""), "");
});

test("한 달 뒤: 말일 보정과 해 넘김", () => {
  assert.equal(addMonth("2026-11-05"), "2026-12-05");
  assert.equal(addMonth("2026-12-15"), "2027-01-15");
  assert.equal(addMonth("2027-01-31"), "2027-02-28");
  assert.equal(addMonth("2028-01-31"), "2028-02-29");
});

test("월 안내 시점", () => {
  assert.equal(noticeDue(null, "2026-11-05"), true);
  assert.equal(noticeDue("2026-11-05", "2026-12-04"), false);
  assert.equal(noticeDue("2026-11-05", "2026-12-05"), true);
  assert.equal(noticeDue("2026-11-05", "2027-03-01"), true);
});

test("안내 문구: 노트 내용이 없고, 피하는 말이 없다", () => {
  const t = noticeText({ owner: "김OO", keeper: "김딸", place: "서재 서랍", url: "https://x/#/note/keeper" });
  assert.match(t, /김OO님이 인생 노트/);
  assert.match(t, /김딸님을 노트 지킴이로/);
  assert.match(t, /서재 서랍/);
  assert.match(t, /#\/note\/keeper/);
  for (const w of ["죽음", "부고", "임종", "사후", "고인", "사망", "유품", "생존"]) assert.ok(!t.includes(w), w);
  const noPlace = noticeText({ owner: "", keeper: "", place: "", url: "u" });
  assert.ok(!noPlace.includes("인쇄한 노트는"));
  assert.match(noPlace, /^\[나의 인생 노트\] 제가 인생 노트/);
});

test("캘린더 파일: 매월 반복, 29일 이후는 28일로", () => {
  const ics = noticeIcs({ start: "2026-11-30", url: "https://x/#/note/notice", uid: "u1@deonaeum" });
  assert.match(ics, /RRULE:FREQ=MONTHLY/);
  assert.match(ics, /DTSTART:20261128T100000/);
  assert.match(ics, /BEGIN:VALARM/);
  assert.ok(ics.includes("\r\n"));
  assert.match(ics, /DESCRIPTION:노트 지킴이에게 이번 달 안내를 보내 주세요\.\\nhttps:\/\/x\/#\/note\/notice/);
});

test("CSV: 머리글, 따옴표, 번호 정리", () => {
  const r = parseCsv('﻿이름,모임,전화\n김철수,오랜 친구,010-1111-2222\n"박, 영희",,\n\n이민수,직장 동료,02-555-0000');
  assert.deepEqual(r, [
    { name: "김철수", group: "오랜 친구", phone: "01011112222", exclude: false },
    { name: "박, 영희", group: "가족", phone: "", exclude: false },
    { name: "이민수", group: "직장 동료", phone: "", exclude: false },
  ]);
});

test("숫자 덩어리 경고와 재산 표현 안내", () => {
  assert.equal(looksLikeSecretNumber("국민은행"), false);
  assert.equal(looksLikeSecretNumber("123-456-78"), true);
  assert.equal(looksLikeSecretNumber("950101 1234567"), true);
  assert.equal(looksLikeSecretNumber("2024년 3월"), false);
  assert.equal(looksLikeBequest("고마웠어"), false);
  assert.equal(looksLikeBequest("아파트는 큰딸에게"), true);
});

test("소식 전하는 글: 종교 표현과 빈칸", () => {
  const d = obituaryDraft({ name: "김OO", term: "catholic", burial: "", words: "고마웠어요" });
  assert.match(d, /^김OO님께서 ____년 __월 __일 선종하셨습니다\./);
  assert.match(d, /장지: ____________/);
  assert.match(d, /고마웠어요$/);
  assert.match(obituaryDraft({}), /○○○님께서 .* 별세하셨습니다/);
});

test("백업: 알려진 키만 저장·복원", () => {
  const store = { "note.story": { born: "부산" }, "plan.wishes": { method: "화장" }, "here": { sido: "x" } };
  const b = buildBackup((k) => store[k], "2026-11-05T00:00:00Z");
  assert.deepEqual(Object.keys(b.data).sort(), ["note.story", "plan.wishes"]);
  const text = JSON.stringify({ ...b, data: { ...b.data, evil: 1 } });
  const r = parseBackup(text);
  assert.deepEqual(Object.keys(r.data).sort(), ["note.story", "plan.wishes"]);
  assert.throws(() => parseBackup("{}"), /백업 파일이 아닙니다/);
  assert.throws(() => parseBackup("not json"), /백업 파일이 아닙니다/);
});
