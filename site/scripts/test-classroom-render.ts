/**
 * 강의장 교안 렌더 검사.
 *
 * 지키는 것은 강의장에서 실제로 깨지면 강의가 멈추는 것들이다. 코드가 갈라지지 않을 것,
 * 교안에 들어 있는 HTML 이 그대로 실행되지 않을 것, 시각 자산이 제 태그로 나갈 것.
 */
import assert from "node:assert/strict";
import {
  COURSE_SCENE_RUNTIME,
  applyGlossary,
  compileSceneTimeline,
  renderLecture,
  renderMarkdown,
  renderPost,
  splitCourseSections,
  inline,
  esc,
  mediaContentType,
  ROOM_MEDIA_KEY,
  type CourseScene,
} from "../classroom-render.ts";

let count = 0;
const check = (label: string, fn: () => void) => {
  fn();
  count += 1;
};

check("코드 안의 빈 줄이 코드를 가르지 않는다", () => {
  const html = renderMarkdown(
    ["```python", "a = 1", "", "print(a)", "```"].join("\n"),
  );
  // 코드 펜스는 강의 시각물이 아니다 (계약 12). 시각물 번호를 받지 않는다.
  assert.equal(html, "<pre>a = 1\n\nprint(a)</pre>");
  // 갈라졌다면 pre 가 둘이거나 p 가 생긴다
  assert.equal(html.match(/<pre(?:\s|>)/g)?.length, 1);
  assert.ok(!html.includes("<p>"));
});

