import assert from "node:assert/strict";

import { course, roomCourse, validCurriculum } from "../course.ts";
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
