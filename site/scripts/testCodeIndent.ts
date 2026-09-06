import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { editCodeIndent } from "../src/codeIndent.ts";
import { codeKeyAction, CODE_CELL_KEYS, CODE_CELL_STYLE } from "../src/codeCell.ts";

const caretCode = "if True:\nprint('완료')";
const caretAt = caretCode.indexOf("print");
assert.deepEqual(editCodeIndent(caretCode, caretAt, caretAt), {
  code: "if True:\n    print('완료')",
  selectionStart: caretAt + 4,
  selectionEnd: caretAt + 4,
});

assert.deepEqual(editCodeIndent("\nprint('완료')", 0, 0), {
  code: "    \nprint('완료')",
  selectionStart: 4,
  selectionEnd: 4,
});

assert.deepEqual(editCodeIndent("first\nsecond", 0, 12), {
  code: "    first\n    second",
  selectionStart: 0,
  selectionEnd: 20,
});

assert.deepEqual(editCodeIndent("first\nsecond\nthird", 0, 13), {
  code: "    first\n    second\nthird",
  selectionStart: 0,
  selectionEnd: 21,
});

const indentedCode = "if True:\n    print('완료')";
const indentedCaret = indentedCode.indexOf("print");
assert.deepEqual(editCodeIndent(indentedCode, indentedCaret, indentedCaret, true), {
  code: caretCode,
  selectionStart: indentedCaret - 4,
  selectionEnd: indentedCaret - 4,
});

assert.deepEqual(editCodeIndent("  first\n\tsecond", 2, 16, true), {
  code: "first\nsecond",
  selectionStart: 0,
  selectionEnd: 12,
});

const classroom = await readFile(new URL("../classroom.ts", import.meta.url), "utf8");
const pyCell = await readFile(new URL("../src/components/PyCell.tsx", import.meta.url), "utf8");
for (const source of [classroom, pyCell]) {
  assert.match(source, /codeKeyAction\(/);
  assert.match(source, /editCodeIndent\(/);
  assert.match(source, /event\.preventDefault\(\)/);
}

assert.equal(codeKeyAction({ key: "Tab" }), "indent");
assert.equal(codeKeyAction({ key: "Tab", shiftKey: true }), "outdent");
assert.equal(codeKeyAction({ key: "Enter", shiftKey: true }), "run");
assert.equal(codeKeyAction({ key: "Enter" }), null);
assert.equal(codeKeyAction({ key: "Enter", shiftKey: true, isComposing: true }), null);
assert.equal(codeKeyAction({ key: "Tab", ctrlKey: true }), null);
assert.equal(codeKeyAction({ key: "Escape" }), "release");
assert.match(CODE_CELL_KEYS, /Shift\+Enter/);
assert.match(CODE_CELL_STYLE, /grid-template-columns:2\.75rem minmax\(0,1fr\)/);
for (const source of [classroom, pyCell]) {
  assert.match(source, /tabNavigation/);
  assert.match(source, /submittedCode/);
}

console.log("code indent: caret, selection, outdent와 두 코드 셀 연결 통과");