check("코드 앞뒤의 글은 문단으로 남는다", () => {
  const html = renderMarkdown(["앞말", "", "```", "x", "", "y", "```", "", "뒷말"].join("\n"));
  assert.ok(html.startsWith("<p>앞말</p>"));
  assert.ok(html.endsWith("<p>뒷말</p>"));
  assert.equal(html.match(/<pre(?:\s|>)/g)?.length, 1);
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

check("마크다운 단계는 연속 시각물을 원래 순서로 보존한다", () => {
  const html = renderMarkdown(["![하나](a.png)", "", "![둘](b.png)", "", "![셋](c.png)"].join("\n"));
  assert.ok(!html.includes("visual-carousel"));
  assert.equal(html.match(/<img /g)?.length, 3);
});

check("마크다운 단계의 이미지 하나는 시각물로 렌더링된다", () => {
  const html = renderMarkdown("![하나](a.png)");
  assert.ok(html.includes('<img src="a.png"'));
});

check("영상은 재생기가 된다", () => {
  const html = renderMarkdown("![보기](https://example.com/x.mp4)");
  assert.ok(html.includes("<video"));
  assert.ok(html.includes("controls"));
  assert.ok(!html.includes("<img"));
});

check("영상과 이미지는 마크다운 단계에서 각각 시각물로 남는다", () => {
  const html = renderMarkdown(["![a](a.png)", "", "![v](v.webm)", "", "![b](b.png)"].join("\n"));
  assert.ok(html.includes("<video"));
  assert.equal(html.match(/data-visual=/g)?.length, 3);
});

check("읽기 모드는 H2의 모든 시각물을 하나의 16대9 캐러셀로 묶는다", () => {
  const body = [
    "## 캐러셀 장면",
    "",
    "### 같은 자리에서 순서대로 봅니다",
    "",
    "첫 일반 문단은 캐러셀 앞의 도입입니다.",
    "",
    "**첫 사례**",
    "",
    '![첫 시각물](a.png "첫 시각물 보조설명")',
    "",
    "첫 시각물의 자세한 설명입니다.",
    "",
    "**둘째 사례**",
    "",
    '![둘째 시각물](b.png "둘째 시각물 보조설명")',
    "",
    "둘째 시각물의 자세한 설명입니다.",
  ].join("\n");
  const scene = { id: "s1", role: "open", layout: "sequence", fit: "cover", visualCount: 2,
    beats: [{ effect: "enter", targets: [1, 2] }] } as CourseScene;
  const { html } = renderPost(body, {}, {}, { scenes: [scene] });
  assert.equal(html.match(/class="visual-carousel"/g)?.length, 1);
  assert.ok(html.includes('data-carousel-count="2"'));
  assert.ok(html.includes('data-fit="cover"'));
  assert.equal(html.match(/data-carousel-item=/g)?.length, 2);
  assert.ok(html.includes('data-visual="1"'));
  assert.ok(html.includes('data-visual="2"'));
  assert.ok(html.includes("data-carousel-prev"));
  assert.ok(html.includes('data-carousel-for="reading-carousel-1-1"'));
  assert.ok(html.indexOf("data-carousel-for") < html.indexOf('class="visual-carousel"'));
  assert.ok(!html.match(/visual-carousel-frame[\s\S]*?data-carousel-prev/));
  assert.ok(!html.includes("scene-support"));
  assert.ok(html.includes('class="visual-carousel-caption"'));
  assert.ok(html.includes('data-carousel-description="1" data-carousel-description-active="true">첫 시각물 보조설명'));
  assert.ok(html.includes('data-carousel-description="2" hidden aria-hidden="true">둘째 시각물 보조설명'));
  assert.ok(html.indexOf("visual-carousel-frame") < html.indexOf("visual-carousel-caption"));
  assert.ok(!html.includes("<figcaption>첫 시각물 보조설명</figcaption>"));
  assert.ok(html.includes('class="visual-carousel-label"'));
  assert.ok(html.includes('class="visual-carousel-explanation"'));
  assert.ok(html.includes('<p class="lb"><strong>첫 사례</strong></p>'));
  assert.ok(html.includes('<p class="lb"><strong>둘째 사례</strong></p>'));
  assert.ok(html.includes("<p>첫 일반 문단은 캐러셀 앞의 도입입니다.</p>"));
  assert.ok(html.indexOf("첫 일반 문단은 캐러셀 앞의 도입입니다.") < html.indexOf('class="visual-carousel"'));
  assert.ok(html.indexOf("visual-carousel-frame") < html.indexOf("첫 시각물의 자세한 설명입니다."));
  assert.ok(html.includes('data-carousel-description="2" hidden aria-hidden="true"><p>둘째 시각물의 자세한 설명입니다.</p>'));
});

check("시각물이 하나여도 읽기와 강의가 같은 16대9 프레임 구조를 쓴다", () => {
  const { html } = renderPost('## 한 장면\n\n### 한 시각물입니다\n\n보조설명입니다.\n\n![한 장](a.png "한 장의 캡션")');
  assert.ok(html.includes('class="visual-carousel"'));
  assert.ok(html.includes('data-carousel-count="1"'));
  assert.ok(!html.includes("data-carousel-prev"));
  assert.ok(!html.includes("scene-support"));
  assert.ok(html.includes('class="visual-carousel-caption"'));
  assert.ok(html.indexOf("visual-carousel-frame") < html.indexOf("한 장의 캡션"));
});

check("강의 캐러셀 이동 버튼은 영상 위가 아니라 장면 제목 줄에 놓인다", () => {
  const body = '## 두 시각물\n\n설명입니다.\n\n![첫 장](a.png "첫 설명")\n\n![둘째 장](b.png "둘째 설명")';
  const scene = {
    id: "s1", role: "explain", layout: "stage", visualCount: 2,
    beats: [{ effect: "enter", targets: [1, 2] }],
  } as CourseScene;
  const { html, ok } = renderLecture(body, [scene]);
  assert.equal(ok, true);
  assert.ok(html.includes('class="scene-title-row"'));
  assert.ok(html.includes('data-carousel-for="lecture-carousel-1"'));
  assert.ok(html.indexOf("data-carousel-for") < html.indexOf('class="scene-subtitle"'));
  assert.ok(html.indexOf("data-carousel-for") < html.indexOf('class="scene-canvas"'));
});

// 비공개 시각물. KV 의 media/<sha256>.<ext> 를 방 경로로 그리고, 방 밖에서는 자리만 보인다.
const ROOM_KEY = `${"a".repeat(64)}.webp`;
const IN_ROOM = { visual: 0, mediaBase: "/room/x/media" };

check("비공개 시각물은 방 경로로 그린다", () => {
  const html = renderMarkdown(`![장표](room://${ROOM_KEY} "캡션")`, [], {}, { ...IN_ROOM });
  assert.ok(html.includes(`<img src="/room/x/media/${ROOM_KEY}"`));
  assert.ok(html.includes("<figcaption>캡션</figcaption>"));
  assert.ok(!html.includes("room://"));
});

check("읽기와 강의 렌더 모두 방 경로를 받는다", () => {
  const body = ["## 절", "", "### 부제", "", `![장표](room://${ROOM_KEY})`].join("\n");
  const post = renderPost(body, {}, {}, { mediaBase: "/room/y/media" });
  assert.ok(post.html.includes(`/room/y/media/${ROOM_KEY}`));
  const scene: CourseScene = {
    id: "s1",
    role: "open",
    layout: "stage",
    beats: [{ effect: "enter", targets: ["visual.1"], note: "" }],
    visualCount: 1,
  } as CourseScene;
  const lecture = renderLecture(body, [scene], {}, {}, { mediaBase: "/room/y/media" });
  assert.ok(lecture.ok);
  assert.ok(lecture.html.includes(`/room/y/media/${ROOM_KEY}`));
});

check("방 경로가 없으면 비공개 시각물은 자리만 보인다", () => {
  const html = renderMarkdown(`![장표](room://${ROOM_KEY})`);
  assert.ok(html.includes("비공개 시각물"));
  assert.ok(!html.includes("<img"));
});

check("모양이 틀린 비공개 주소는 깨진 그림 대신 오류로 드러난다", () => {
  const html = renderMarkdown("![장표](room://profile.png)", [], {}, { ...IN_ROOM });
  assert.ok(html.includes("주소 오류"));
  assert.ok(!html.includes("<img"));
});

check("비공개 영상은 재생기가 된다", () => {
  const key = `${"b".repeat(64)}.mp4`;
  const html = renderMarkdown(`![시연](room://${key})`, [], {}, { ...IN_ROOM });
  assert.ok(html.includes(`<video src="/room/x/media/${key}"`));
});

// 실습 파일. 표본과 결과 엑셀을 방 안에서 내려받는다 (2026-09-04). 라벨이 저장되는 파일 이름이다.
const FILE_KEY = `${"c".repeat(64)}.xlsx`;
check("실습 파일 링크는 방 경로의 내려받기 링크가 된다", () => {
  const html = renderMarkdown(`표본은 [사업자명단.xlsx](room://${FILE_KEY}) 입니다.`, [], {}, { ...IN_ROOM });
  assert.ok(
    html.includes(`<a class="room-file" href="/room/x/media/${FILE_KEY}" download="사업자명단.xlsx">사업자명단.xlsx</a>`),
  );
  assert.ok(!html.includes("room://"));
  // 내려받기에 새 탭을 붙이면 빈 탭이 남는다
  assert.ok(!html.includes('target="_blank"'));
});

check("라벨이 파일 이름이 아니면 객체 이름으로 저장된다", () => {
  const html = renderMarkdown(`[표본 명단](room://${FILE_KEY})`, [], {}, { ...IN_ROOM });
  assert.ok(html.includes(`download="${FILE_KEY}"`));
});

check("번호 목록 안의 실습 파일 링크도 방 경로를 받는다", () => {
  const html = renderMarkdown(`1. [사업자명단.xlsx](room://${FILE_KEY})를 내려받습니다`, [], {}, { ...IN_ROOM });
  assert.ok(html.startsWith("<ol>"));
  assert.ok(html.includes(`href="/room/x/media/${FILE_KEY}"`));
});

check("방 밖에서는 실습 파일 링크가 이름만 남는다", () => {
  const html = renderMarkdown(`[사업자명단.xlsx](room://${FILE_KEY})`);
  assert.ok(html.includes('<span class="room-file"'));
  assert.ok(!html.includes("room://"));
  assert.ok(!html.includes("<a "));
});

check("모양이 틀린 실습 파일 주소는 링크로 새지 않는다", () => {
  // 캡션이 딸린 주소와 대문자 scheme. 2026-09-04 검증자가 방 안팎 모두에서 room:// 가 새는 것을 잡았다
  for (const body of [`[명단.xlsx](room://${FILE_KEY} "표본")`, `[명단.xlsx](ROOM://${FILE_KEY})`]) {
    for (const state of [{ ...IN_ROOM }, undefined]) {
      const html = renderMarkdown(body, [], {}, state);
      assert.ok(!/room:\/\//i.test(html));
      assert.ok(html.includes("파일 주소 오류"));
      assert.ok(!html.includes("<a "));
    }
  }
});

check("라벨의 확장자는 대소문자를 가리지 않는다", () => {
  const html = renderMarkdown(`[명단.XLSX](room://${FILE_KEY})`, [], {}, { ...IN_ROOM });
  assert.ok(html.includes('download="명단.XLSX"'));
});

check("엑셀 파일은 Worker 가 엑셀 형식으로 내준다", () => {
  assert.ok(ROOM_MEDIA_KEY.test(FILE_KEY));
  assert.equal(mediaContentType(FILE_KEY), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
});

check("완성 코드와 묶음도 실습 파일이다", () => {
  // 순서를 따라가다 실패한 사람도 결과물을 쓸 수 있어야 한다 (2026-09-04 운영자 지시)
  const py = `${"d".repeat(64)}.py`;
  const zip = `${"e".repeat(64)}.zip`;
  const pdf = `${"f".repeat(64)}.pdf`;
  assert.ok(ROOM_MEDIA_KEY.test(py) && ROOM_MEDIA_KEY.test(zip) && ROOM_MEDIA_KEY.test(pdf));
  assert.equal(mediaContentType(zip), "application/zip");
  assert.equal(mediaContentType(pdf), "application/pdf");
  assert.ok(mediaContentType(py).startsWith("text/x-python"));
  const html = renderMarkdown(`[biz-check.zip](room://${zip})`, [], {}, { ...IN_ROOM });
  assert.ok(html.includes(`href="/room/x/media/${zip}" download="biz-check.zip"`));
});

check("비공개 객체 이름과 content-type", () => {
  assert.equal(mediaContentType(ROOM_KEY), "image/webp");
  assert.equal(mediaContentType(`${"b".repeat(64)}.mp4`), "video/mp4");
  assert.ok(ROOM_MEDIA_KEY.test(ROOM_KEY));
  assert.ok(!ROOM_MEDIA_KEY.test("../bundle"));
  assert.ok(!ROOM_MEDIA_KEY.test(`${"a".repeat(64)}.svg`));
});

check("제목과 목록이 제 태그로 나간다", () => {
  const html = renderMarkdown(["## 큰 제목", "", "#### 작은 제목", "", "- 하나", "- 둘"].join("\n"));
  // 목차가 뛰어갈 자리라 h2 에는 번호 앵커가 붙고, 섹션 번호가 앞에 온다
  assert.ok(html.includes('<h2 id="s1">'));
  assert.ok(html.includes('<span class="sn" aria-hidden="true">01</span><span class="section-title">큰 제목</span></h2>'));
  assert.ok(html.includes("<h4>작은 제목</h4>"));
  assert.equal(html.match(/<li>/g)?.length, 2);
});

check("GFM 표를 머리와 본문 셀로 그린다", () => {
  const html = renderMarkdown(
    [
      "| 도구 | 실행 위치 | 지금 고를 때 |",
      "|---|---|---|",
      "| Colab | 원격 컴퓨터 | **공유**할 때 |",
      "| marimo | 내 노트북 | `.py`로 남길 때 |",
    ].join("\n"),
  );
  assert.match(html, /<div[^>]+class="table-wrap"><table>/);
  assert.match(html, /<th scope="col">도구<\/th>/);
  assert.match(html, /<td><strong>공유<\/strong>할 때<\/td>/);
  assert.match(html, /<td><code>\.py<\/code>로 남길 때<\/td>/);
});

check("표는 읽기 본문에 남고 시각물로 세지 않는다", () => {
  // 계약 7. 표는 무대에 오르지 않으므로 data-visual 이 없고 강의 장면의 시각물 수에도 안 든다.
  const body = [
    "## 절",
    "",
    "### 부제",
    "",
    "| 이름 | 역할 |",
    "|---|---|",
    "| 김주현 | 강사 |",
    "",
    "![그림](https://example.com/a.png)",
  ].join("\n");
  const post = renderPost(body);
  assert.match(post.html, /<div class="table-wrap"><table>/);
  assert.doesNotMatch(post.html, /table-wrap"[^>]*data-visual/);
  assert.equal(post.visuals, 1);
  const scene: CourseScene = {
    id: "s1",
    role: "open",
    layout: "stage",
    beats: [{ effect: "enter", targets: [1], note: "" }],
    visualCount: 1,
  } as CourseScene;
  const lecture = renderLecture(body, [scene]);
  assert.ok(lecture.ok);
  assert.ok(lecture.html.includes('data-visual="1"'));
});

check("열 수가 다른 표는 문단으로 안전하게 남긴다", () => {
  const html = renderMarkdown(["| 하나 | 둘 |", "|---|---|", "| 값 |"].join("\n"));
  assert.doesNotMatch(html, /<table>/);
  assert.match(html, /\| 하나 \| 둘 \|/);
});

check("링크와 굵게와 인라인 코드", () => {
  assert.equal(
    inline("[가기](https://a.b)"),
    '<a href="https://a.b" target="_blank" rel="noopener noreferrer">가기</a>',
  );
  assert.equal(inline("**굵게**"), "<strong>굵게</strong>");
  assert.equal(inline("`code`"), "<code>code</code>");
});

/*
 * 새 탭.
 *
 * 2026-09-03 운영자 지시. 강의 중에 본문 링크를 누르면 같은 탭이 넘어가면서 읽던 절과
 * 실행 칸에 친 코드가 사라졌다. 본문이 만드는 링크는 세 자리에서 나오므로 (인라인 링크,
 * 생 주소 문단, 유튜브 캡션) 세 자리를 다 잡는다. 앱 이동은 대상이 아니다.
 */
/*
 * 목록.
 *
 * 2026-09-03 운영자 지시. 열거형은 줄바꿈 목록으로 그리고 설명글은 줄바꿈 없는 서술형으로 쓴다.
 * 번호 목록을 모르던 렌더는 `1. 2. 3.` 을 한 문단으로 이어 붙여 실습 순서를 지웠다.
 */
/*
 * 출처로 이어지는 시각물.
 *
 * 2026-09-03 운영자 지시. 제품 화면은 눌러서 그 제품으로 갈 수 있어야 한다.
 * 그림과 캡션을 같은 주소로 감싸고 새 탭에서 연다.
 */
check("출처 링크가 붙은 시각물은 그림과 캡션이 모두 링크다", () => {
  const html = renderMarkdown('[![코랩 화면](a.webp "Colab 공식 화면")](https://colab.research.google.com/)');
  assert.ok(html.includes('<a class="media-src" href="https://colab.research.google.com/" target="_blank" rel="noopener noreferrer"><img src="a.webp"'));
  assert.ok(html.includes('<figcaption><a href="https://colab.research.google.com/" target="_blank" rel="noopener noreferrer">Colab 공식 화면</a></figcaption>'));
  assert.ok(html.includes('alt="코랩 화면"'));
});

check("출처 링크가 붙어도 시각물 번호를 받는다", () => {
  const html = renderMarkdown('[![화면](a.webp "캡션")](https://example.com/)');
  assert.ok(html.includes('data-visual="1"'));
  assert.ok(!html.includes("<p>"));
});

check("출처 링크가 없는 시각물은 예전 그대로다", () => {
  const html = renderMarkdown('![화면](a.webp "캡션")');
  assert.ok(html.includes('<figcaption>캡션</figcaption>'));
  assert.ok(!html.includes("media-src"));
});

check("번호 목록은 ol 로 그린다", () => {
  const html = renderMarkdown(["1. 화면을 엽니다", "2. Python을 누릅니다", "3. 결과를 확인합니다"].join("\n"));
  assert.equal(
    html,
    "<ol><li>화면을 엽니다</li><li>Python을 누릅니다</li><li>결과를 확인합니다</li></ol>",
  );
});

check("번호 목록 안의 링크와 코드도 살아 있다", () => {
  const html = renderMarkdown(["1. [열기](https://a.b) 를 누릅니다", "2. `Shift+Enter` 를 누릅니다"].join("\n"));
  assert.ok(html.startsWith("<ol>"));
  assert.ok(html.includes('<a href="https://a.b" target="_blank" rel="noopener noreferrer">열기</a>'));
  assert.ok(html.includes("<code>Shift+Enter</code>"));
});

check("불릿 목록은 그대로 ul 이다", () => {
  assert.equal(renderMarkdown(["- 하나", "- 둘"].join("\n")), "<ul><li>하나</li><li>둘</li></ul>");
  assert.equal(renderMarkdown(["* 하나", "* 둘"].join("\n")), "<ul><li>하나</li><li>둘</li></ul>");
});

/**
 * 예전 불릿 처리는 한 줄이라도 `-` 로 시작하면 나머지 줄을 조용히 버렸다.
 * 섞인 문단은 목록이 아니라 문단으로 두고 모든 줄을 남긴다.
 */
check("항목과 설명이 섞인 문단은 줄을 버리지 않는다", () => {
  const html = renderMarkdown(["설명 문장입니다", "- 항목 하나"].join("\n"));
  assert.ok(html.includes("설명 문장입니다"));
  assert.ok(html.includes("항목 하나"));
  assert.ok(!html.includes("<ul>"));
});

check("번호가 하나뿐인 문단도 목록이다", () => {
  assert.equal(renderMarkdown("1. 하나만 있습니다"), "<ol><li>하나만 있습니다</li></ol>");
});

check("본문 인라인 링크는 새 탭에서 연다", () => {
  const html = renderMarkdown("[Colab](https://colab.research.google.com/) 을 엽니다.");
  assert.ok(html.includes('target="_blank"'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
});

check("표 안의 링크도 새 탭에서 연다", () => {
  const html = renderMarkdown("| 도구 | 주소 |\n|---|---|\n| Colab | [열기](https://a.b) |");
  assert.ok(html.includes('<td><a href="https://a.b" target="_blank" rel="noopener noreferrer">열기</a></td>'));
});

check("codaro 가 아닌 생 주소 문단도 새 탭에서 연다", () => {
  const html = renderMarkdown("https://example.com/a");
  assert.equal(
    html,
    '<p><a href="https://example.com/a" target="_blank" rel="noopener noreferrer">https://example.com/a</a></p>',
  );
});

check("유튜브 캡션의 열기 링크도 새 탭이다", () => {
  const html = renderMarkdown("[영상](https://www.youtube.com/watch?v=abcdefghijk)");
  assert.ok(html.includes("YouTube에서 열기"));
  assert.match(html, /<a href="[^"]*youtube[^"]*" target="_blank" rel="noopener noreferrer">YouTube에서 열기<\/a>/);
});

/**
 * term:// 는 브라우저가 열 수 있는 주소가 아니라 applyGlossary 가 걷어 낼 마커다.
 * 여기에 새 탭 속성이 붙으면 그 정규식이 안 맞아 용어가 전부 깨진 링크로 나간다.
 */
check("용어 마커에는 새 탭 속성을 붙이지 않는다", () => {
  assert.equal(inline("[변수](term://변수)"), '<a href="term://변수">변수</a>');
  const html = applyGlossary(inline("[변수](term://변수)"), { 변수: "이름표" }, "term-t");
  assert.ok(html.includes('<span class="term"'));
  assert.ok(!html.includes("term://"));
  assert.ok(!html.includes('target="_blank"'));
});

check("정의가 없는 용어 마커도 새 탭 속성 없이 맨글자로 돌아간다", () => {
  const html = applyGlossary(inline("[없는말](term://없는말)"), {}, "term-t");
  assert.equal(html, "없는말");
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


check("섹션 번호는 두 자리로 이어 붙는다", () => {
  const { html } = renderPost(["## 첫 절", "", "본문", "", "## 둘째 절", "", "본문"].join("\n"));
  assert.ok(html.includes('class="sn" aria-hidden="true">01</span><span class="section-title">첫 절</span>'));
  assert.ok(html.includes('class="sn" aria-hidden="true">02</span><span class="section-title">둘째 절</span>'));
});

check("굵은 글씨 한 줄은 사례 라벨이 된다", () => {
  // 한 섹션에 화면이 여럿일 때 어느 화면 이야기인지 짚는 자리다
  const html = renderMarkdown("**엑셀 세 열이 되는 커피 영수증**");
  assert.ok(html.includes('<p class="lb">'));
  assert.ok(html.includes("<strong>엑셀 세 열이 되는 커피 영수증</strong>"));
});

check("굵은 글씨가 섞인 문단은 라벨이 아니다", () => {
  const html = renderMarkdown("앞말 **굵게** 뒷말");
  assert.ok(html.startsWith("<p>"));
  assert.ok(!html.includes('class="lb"'));
});


check("시작 초는 캡션에도 사람 말로 나온다", () => {
  // 긴 영상은 앞이 인사와 얼굴이라 어디서 시작하는지 미리 알려 줘야 누른다
  const html = renderMarkdown("[상장 자동제작](https://www.youtube.com/watch?v=1pC_UXhiJH8&t=630s)");
  assert.ok(html.includes('<i class="at">10분 30초부터</i>'));
});

check("60초 미만은 분을 붙이지 않는다", () => {
  const html = renderMarkdown("[사례](https://www.youtube.com/watch?v=lfk_T6VKhTE&t=45s)");
  assert.ok(html.includes('<i class="at">45초부터</i>'));
});

check("시작 초가 없으면 캡션에 시각이 없다", () => {
  const html = renderMarkdown("[사례](https://www.youtube.com/watch?v=lfk_T6VKhTE)");
  assert.ok(!html.includes('class="at"'));
});

check("섹션을 닫는 질문에 표시가 붙는다", () => {
  // 설명은 한 문단이라는 작성 규칙을 지키면서 마지막 질문만 감싼다
  const html = renderMarkdown("앞 문장입니다. 그럼 이 일이 내 컴퓨터 안에서만 되는 걸까요?");
  assert.ok(html.includes('<em class="q">그럼 이 일이 내 컴퓨터 안에서만 되는 걸까요?</em>'));
  assert.ok(html.startsWith("<p>앞 문장입니다."));
});

check("문단 전체가 질문이면 감싸지 않는다", () => {
  // 그건 이음말이 아니라 도입 질문이다
  const html = renderMarkdown("업무 자동화란 뭘까요?");
  assert.ok(!html.includes('class="q"'));
});

/*
 * 실행 칸.
 *
 * 2026-08-20 까지 codaro 주소가 생 링크로 나갔다. 003 과 004 가 `값을 바꿔 실행해 보세요`
 * 라고 말하는데 수강생 화면에는 바꿀 칸도 코드도 없었다. 여덟 곳이 그랬고 아무도 몰랐다.
 * 아래가 그 재발을 막는 자리다.
 */
const CELL_URL = "https://eddmpython.com/codaro/run/?example=expense-variables";
const CELLS = {
  "expense-variables": {
    title: "부서와 기준금액 바꾸기",
    description: "값을 바꾼 뒤 실행해 봅니다.",
    code: 'department = "영업팀"\namount = 120000',
    hint: "영업팀을 관리팀으로 바꿔봅니다",
  },
};

check("실행 칸 주소가 링크가 아니라 실행 칸이 된다", () => {
  const html = renderMarkdown(CELL_URL, [], CELLS);
  assert.ok(html.includes('data-cell="expense-variables"'));
  assert.ok(html.includes("data-run"));
  assert.ok(html.includes("data-out"));
  // 생 주소가 화면에 찍히면 안 된다. 그것이 고치기 전의 증상이다.
  assert.ok(!html.includes("<a href"));
  assert.ok(!html.includes("codaro/run"));
});

check("실행 칸에 코드와 설명이 실린다", () => {
  const html = renderMarkdown(CELL_URL, [], CELLS);
  assert.ok(html.includes("부서와 기준금액 바꾸기"));
  assert.ok(html.includes("영업팀"));
  assert.ok(html.includes("amount = 120000"));
  assert.ok(html.includes("영업팀을 관리팀으로 바꿔봅니다"));
});

check("코드가 escape 되어 들어간다", () => {
  const html = renderMarkdown(CELL_URL, [], {
    "expense-variables": { code: 'x = "<script>alert(1)</script>"' },
  });
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
});

check("묶음에 없는 실행 칸은 화면에 드러낸다", () => {
  // 조용히 링크로 흘려보내면 발행한 사람이 못 본다
  const html = renderMarkdown(CELL_URL, [], {});
  assert.ok(html.includes("cell-miss"));
  assert.ok(html.includes("expense-variables"));
  assert.ok(!html.includes("<a href"));
});

check("셀을 안 주면 옛 판처럼 링크로 남지 않고 드러난다", () => {
  // schema 2 묶음이 남아 있을 때도 강의장이 죽지 않아야 한다
  const html = renderMarkdown(CELL_URL);
  assert.ok(html.includes("cell-miss"));
});

check("renderPost 가 실행 칸 유무를 알려 준다", () => {
  const withCell = renderPost(CELL_URL, CELLS);
  assert.equal(withCell.hasCells, true);
  const without = renderPost("## 제목\n\n본문입니다.");
  assert.equal(without.hasCells, false);
});

check("실행 칸이 여러 개면 각각 자기 이름을 갖는다", () => {
  const body = [
    CELL_URL,
    "",
    "https://eddmpython.com/codaro/run/?example=expense-loop",
  ].join("\n");
  const html = renderMarkdown(body, [], {
    ...CELLS,
    "expense-loop": { code: "for a in [1,2]:\n    print(a)" },
  });
  assert.ok(html.includes('data-cell="expense-variables"'));
  assert.ok(html.includes('data-cell="expense-loop"'));
  assert.equal(html.match(/data-cell=/g)?.length, 2);
});

check("codaro 가 아닌 주소는 그대로 링크다", () => {
  const html = renderMarkdown("https://example.com/a");
  assert.ok(html.includes('<a href="https://example.com/a"'));
});

/*
 * 캡션.
 *
 * 2026-08-21 까지 정규식은 캡션을 잡아 놓고 렌더러가 버렸다. 교안 캡션 45개가 수강생
 * 화면에 하나도 안 나갔다. 아래가 그 재발을 막는 자리다.
 */
check("이미지 캡션이 figcaption 으로 나간다", () => {
  const html = renderMarkdown('![그림 설명](https://a.b/c.png "이렇게 읽습니다")');
  assert.ok(html.includes("<figcaption>이렇게 읽습니다</figcaption>"));
  assert.ok(html.includes('alt="그림 설명"'));
});

check("캡션 없는 이미지는 figcaption 을 만들지 않는다", () => {
  const html = renderMarkdown("![그림](https://a.b/c.png)");
  assert.ok(!html.includes("<figcaption"));
});

check("교안 캐러셀의 시각물마다 프레임 아래 캡션이 붙는다", () => {
  const { html } = renderPost([
    "## 캡션 장면",
    "",
    "### 두 시각물을 확인합니다",
    "",
    "보조설명입니다.",
    "",
    '![a](https://a.b/1.png "첫째")',
    "",
    '![b](https://a.b/2.png "둘째")',
  ].join("\n"));
  assert.equal(html.match(/data-carousel-description=/g)?.length, 2);
  assert.ok(!html.includes("<figcaption>"));
  assert.ok(html.indexOf("visual-carousel-frame") < html.indexOf("visual-carousel-caption"));
  assert.ok(html.includes("첫째") && html.includes("둘째"));
  assert.equal(html.match(/class="visual-carousel"/g)?.length, 1);
  assert.ok(html.includes('data-visual="1"'));
  assert.ok(html.includes('data-visual="2"'));
});

check("영상 캡션도 나간다", () => {
  const html = renderMarkdown('![영상](https://a.b/c.mp4 "움직임을 보세요")');
  assert.ok(html.includes("<video"));
  assert.ok(html.includes("<figcaption>움직임을 보세요</figcaption>"));
});

check("캡션의 HTML 은 escape 된다", () => {
  const html = renderMarkdown('![a](https://a.b/c.png "<b>굵게</b>")');
  assert.ok(!html.includes("<b>굵게</b>"));
  assert.ok(html.includes("&lt;b&gt;"));
});

check("course-embed는 격리된 https iframe 시각물이 된다", () => {
  const html = renderMarkdown(
    ["```course-embed", "src: https://example.com/demo", "title: 지출 판정 시뮬레이션", "ratio: 16/9", "```"].join("\n"),
  );
  assert.ok(html.includes('class="course-embed"'));
  assert.ok(html.includes('sandbox="allow-scripts allow-forms"'));
  assert.ok(html.includes('data-visual="1"'));
  assert.ok(html.includes('title="지출 판정 시뮬레이션"'));
});

check("코드 펜스 안의 H2는 강의 장면을 나누지 않는다", () => {
  const sections = splitCourseSections(
    ["## 첫 장면", "", "### 첫 부제", "", "```text", "## 코드 안 제목", "```", "", "## 둘째 장면", "", "### 둘째 부제", "", "본문"].join("\n"),
  );
  assert.equal(sections.length, 2);
  assert.equal(sections[0].title, "첫 장면");
  assert.equal(sections[1].subtitle, "둘째 부제");
});

check("읽기 본문 하나를 장면과 비트 계약으로 투영한다", () => {
  const body = [
    "## 첫 장면",
    "",
    "### 그림을 먼저 보여 줍니다",
    "",
    "설명은 읽기 모드 본문입니다. 강의 화면에는 나오지 않습니다.",
    "",
    '![첫 그림](https://example.com/a.svg "첫 그림이 보여 주는 핵심입니다")',
    "",
    "## 결과 확인",
    "",
    "### 코드 결과를 확인합니다",
    "",
    // 계약 12 부터 무대는 이미지, 영상, 시뮬레이션이 맡는다. 코드는 읽기 본문의 설명 자료다.
    "![결과 화면](https://example.com/b.svg)",
    "",
    "```text",
    "결과 1",
    "```",
  ].join("\n");
  const scenes: CourseScene[] = [
    { id: "s1", role: "open", layout: "stage", fit: "cover-top", visualCount: 1, beats: [{ effect: "enter", targets: [1] }] },
    { id: "s2", role: "close", layout: "code", visualCount: 1, beats: [
      { effect: "enter", targets: [1] },
      { effect: "annotate", targets: [1], note: "결과를 확인합니다" },
    ] },
  ];
  const lecture = renderLecture(body, scenes);
  assert.equal(lecture.ok, true);
  // 강의 셸은 H2 하나를 장표 하나로 만들고 모든 시각물을 같은 캐러셀에 둔다. 12 는 코드 펜스를
  // 시각물에서 뺀 판이고, 무대에는 이미지와 영상과 시뮬레이션만 오른다.
  assert.equal(COURSE_SCENE_RUNTIME, 12);
  assert.equal(lecture.html.match(/class="lecture-scene"/g)?.length, 2);
  assert.ok(lecture.html.includes('data-layout="stage"'));
  assert.ok(lecture.html.includes('data-fit="cover-top"'));
  assert.ok(lecture.html.includes('data-fit="contain"'));
  assert.ok(lecture.html.includes(`data-scene-runtime="${COURSE_SCENE_RUNTIME}"`));
  assert.ok(lecture.html.includes("data-timeline="));
  assert.ok(!lecture.html.includes("data-beats="));
  assert.ok(!lecture.html.includes("effect&quot;:&quot;annotate"));
  assert.ok(lecture.html.includes("data-scene-cue"));
  assert.equal(lecture.html.match(/aria-roledescription="슬라이드"/g)?.length, 2);
  assert.equal(lecture.html.match(/aria-hidden="true" inert/g)?.length, 2);
  assert.ok(lecture.html.includes('aria-labelledby="lecture-s1-title"'));
  assert.ok(lecture.html.includes('id="lecture-s1-title" tabindex="-1"'));
  assert.ok(lecture.html.includes("설명은 읽기 모드 본문입니다."));
  assert.ok(lecture.html.includes("결과를 확인합니다"));
  assert.equal(lecture.html.match(/class="scene-support"/g)?.length, 1);
  assert.ok(lecture.html.includes('<p data-carousel-description="1" data-carousel-description-active="true">첫 그림이 보여 주는 핵심입니다</p>'));
  assert.ok(!lecture.html.includes('<div class="scene-support"><p>설명은 읽기 모드 본문입니다.'));
  assert.equal(lecture.html.match(/class="visual-carousel"/g)?.length, 2);
  assert.ok(!lecture.html.includes("data-scene-visual-note"));
  assert.ok(!lecture.html.includes("data-scene-callout"));
});

check("계약 6 의 다중 대상 enter 와 compare를 단일 시각자료 프레임으로 펼친다", () => {
  const frames = compileSceneTimeline({
    id: "s1",
    role: "open",
    layout: "stage",
    visualCount: 3,
    beats: [
      { effect: "enter", targets: [1, 2] },
      { effect: "annotate", targets: [2], note: "짝지어 올린 화면입니다" },
      { effect: "replace", targets: [3] },
    ],
  });
  assert.deepEqual(frames[0].visible, [1]);
  assert.deepEqual(frames[1].visible, [2]);
  assert.deepEqual([frames[0].sequenceIndex, frames[0].sequenceTotal], [1, 2]);
  assert.deepEqual([frames[1].sequenceIndex, frames[1].sequenceTotal], [2, 2]);
  assert.equal(frames[2].annotation, "짝지어 올린 화면입니다");
  assert.deepEqual(frames[3].visible, [3]);

  const opened = compileSceneTimeline({
    id: "s2",
    role: "explain",
    layout: "compare",
    visualCount: 2,
    beats: [{ effect: "compare", targets: [1, 2] }],
  });
  assert.deepEqual(opened.map((frame) => frame.visible), [[1], [2]]);
  assert.deepEqual(opened.map((frame) => frame.compare), [[1], [2]]);
});

check("계약 4 의 판단 문장은 아무 beat 의 note 로 실려 그 화면과 함께 나온다", () => {
  const frames = compileSceneTimeline({
    id: "s1",
    role: "open",
    layout: "stage",
    visualCount: 2,
    beats: [
      { effect: "enter", targets: [1], note: "개막과 함께 보이는 판단" },
      { effect: "run", targets: [1], note: "실행과 함께 보이는 판단" },
      { effect: "replace", targets: [2] },
    ],
  });
  assert.equal(frames[0].annotation, "개막과 함께 보이는 판단");
  assert.equal(frames[1].annotation, "실행과 함께 보이는 판단");
  // 화면을 바꾸는 beat 는 이전 판단 문장을 지운다
  assert.equal(frames[2].annotation, "");
});

check("compose 는 pair 와 lead의 두 대상을 같은 장표의 캐러셀로 보존한다", () => {
  const frames = compileSceneTimeline({
    id: "s1",
    role: "open",
    layout: "lead",
    visualCount: 2,
    beats: [
      { effect: "compose", targets: [1, 2], note: "주자료와 근거를 함께 읽습니다" },
      { effect: "focus", targets: [2] },
    ],
  });
  assert.deepEqual(frames[0].visible, [1]);
  assert.deepEqual(frames[0].composition, [1]);
  assert.deepEqual(frames[0].compare, []);
  assert.equal(frames[0].cue, "함께 보기");
  assert.deepEqual(frames[1].visible, [2]);
  assert.deepEqual(frames[1].composition, [2]);
  assert.deepEqual(frames[2].focus, [2]);

  const lecture = renderLecture(
    "## 조합 장면\n\n### 구조와 근거를 함께 읽습니다\n\n본문 설명은 읽기 모드에 남습니다.\n\n![구조도](https://example.com/a.png \"첫 구조 설명\")\n\n![실행 화면](https://example.com/b.png \"둘째 실행 설명\")",
    [{ id: "s1", role: "open", layout: "lead", visualCount: 2, beats: [{ effect: "compose", targets: [1, 2] }] }],
  );
  assert.equal(lecture.ok, true);
  assert.ok(lecture.html.includes('data-layout="lead"'));
  assert.ok(lecture.html.includes("composition"));
  assert.equal(lecture.html.match(/data-carousel-description=/g)?.length, 2);
  assert.ok(lecture.html.includes('data-carousel-description="1" data-carousel-description-active="true">첫 구조 설명'));
  assert.ok(lecture.html.includes('data-carousel-description="2" hidden aria-hidden="true">둘째 실행 설명'));
  assert.ok(!lecture.html.includes('<div class="scene-support"><p>본문 설명은 읽기 모드에 남습니다.'));
});

check("효과를 클릭별 완성 프레임으로 한 번만 계산한다", () => {
  const frames = compileSceneTimeline({
    id: "s1",
    role: "open",
    layout: "sequence",
    visualCount: 3,
    beats: [
      { effect: "enter", targets: [1] },
      { effect: "enter", targets: [2] },
      { effect: "focus", targets: [2] },
      { effect: "annotate", targets: [2], note: "둘째 화면을 읽습니다" },
      { effect: "replace", targets: [3] },
      { effect: "run", targets: [3] },
    ],
  });
  assert.deepEqual(frames[1].visible, [2]);
  assert.deepEqual(frames[2].focus, [2]);
  assert.equal(frames[3].annotation, "둘째 화면을 읽습니다");
  assert.deepEqual(frames[3].focus, []);
  assert.deepEqual(frames[4].visible, [3]);
  assert.deepEqual(frames[4].focus, []);
  assert.equal(frames[4].annotation, "");
  assert.deepEqual(frames[5].interaction, [3]);
  assert.equal(frames[5].cue, "실행");
});

check("본문 시각물 수와 계약이 다르면 강의 모드를 만들지 않는다", () => {
  const lecture = renderLecture(
    "## 첫 장면\n\n### 부제입니다\n\n![그림](https://example.com/a.png)",
    [{ id: "s1", role: "open", layout: "stage", visualCount: 2, beats: [{ effect: "enter", targets: [1] }] }],
  );
  assert.equal(lecture.ok, false);
  assert.equal(lecture.html, "");
});

/*
 * 용어 툴팁.
 *
 * 묶음은 glossary 데이터만 싣고, 본문의 어느 자리를 감싸는지는 렌더러의
 * markGlossaryTerms 가 정한다. 발행 시점에 마커를 심으면 그 마커를 모르는 배포본이
 * 깨진 링크를 그리고 교안 발행이 강의장 배포 순서에 묶이기 때문이다. 여기서 지키는
 * 것은 셋이다. 산문의 용어만 감쌀 것, 감싼 자리가 정의를 단 툴팁이 될 것, 정의를 못
 * 찾은 마커가 눌리면 깨지는 term:// 링크로 남지 않을 것.
 */
const GLOSSARY = { 변수: "값에 이름을 붙여 담아 두는 자리입니다." };

check("산문의 용어가 자동으로 툴팁이 된다. 조사는 밖에 남는다", () => {
  const { html } = renderPost("여기서 변수를 만듭니다.", {}, GLOSSARY);
  assert.ok(html.includes('<span class="term"'));
  assert.ok(html.includes("변수<span class=\"term-pop\""));
  assert.ok(html.includes("</span>를 만듭니다."));
  assert.ok(!html.includes("term://"));
});

check("앞에 글자가 붙은 합성어는 감싸지 않는다", () => {
  const { html } = renderPost("종속변수라는 말이 있습니다.", {}, GLOSSARY);
  assert.ok(!html.includes('class="term"'));
});

check("글마다 용어당 한 번만 감싼다", () => {
  const { html } = renderPost(
    "## 첫 절\n\n변수가 있습니다. 변수를 또 씁니다.\n\n## 둘째 절\n\n변수가 다시 나옵니다.",
    {},
    GLOSSARY,
  );
  assert.equal(html.match(/class="term"/g)?.length, 1);
});

check("코드와 제목과 인라인 코드의 용어는 감싸지 않는다", () => {
  const { html } = renderPost(
    "## 변수 소개\n\n```python\n변수 = 1\n```\n\n`변수`는 코드입니다.",
    {},
    GLOSSARY,
  );
  assert.ok(!html.includes('class="term"'));
});

check("긴 용어가 먼저 잡힌다", () => {
  const { html } = renderPost("가상 환경을 만듭니다.", {}, {
    "가상 환경": "설치 자리를 나눈 것입니다.",
    환경: "코드가 실행되는 자리입니다.",
  });
  assert.ok(html.includes('term-pop" id="term-r-1" role="tooltip">설치 자리를 나눈 것입니다.'));
  assert.equal(html.match(/class="term"/g)?.length, 1);
});

check("용어집이 비면 본문은 그대로다", () => {
  const plain = renderPost("여기서 변수를 만듭니다.");
  assert.ok(plain.html.includes("<p>여기서 변수를 만듭니다.</p>"));
});

check("용어 마커가 정의를 단 툴팁이 된다", () => {
  const { html } = renderPost("[변수](term://변수)를 만듭니다.", {}, GLOSSARY);
  assert.ok(html.includes('<span class="term" tabindex="0" aria-describedby="term-r-1">변수'));
  assert.ok(html.includes('<span class="term-pop" id="term-r-1" role="tooltip">값에 이름을 붙여 담아 두는 자리입니다.</span>'));
  assert.ok(!html.includes("term://"));
  // 조사는 툴팁 밖에 남는다
  assert.ok(html.includes("</span>를 만듭니다."));
});

check("정의가 없는 마커는 맨글자로 되돌린다", () => {
  // term:// 는 브라우저가 못 여는 주소다. 링크로 남기면 누르는 순간 깨진다
  const { html } = renderPost("[변수](term://변수)를 만듭니다.", {}, {});
  assert.ok(!html.includes("<a"));
  assert.ok(!html.includes("term://"));
  assert.ok(html.includes("<p>변수를 만듭니다.</p>"));
});

check("정의의 꺾쇠는 escape 되어 나간다", () => {
  const html = applyGlossary(
    inline("[변수](term://변수)"),
    { 변수: '<b>진하게</b> "따옴표"' },
    "term-r",
  );
  assert.ok(!html.includes("<b>"));
  assert.ok(html.includes("&lt;b&gt;"));
  assert.ok(html.includes("&quot;따옴표&quot;"));
});

check("굵게 안의 용어 마커도 툴팁이 된다", () => {
  const { html } = renderPost("**[변수](term://변수)**가 핵심입니다.", {}, GLOSSARY);
  assert.ok(html.includes('<strong><span class="term"'));
});

check("강의 장면의 용어는 읽기 화면과 다른 id 를 받는다", () => {
  // 같은 페이지에 읽기 본문과 강의 장면이 함께 있다. id 가 겹치면 aria 연결이 깨진다
  const body = [
    "## 첫 장면",
    "",
    "### 부제입니다",
    "",
    "[변수](term://변수)를 만듭니다.",
    "",
    "![그림](https://example.com/a.png)",
  ].join("\n");
  const scenes: CourseScene[] = [
    { id: "s1", role: "open", layout: "stage", visualCount: 1, beats: [{ effect: "enter", targets: [1] }] },
  ];
  const read = renderPost(body, {}, GLOSSARY);
  const lecture = renderLecture(body, scenes, {}, GLOSSARY);
  assert.equal(lecture.ok, true);
  assert.ok(read.html.includes('id="term-r-1"'));
  assert.ok(lecture.html.includes('id="term-l-1"'));
  assert.ok(!lecture.html.includes('id="term-r-1"'));
});

check("용어가 여럿이면 id 가 이어 붙는다", () => {
  const { html } = renderPost(
    "[변수](term://변수)와 [함수](term://함수)를 봅니다.",
    {},
    { ...GLOSSARY, 함수: "코드 여러 줄에 붙인 이름입니다." },
  );
  assert.ok(html.includes('id="term-r-1"'));
  assert.ok(html.includes('id="term-r-2"'));
});

/*
 * 실행 칸은 시각물이 아니다 (계약 10, 2026-09-03 운영자 지시).
 *
 * 절은 제목, 부제, 시각물, 설명, 그다음 코드 실습이다. 읽기 모드에서는 codaro 셀처럼 본문
 * 흐름에 놓고 내용만큼 자라며, 강의 무대에는 시각물만 오르고 실행 칸은 올리지 않는다.
 */
check("읽기 모드는 실행 칸을 16대9 캐러셀에 넣지 않고 본문 흐름의 셀로 둔다", () => {
  const body = [
    "## 실습 장면",
    "",
    "### 값을 바꿔 실행합니다",
    "",
    "실행 전 설명입니다.",
    "",
    CELL_URL,
    "",
    "실행 뒤 설명입니다.",
  ].join("\n");
  const { html, visuals } = renderPost(body, CELLS, {}, { scenes: [] });
  assert.ok(!html.includes("visual-carousel"));
  assert.ok(!html.includes("data-carousel-item"));
  // 실행 칸은 시각물 번호를 받지 않는다
  assert.equal(visuals, 0);
  assert.ok(html.includes('<section class="cell" data-cell="expense-variables"'));
  assert.ok(html.indexOf("<p>실행 전 설명입니다.</p>") < html.indexOf('data-cell="expense-variables"'));
  assert.ok(html.indexOf('data-cell="expense-variables"') < html.indexOf("<p>실행 뒤 설명입니다.</p>"));
});

check("같은 H2의 이미지는 캐러셀에 남고 실행 칸은 라벨과 설명을 데리고 제자리에 남는다", () => {
  const body = [
    "## 섞인 장면",
    "",
    "### 화면을 본 뒤 직접 실행합니다",
    "",
    "**먼저 화면**",
    "",
    '![화면](https://a.b/1.png "화면 캡션")',
    "",
    "화면 설명입니다.",
    "",
    "**직접 실행**",
    "",
    CELL_URL,
    "",
    "실행 설명입니다.",
    "",
    "**결과 화면**",
    "",
    '![결과](https://a.b/2.png "결과 캡션")',
    "",
    "결과 설명입니다.",
  ].join("\n");
  const scene = { id: "s1", role: "explain", layout: "sequence", visualCount: 2,
    beats: [{ effect: "enter", targets: [1] }, { effect: "replace", targets: [2] }] } as CourseScene;
  const { html, visuals } = renderPost(body, CELLS, {}, { scenes: [scene] });
  assert.equal(visuals, 2);
  // 실행 칸 앞뒤의 이미지는 각각 한 장짜리 캐러셀이 된다. 실행 칸을 건너뛰어 하나로 합치면 읽는 순서가 깨진다.
  assert.equal(html.match(/class="visual-carousel"/g)?.length, 2);
  assert.equal(html.match(/data-carousel-count="1"/g)?.length, 2);
  assert.ok(!html.includes('data-carousel-item="2"'));
  const cellAt = html.indexOf('data-cell="expense-variables"');
  assert.ok(html.indexOf("화면 설명입니다.") < html.indexOf('<p class="lb"><strong>직접 실행</strong></p>'));
  assert.ok(html.indexOf('<p class="lb"><strong>직접 실행</strong></p>') < cellAt);
  assert.ok(cellAt < html.indexOf("<p>실행 설명입니다.</p>"));
  assert.ok(html.indexOf("<p>실행 설명입니다.</p>") < html.indexOf("결과 캡션"));
  assert.ok(html.indexOf("결과 캡션") < html.indexOf("결과 설명입니다."));
});

check("강의 모드는 실행 칸을 무대에 올리지 않고 시각물만 센다", () => {
  const body = [
    "## 실습 장면",
    "",
    "### 그림을 보고 직접 실행합니다",
    "",
    '![그림](https://a.b/1.png "그림 캡션")',
    "",
    "설명 문단입니다.",
    "",
    CELL_URL,
    "",
    "실행 뒤 설명입니다.",
  ].join("\n");
  const scene = { id: "s1", role: "explain", layout: "stage", visualCount: 1,
    beats: [{ effect: "enter", targets: [1] }] } as CourseScene;
  const lecture = renderLecture(body, [scene], CELLS);
  assert.equal(lecture.ok, true);
  assert.equal(lecture.hasCells, false);
  assert.ok(!lecture.html.includes("data-cell="));
  assert.ok(!lecture.html.includes("expense-variables"));
  assert.equal(lecture.html.match(/data-carousel-item=/g)?.length, 1);
  // 실행 칸을 시각물로 세던 옛 묶음은 수가 어긋나 강의 모드가 닫힌다
  const stale = renderLecture(body, [{ ...scene, visualCount: 2 }], CELLS);
  assert.equal(stale.ok, false);
});

check("라벨 없이 이어진 시각물의 설명은 항목별 띠가 아니라 캐러셀 아래 본문에 남는다", () => {
  const body = [
    "## 그림 두 장",
    "",
    "### 두 그림을 본 뒤 설명을 읽습니다",
    "",
    '![첫 그림](https://a.b/1.png "첫 캡션")',
    "",
    '![둘째 그림](https://a.b/2.png "둘째 캡션")',
    "",
    "두 그림에 함께 붙는 설명입니다.",
    "",
    "실무 설명입니다.",
  ].join("\n");
  const { html } = renderPost(body);
  assert.equal(html.match(/class="visual-carousel"/g)?.length, 1);
  assert.ok(html.includes('data-carousel-count="2"'));
  assert.ok(html.includes('class="visual-carousel-caption"'));
  assert.ok(!html.includes('class="visual-carousel-explanation"'));
  assert.ok(html.indexOf("visual-carousel-caption") < html.indexOf("<p>두 그림에 함께 붙는 설명입니다.</p>"));
  assert.ok(html.indexOf("<p>두 그림에 함께 붙는 설명입니다.</p>") < html.indexOf("<p>실무 설명입니다.</p>"));
  assert.ok(!html.includes("<p>두 그림에 함께 붙는 설명입니다.</p></div>"));
});

check("실행 칸은 실행 전에 상태 글자와 자리 표시 출력을 두지 않는다", () => {
  const html = renderMarkdown(CELL_URL, [], CELLS);
  assert.ok(!html.includes("실행 준비됨"));
  assert.ok(!html.includes("실행을 누르면"));
  assert.ok(html.includes('<div class="cell-out" data-output hidden>'));
  assert.ok(html.includes('<button type="button" class="cell-reset" data-reset hidden>처음으로</button>'));
  assert.ok(html.includes('<button type="button" class="cell-run" data-run>'));
  // 첫 높이는 줄 수와 같다. 스크립트가 맞춘 높이와 같아야 열릴 때 출렁이지 않는다.
  assert.ok(html.includes('rows="2"'));
  assert.ok(html.includes('aria-label="부서와 기준금액 바꾸기 실습"'));
});

check("제목이 없거나 비어 있는 실행 칸은 실습이라는 이름 하나만 쓴다", () => {
  for (const cell of [{ code: "x = 1" }, { title: "  ", code: "x = 1" }]) {
    const html = renderMarkdown(CELL_URL, [], { "expense-variables": cell });
    assert.ok(html.includes('aria-label="실습"'));
    assert.ok(html.includes('<span class="cell-t">실습</span>'));
    assert.ok(!html.includes("실습 실습"));
  }
});

console.log(`classroom render: 코드 분할과 escape 등 ${count} cases`);
