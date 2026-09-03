import assert from "node:assert/strict";

import { course } from "../course.ts";
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
