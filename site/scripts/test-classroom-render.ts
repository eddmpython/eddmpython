/**
 * 강의장 교안 렌더 검사.
 *
 * 지키는 것은 강의장에서 실제로 깨지면 강의가 멈추는 것들이다. 코드가 갈라지지 않을 것,
 * 교안에 들어 있는 HTML 이 그대로 실행되지 않을 것, 시각 자산이 제 태그로 나갈 것.
 */
import assert from "node:assert/strict";
import { renderMarkdown, renderPost, inline, esc } from "../classroom-render.ts";

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
  // 목차가 뛰어갈 자리라 h2 에는 번호 앵커가 붙는다
  assert.ok(html.includes('<h2 id="s1">큰 제목</h2>'));
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

check("바깥 영상은 눌러야 부르는 유튜브 자리가 된다", () => {
  const html = renderMarkdown("[초밥 게임 봇](https://www.youtube.com/watch?v=lfk_T6VKhTE)");
  assert.ok(html.includes('class="yt"'));
  assert.ok(html.includes('data-yt="lfk_T6VKhTE"'));
  assert.ok(html.includes("초밥 게임 봇"));
  // 미리 부르면 강의 화면에 검은 칸이 먼저 뜨고 열지도 않은 영상이 바깥 요청을 만든다
  assert.ok(!html.includes("<iframe"));
  // 썸네일이 img 면 눌렀을 때 영상이 아니라 사진 확대가 열린다
  assert.ok(!html.includes("<img"));
});

check("shorts 는 세로 틀로 나간다", () => {
  const html = renderMarkdown("[엑셀은 zip](https://www.youtube.com/shorts/l4J3QvePJtQ)");
  assert.ok(html.includes('class="yt tall"'));
  assert.ok(html.includes("/shorts/l4J3QvePJtQ"));
});

check("시연 구간 시작 초를 버리지 않는다", () => {
  // 바깥 사례 영상은 앞부분이 인사와 얼굴인 것이 많다. 초를 떨어뜨리면 도입부가 먼저 뜬다.
  const html = renderMarkdown("[상장 자동제작](https://www.youtube.com/watch?v=1pC_UXhiJH8&t=590s)");
  assert.ok(html.includes('data-start="590"'));
  // 새 탭으로 나가는 사람도 같은 자리에서 봐야 한다. 속성 안이므로 & 는 &amp; 로 나간다
  assert.ok(html.includes("watch?v=1pC_UXhiJH8&amp;t=590"));
});

check("시작 초가 없으면 data-start 를 붙이지 않는다", () => {
  const html = renderMarkdown("[초밥 게임 봇](https://www.youtube.com/watch?v=lfk_T6VKhTE)");
  assert.ok(!html.includes("data-start"));
});

check("1m30s 꼴의 시작 초도 읽는다", () => {
  const html = renderMarkdown("[사례](https://www.youtube.com/watch?v=lfk_T6VKhTE&t=1m30s)");
  assert.ok(html.includes('data-start="90"'));
});

check("shorts 의 시작 초는 물음표로 붙인다", () => {
  // shorts 주소에는 아직 쿼리가 없으므로 & 로 붙이면 깨진 주소가 된다
  const html = renderMarkdown("[세로 사례](https://www.youtube.com/shorts/l4J3QvePJtQ?t=12)");
  assert.ok(html.includes('data-start="12"'));
  assert.ok(html.includes("/shorts/l4J3QvePJtQ?t=12"));
});

check("문장 안의 유튜브 링크는 그대로 링크로 둔다", () => {
  const html = renderMarkdown("먼저 [영상](https://youtu.be/priwCYZJ8h4)을 보시기 바랍니다");
  assert.ok(html.startsWith("<p>"));
  assert.ok(!html.includes('class="yt'));
});

check("발행 전 시각물은 깨진 그림 대신 준비 중 자리가 된다", () => {
  const html = renderMarkdown('![빈 사무실 모습](media://scheduled-run "캡션")');
  assert.ok(html.includes('class="pending"'));
  assert.ok(html.includes("scheduled-run"));
  assert.ok(html.includes("빈 사무실 모습"));
  // 자리표시자가 src 로 나가면 브라우저가 페이지를 통째로 다시 내려받는다
  assert.ok(!html.includes("media://"));
  assert.ok(!html.includes("<img"));
});

check("CRLF 교안도 같게 나온다", () => {
  const lf = renderMarkdown("## 제목\n\n본문");
  const crlf = renderMarkdown("## 제목\r\n\r\n본문");
  assert.equal(lf, crlf);
});

check("본문과 목차를 같이 낸다", () => {
  // 절이 스물 몇 개인 글에서 목차 없이 스크롤로 찾으면 강의 시간이 버려진다
  const { html, headings } = renderPost(
    ["## 첫 절", "", "### 부제", "", "본문입니다", "", "## 둘째 절", "", "본문입니다"].join("\n"),
  );
  assert.deepEqual(headings, ["첫 절", "둘째 절"]);
  assert.ok(html.includes('id="s1"'));
  assert.ok(html.includes('id="s2"'));
});

check("코드 블록 안의 ## 은 목차에 오르지 않는다", () => {
  const { headings } = renderPost(["## 진짜 절", "", "```", "## 주석입니다", "```"].join("\n"));
  assert.deepEqual(headings, ["진짜 절"]);
});

console.log(`classroom render: 코드 분할과 escape 등 ${count} cases`);
