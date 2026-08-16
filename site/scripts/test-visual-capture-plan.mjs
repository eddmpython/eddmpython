import assert from "node:assert/strict";
import {
  MAX_SINGLE_CAPTURE_HEIGHT,
  planFullPageCaptures,
} from "./visual-capture-plan.mjs";

const oneShot = planFullPageCaptures({
  width: 1440,
  height: MAX_SINGLE_CAPTURE_HEIGHT,
  viewportHeight: 1000,
});
assert.deepEqual(oneShot, [
  {
    kind: "full",
    fileToken: "full",
    options: { fullPage: true },
  },
]);

const desktopLong = planFullPageCaptures({ width: 1425, height: 37894, viewportHeight: 1000 });
assert.equal(desktopLong.length, 38);
assert.deepEqual(desktopLong.slice(0, 4).map((capture) => capture.scrollY), [0, 1000, 2000, 3000]);
assert.equal(desktopLong.at(-1).scrollY, 36894);
assert.equal(desktopLong.at(-1).segmentCount, 38);

const mobileLong = planFullPageCaptures({ width: 390, height: 41605, viewportHeight: 844 });
assert.equal(mobileLong.length, 50);
assert.equal(mobileLong.at(-1).scrollY, 40761);
assert.equal(mobileLong.every((capture) => Object.keys(capture.options).length === 0), true);

assert.throws(
  () => planFullPageCaptures({ width: 0, height: 1000, viewportHeight: 844 }),
  /너비가 올바르지 않습니다/,
);
assert.throws(
  () => planFullPageCaptures({ width: 390, height: Number.NaN, viewportHeight: 844 }),
  /높이가 올바르지 않습니다/,
);
assert.throws(
  () => planFullPageCaptures({ width: 390, height: 1000, viewportHeight: 0 }),
  /뷰포트 높이가 올바르지 않습니다/,
);

console.log("visual capture plan: 일반 페이지와 긴 페이지 5 cases");
