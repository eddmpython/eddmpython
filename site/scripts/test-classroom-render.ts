/**
 * 강의장 교안 렌더 검사.
 *
 * 지키는 것은 강의장에서 실제로 깨지면 강의가 멈추는 것들이다. 코드가 갈라지지 않을 것,
 * 교안에 들어 있는 HTML 이 그대로 실행되지 않을 것, 시각 자산이 제 태그로 나갈 것.
 */
import assert from "node:assert/strict";
import { renderMarkdown, inline, esc } from "../classroom-render.ts";

let count = 0;
const check = (label: string, fn: () => void) => {
  fn();
  count += 1;
};

check("코드 안의 빈 줄이 코드를 가르지 않는다", () => {
  const html = renderMarkdown(
    ["```python", "a = 1", "", "print(a)", "```"].join("\n"),
  );
  assert.equal(html, "<pre>a = 1\n\nprint(a)</pre>");
  // 갈라졌다면 pre 가 둘이거나 p 가 생긴다
  assert.equal(html.match(/<pre>/g)?.length, 1);
  assert.ok(!html.includes("<p>"));
});

check("코드 앞뒤의 글은 문단으로 남는다", () => {
  const html = renderMarkdown(["앞말", "", "```", "x", "", "y", "```", "", "뒷말"].join("\n"));
  assert.ok(html.startsWith("<p>앞말</p>"));
  assert.ok(html.endsWith("<p>뒷말</p>"));
  assert.equal(html.match(/<pre>/g)?.length, 1);
});

check("코드 안의 꺾쇠는 태그가 되지 않는다", () => {
  const html = renderMarkdown(["```", "<script>alert(1)</script>", "```"].join("\n"));
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
});

check("교안 본문의 HTML 도 태그가 되지 않는다", () => {
  const html = renderMarkdown('<img src=x onerror="alert(1)">');
  assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes("&lt;img"));
});

check("연속 이미지는 슬라이더가 된다", () => {
  const html = renderMarkdown(["![하나](a.png)", "", "![둘](b.png)", "", "![셋](c.png)"].join("\n"));
  assert.equal(html.match(/<div class="slider">/g)?.length, 1);
  assert.equal(html.match(/<img /g)?.length, 3);
});

check("이미지 하나는 슬라이더가 아니다", () => {
  const html = renderMarkdown("![하나](a.png)");
  assert.ok(!html.includes("slider"));
  assert.ok(html.includes('<img src="a.png"'));
});

check("영상은 재생기가 된다", () => {
  const html = renderMarkdown("![보기](https://example.com/x.mp4)");
  assert.ok(html.includes("<video"));
  assert.ok(html.includes("controls"));
  assert.ok(!html.includes("<img"));
});

check("영상은 슬라이더에 섞이지 않는다", () => {
  const html = renderMarkdown(["![a](a.png)", "", "![v](v.webm)", "", "![b](b.png)"].join("\n"));
  assert.ok(html.includes("<video"));
  // 앞뒤 이미지가 각각 혼자라 슬라이더가 생기지 않는다
  assert.ok(!html.includes("slider"));
});

check("제목과 목록이 제 태그로 나간다", () => {
  const html = renderMarkdown(["## 큰 제목", "", "#### 작은 제목", "", "- 하나", "- 둘"].join("\n"));
  assert.ok(html.includes("<h2>큰 제목</h2>"));
  assert.ok(html.includes("<h4>작은 제목</h4>"));
  assert.equal(html.match(/<li>/g)?.length, 2);
});

check("링크와 굵게와 인라인 코드", () => {
  assert.equal(inline("[가기](https://a.b)"), '<a href="https://a.b">가기</a>');
  assert.equal(inline("**굵게**"), "<strong>굵게</strong>");
  assert.equal(inline("`code`"), "<code>code</code>");
});

check("따옴표와 꺾쇠가 escape 된다", () => {
  assert.equal(esc(`<a href="x">'&`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
});

check("CRLF 교안도 같게 나온다", () => {
  const lf = renderMarkdown("## 제목\n\n본문");
  const crlf = renderMarkdown("## 제목\r\n\r\n본문");
  assert.equal(lf, crlf);
});

console.log(`classroom render: 코드 분할과 escape 등 ${count} cases`);
