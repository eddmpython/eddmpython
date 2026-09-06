export type CodeIndentEdit = {
  code: string;
  selectionStart: number;
  selectionEnd: number;
};

/** 코드 입력 칸에서 Tab과 Shift+Tab이 적용할 문자열과 선택 범위를 계산한다. */
export function editCodeIndent(
  code: string,
  selectionStart: number,
  selectionEnd: number,
  outdent = false,
): CodeIndentEdit {
  const safeStart = Number.isFinite(selectionStart) ? selectionStart : 0;
  const safeEnd = Number.isFinite(selectionEnd) ? selectionEnd : safeStart;
  const start = Math.max(0, Math.min(code.length, safeStart));
  const end = Math.max(start, Math.min(code.length, safeEnd));
  const indent = "    ";

  if (!outdent && start === end) {
    return {
      code: code.slice(0, start) + indent + code.slice(end),
      selectionStart: start + indent.length,
      selectionEnd: start + indent.length,
    };
  }

  const lineStart = start === 0 ? 0 : code.lastIndexOf("\n", start - 1) + 1;
  const selectedEnd = end > start && code[end - 1] === "\n" ? end - 1 : end;
  const nextBreak = code.indexOf("\n", selectedEnd);
  const lineEnd = nextBreak < 0 ? code.length : nextBreak;
  const lines = code.slice(lineStart, lineEnd).split("\n");

  if (!outdent) {
    const replacement = lines.map((line) => indent + line).join("\n");
    const startShift = start === lineStart ? 0 : indent.length;
    return {
      code: code.slice(0, lineStart) + replacement + code.slice(lineEnd),
      selectionStart: start + startShift,
      selectionEnd: end + indent.length * lines.length,
    };
  }

  let removedFirst = 0;
  let removedTotal = 0;
  const replacement = lines
    .map((line, index) => {
      const spaces = line.match(/^ {1,4}/)?.[0].length ?? 0;
      const removed = spaces || (line.startsWith("\t") ? 1 : 0);
      if (index === 0) removedFirst = removed;
      removedTotal += removed;
      return line.slice(removed);
    })
    .join("\n");
  const removedBeforeStart = Math.min(removedFirst, start - lineStart);
  const nextStart = Math.max(lineStart, start - removedBeforeStart);

  return {
    code: code.slice(0, lineStart) + replacement + code.slice(lineEnd),
    selectionStart: nextStart,
    selectionEnd: Math.max(nextStart, end - removedTotal),
  };
}
