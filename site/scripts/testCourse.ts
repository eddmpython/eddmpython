import assert from "node:assert/strict";

import { course, parseCourseText, roomCourse, validCurriculum } from "../course.ts";
import type { Env } from "../env.ts";

function courseEnv(bundle: unknown): Env {
  return {
    COURSE: {
      get: async () => JSON.stringify(bundle),
    },
  } as unknown as Env;
}

const splitCategories = await course(courseEnv({
  schema: 4,
  sceneContract: 12,
  categories: [
    { slug: "03-02-excel-consolidation", order: 302, displayNumber: "04-02", title: "취합", posts: [] },
    { slug: "03-01-excel-lite-automation", order: 301, displayNumber: "04-01", title: "Lite", posts: [] },
  ],
}));

assert.equal(splitCategories.ok, true);
assert.deepEqual(
  splitCategories.categories.map((category) => [category.slug, category.displayNumber]),
  [
    ["03-01-excel-lite-automation", "04-01"],
    ["03-02-excel-consolidation", "04-02"],
  ],
);

const invalidNumber = await course(courseEnv({
  schema: 4,
  sceneContract: 12,
  categories: [
    { slug: "03-bad", order: 300, displayNumber: "chapter-four", title: "잘못된 번호", posts: [] },
  ],
}));

assert.equal(invalidNumber.categories[0]?.displayNumber, undefined);
console.log("course: 하위 과정 표시 번호 계약 통과");

const source = (await course(courseEnv({ schema: 1, categories: [
  { slug: "01-a", order: 1, title: "A", posts: ["first", "second"].map(id => ({ id, title: id, summary: "", body: id })) },
  { slug: "02-b", order: 2, title: "B", posts: [{ id: "third", title: "third", summary: "", body: "third" }] },
] }))).categories;
const before = JSON.stringify(source);
const selected = roomCourse(source, { unlocked: [], curriculum: [{ category: "02-b", posts: ["third"] }, { category: "01-a", posts: ["second", "first"] }] });
assert.deepEqual(selected.map(c => [c.slug, c.posts.map(p => p.id), c.nextCategory]), [["02-b", ["third"], "01-a"], ["01-a", ["second", "first"], undefined]]);
assert.equal(selected[1].posts[0], source[0].posts[1]);
assert.equal(JSON.stringify(source), before);
assert.deepEqual(roomCourse(source, { unlocked: ["01-a"], curriculum: [] }), []);
assert.equal(roomCourse(source, { unlocked: ["01-a"] })[0], source[0]);
assert.deepEqual(roomCourse(source, { unlocked: [], curriculum: [{ category: "01-a", posts: ["missing"] }] }), []);
assert.equal(validCurriculum([{ category: "01-a", posts: ["first", "first"] }]), false);
assert.equal(validCurriculum([{ category: "01-a", posts: ["first"] }, { category: "01-a", posts: ["second"] }]), false);
assert.equal(validCurriculum([{ category: "01-a", posts: [] }]), false);
console.log("course: 프로젝트별 선택·순서, 공통 원본 보존, 기존 강의장 호환 확인");

const introVideo = `room://${"e".repeat(64)}.mp4`;
const introPoster = `room://${"f".repeat(64)}.webp`;
const videoBundle = (schema: unknown, extra: Record<string, unknown> = {}) => JSON.stringify({
  schema, sceneContract: 12, categories: [{ slug: "01-video", order: 1, title: "영상", posts: [
    { id: "01-first", title: "첫 수업", summary: "설명", body: "본문", introVideo, introPoster, ...extra },
  ] }],
});
for (const schema of [4, 5, 6]) {
  const parsed = parseCourseText(videoBundle(schema));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.categories[0].posts[0].introVideo, introVideo);
  assert.equal(parsed.categories[0].posts[0].introPoster, introPoster);
}
for (const schema of ["6", 7]) assert.equal(parseCourseText(videoBundle(schema)).ok, false);
assert.equal(parseCourseText(videoBundle(5).replace('"sceneContract":12', '"sceneContract":99')).ok, false);
for (const invalid of ["javascript:alert(1)", "https://example.com/video.mp4", `room://${"e".repeat(64)}.svg`, 1, null]) {
  const parsed = parseCourseText(videoBundle(5, { introVideo: invalid }));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.categories[0].posts[0].introVideo, undefined);
  assert.equal(parsed.categories[0].posts[0].body, "본문");
}
for (const invalid of ["javascript:alert(1)", `room://${"f".repeat(64)}.mp4`, "room://bad.webp", null]) {
  assert.equal(parseCourseText(videoBundle(5, { introPoster: invalid })).categories[0].posts[0].introPoster, undefined);
}
console.log("course: schema 4·5·6 상단 영상, 잘못된 미디어 제외와 본문 유지 확인");

assert.equal(parseCourseText(videoBundle(6, { optional: true })).categories[0].posts[0].optional, true);
for (const optional of [false, undefined, "true", 1, null]) {
  assert.equal(parseCourseText(videoBundle(6, { optional })).categories[0].posts[0].optional, false);
}
for (const schema of [4, 5]) {
  assert.equal(parseCourseText(videoBundle(schema, { optional: true })).categories[0].posts[0].optional, false);
}
const optionalCourse = parseCourseText(videoBundle(6, { optional: true })).categories;
assert.equal(roomCourse(optionalCourse, { unlocked: [], curriculum: [{ category: "01-video", posts: ["01-first"] }] })[0].posts[0].optional, true);
console.log("course: schema 6 선택편 boolean과 배정 시 메타데이터 유지 확인");
