/**
 * 강의방. 수강생이 보는 화면 전부다.
 *
 * 운영은 여기 없다. 방을 만들고 지우고 비밀번호를 걸고 카테고리를 여는 일은 운영장
 * `admin.ts` 가 한다. 강의방은 그 결과를 받아 그리기만 한다. 한때 이 파일이 운영 API 까지
 * 들고 있었는데, 그러면 운영장이 강의방의 부속이 된다. 강의방은 운영장이 만드는 여럿 중
 * 하나다.
 *
 * 설계 근거는 ../eddmpython-course/memory/architecture/courseRoom.md 다. 원칙 셋이다.
 *
 * 1. 방은 실행 중에 생기고 운영자가 입장을 열면 /room/<이름> 주소로 들어간다. 배포가 필요 없다
 * 2. 비밀번호는 방을 만들 때 그 자리에서 건다. 배포 비밀값이 아니라 방의 상태다
 * 3. 닫힌 카테고리의 본문은 아예 안 내려간다. 가리는 것이 아니라 안 주는 것이다
 *
 * 3번이 이 파일이 존재하는 이유다. 클라이언트에서 거르면 개발자 도구로 앞 내용을 먼저 본다.
 */
import {
  COURSE_SCENE_RUNTIME,
  esc,
  renderLecture,
  renderPost,
} from "./classroom-render";
import { SYMBOL, symbolMarkup } from "./src/brand";
import { DESIGN } from "./src/design";
import { checkToken, cookie, issueToken, hmac, readCookie } from "./auth";
import { call, validSlug, type PublicRoom } from "./rooms";
import { course, courseVersion, type CourseCategory } from "./course";
import { header, page, themeToggle } from "./shell";
import type { Env } from "./env";




/* 화면 ------------------------------------------------------------------ */

// 디자인 값은 여기서 만들지 않는다. src/design.ts 의 DESIGN이 정본이고 그것이 변수를 깐다.
// scripts/check-brand.mjs 가 이 파일에 hex 가 다시 나타나면 막는다.
/**
 * 강의방 화면 CSS.
 *
 * 공용 부분은 shell.ts 의 SHELL_STYLE 이 이미 깔았다. 여기에는 글 화면, 카테고리 목록,
 * 실행 칸, 강의 모드처럼 강의방에서만 쓰는 것만 둔다.
 */
const CLASSROOM_STYLE = `
/* 글 화면. 왼쪽 과정 이동, 가운데 본문, 오른쪽 목차 */
.lay { display:grid; grid-template-columns:15rem minmax(0,1fr) 15rem; gap:3rem; align-items:start; }
.side, .toc { position:sticky; top:2rem; max-height:calc(100vh - 4rem); overflow-y:auto;
  font-size:.85rem; scrollbar-width:thin; }
.side-h, .toc-h { margin:1.25rem 0 .6rem; font-size:.72rem; letter-spacing:.12em;
  text-transform:uppercase; color:var(--eddm-text-dim); }
.nav-post { display:flex; gap:.6rem; padding:.5rem .6rem; border-radius:.45rem;
  color:var(--eddm-text-muted); text-decoration:none; line-height:1.5; }
.nav-post b { color:var(--eddm-text-faint); font-weight:500; font-variant-numeric:tabular-nums; }
.nav-post:hover { background:var(--eddm-raise); color:var(--eddm-ivory); }
.nav-post.on { background:var(--eddm-accent-bg); color:var(--eddm-accent); }
.nav-post.on b { color:var(--eddm-accent-dim); }
.toc-h { display:flex; align-items:baseline; justify-content:space-between; gap:.5rem;
  list-style:none; cursor:default; }
.toc-h::-webkit-details-marker { display:none; }
.toc-at { letter-spacing:0; font-variant-numeric:tabular-nums; }
.toc a { display:flex; gap:.55rem; padding:.4rem .7rem; border-left:2px solid var(--eddm-line);
  color:var(--eddm-text-muted); text-decoration:none; line-height:1.5; }
.toc a b { flex:0 0 auto; font-weight:500; opacity:.55; font-variant-numeric:tabular-nums; }
.toc a:hover { color:var(--eddm-ivory); border-left-color:var(--eddm-line-strong); }
.toc a.on { color:var(--eddm-accent); border-left-color:var(--eddm-accent); }
/* 읽은 만큼 차는 띠. 글이 길어서 어디쯤인지 감이 없으면 지친다. */
.prog { position:fixed; top:0; left:0; right:0; height:2px; z-index:20; pointer-events:none; }
.prog i { display:block; height:100%; width:0; background:var(--eddm-accent); opacity:.55;
  transition:width .1s linear; }
/* 섹션을 닫는 질문. 본문에 묻히지 않게 한 단 밝게 둔다. */
article .q { font-style:normal; color:var(--eddm-ivory); }
.body h1 { margin:0 0 .7rem; font-size:1.75rem; letter-spacing:-.02em; line-height:1.3; }
.body .sub { margin:0 0 2.5rem; color:var(--eddm-text-muted); line-height:1.7; }
.body-top { display:flex; align-items:flex-start; justify-content:space-between; gap:1.5rem; }
.body-title { min-width:0; }
.lecture-open { flex:0 0 auto; display:inline-flex; align-items:center; gap:.5rem; margin-top:.15rem;
  padding:.55rem .8rem; border:1px solid var(--eddm-accent-line); border-radius:.6rem;
  background:var(--eddm-accent-bg); color:var(--eddm-accent); font-size:.82rem; font-weight:500; }
.lecture-open svg { width:16px; height:16px; }
.lecture-open:hover { border-color:var(--eddm-accent); }
@media (max-width:640px) {
  .body-top { display:block; }
  .lecture-open { margin:0 0 1.5rem; }
}

/* 이전 다음 */
.pager { display:flex; gap:1rem; margin-top:4rem; padding-top:2rem; border-top:1px solid var(--eddm-line); }
.pager a { flex:1; padding:1rem 1.1rem; border:1px solid var(--eddm-line-base); border-radius:.7rem;
  text-decoration:none; color:inherit; display:block; }
.pager a:hover { border-color:var(--eddm-accent-line); }
.pager .nx { text-align:right; }
.pager span { display:block; font-size:.72rem; letter-spacing:.1em; text-transform:uppercase;
  color:var(--eddm-accent); margin-bottom:.35rem; }
.pager b { font-weight:400; font-size:.9rem; color:var(--eddm-text); line-height:1.5; }
.pager i { flex:1; }

@media (max-width:1100px) {
  .lay { grid-template-columns:minmax(0,1fr); gap:2rem; }
  .side, .toc { position:static; max-height:none; }
  .toc { order:-1; border:1px solid var(--eddm-line); border-radius:.7rem; padding:.5rem 1rem; }
  .toc[open] { padding-bottom:1rem; }
  .toc-h { cursor:pointer; padding:.5rem 0; }
  .toc-h::after { content:"펼치기"; font-size:.7rem; color:var(--eddm-accent); letter-spacing:0; }
  .toc[open] .toc-h::after { content:"접기"; }
  .side { display:flex; flex-wrap:wrap; gap:.4rem; align-items:center; }
  .side .side-h { width:100%; margin:.5rem 0 0; }
}

.cat { border:1px solid var(--eddm-line-base); border-radius:.85rem; padding:1.4rem 1.5rem 1.1rem; margin:0 0 1rem; }
.cat-h { display:flex; align-items:baseline; gap:.75rem; }
.cat-n { font-size:.78rem; font-weight:500; color:var(--eddm-accent-dim); font-variant-numeric:tabular-nums; }
.cat h2 { margin:0; font-size:1.1rem; font-weight:500; letter-spacing:-.01em; flex-grow:1; }
.state { flex:0 0 auto; font-size:.7rem; letter-spacing:.06em; padding:.15rem .6rem; border-radius:99px; }
.state.on { background:var(--eddm-accent-bg); color:var(--eddm-accent); }
/* 이 카테고리를 덮으면 무엇이 되는지. 왜 듣는지가 목록에서 보여야 한다. */
.goal { margin:.5rem 0 1rem 2.1rem; font-size:.87rem; color:var(--eddm-text-muted); line-height:1.7; }
/* 잠긴 카테고리. 가리지 않고 이름만 보여 준다. 본문은 여전히 안 내려간다. */
.later { border:1px solid var(--eddm-line); border-radius:.85rem; padding:1.1rem 1.5rem; opacity:.6; }
.later-h { margin:0 0 .7rem; font-size:.7rem; letter-spacing:.12em; text-transform:uppercase; color:var(--eddm-text-faint); }
.later-row { display:flex; justify-content:space-between; gap:1rem; padding:.4rem 0; font-size:.92rem; color:var(--eddm-text-muted); }
.tag { font-size:.72rem; letter-spacing:.08em; text-transform:uppercase; color:var(--eddm-accent); }
a.post { display:flex; gap:.9rem; align-items:baseline; margin-left:2.1rem; padding:.65rem 0;
  border-top:1px solid var(--eddm-line); color:inherit; text-decoration:none; line-height:1.6; }
a.post b { flex:0 0 auto; font-weight:500; font-size:.78rem; color:var(--eddm-text-faint);
  font-variant-numeric:tabular-nums; }
a.post:hover { color:var(--eddm-accent); }
a.post:hover b { color:var(--eddm-accent-dim); }
.wait { color:var(--eddm-text-dim); }
article img, article video { max-width:100%; height:auto; border-radius:.6rem; display:block; margin:1.75rem 0; }
article img { cursor:zoom-in; }
figure.media { margin:1.75rem 0; }
figure.media img, figure.media video { margin:0; }
figure.media figcaption { margin-top:.55rem; font-size:.86rem; line-height:1.6; color:var(--eddm-text-muted); }
/* 섹션과 섹션 사이를 벌리고 윗선으로 가른다. 스크롤할 때 경계가 눈에 보여야 한다.
   h3 는 h2 를 풀어 쓴 부제라 h2 에 붙여 두고 본문 색보다 흐리게 둔다. */
article h2 { margin:4rem 0 .5rem; padding-top:1.75rem; border-top:1px solid var(--eddm-line);
  font-size:var(--eddm-section-title-size-mobile); font-weight:var(--eddm-section-title-weight);
  letter-spacing:var(--eddm-section-title-tracking); line-height:var(--eddm-section-title-line-height);
  display:flex; gap:1.25rem; align-items:baseline; }
@media (min-width:768px) {
  article h2 { font-size:var(--eddm-section-title-size-desktop); }
}
article h2:first-child { margin-top:0; padding-top:0; border-top:0; }
/* 섹션 번호. 목차의 번호와 같아서 지금 몇 번째인지 세지 않고 안다. */
article h2 .sn { flex:0 0 auto; font-size:.82rem; font-weight:500; letter-spacing:.04em;
  color:var(--eddm-accent-dim); font-variant-numeric:tabular-nums; }
article h3 { margin:0 0 1.5rem 2.1rem; font-size:.95rem; font-weight:400; line-height:1.65; color:var(--eddm-text-muted); }
article h3 + figure.media, article h3 + .slider, article h3 + .yt,
article h3 + img, article h3 + video, article h3 + .pending { margin-top:.7rem; }
article p { margin:1.25rem 0; line-height:1.85; color:var(--eddm-text); }
/* 사례 라벨과 바로 아래 시각물을 한 묶음으로 보이게 한다. 위 본문과는 벌리고 이미지는 붙인다. */
article p.lb { display:flex; align-items:center; gap:.6rem; margin:2.4rem 0 .55rem; padding:.55rem .75rem;
  border-left:2px solid var(--eddm-accent); border-radius:0 .45rem .45rem 0;
  background:var(--eddm-raise); color:var(--eddm-ivory); }
article p.lb::before { content:""; flex:0 0 auto; width:5px; height:5px; border-radius:50%; background:var(--eddm-accent); }
article p.lb strong { font-weight:500; font-size:.95rem; }
article p.lb + figure.media, article p.lb + .slider, article p.lb + .yt,
article p.lb + img, article p.lb + video, article p.lb + .pending { margin-top:0; }
article ul, article ol { margin:1.25rem 0; padding-left:1.25rem; line-height:1.85; color:var(--eddm-text); }
article li { margin:.5rem 0; }
article li::marker { color:var(--eddm-accent-dim); }
article pre { overflow-x:auto; margin:1.5rem 0; padding:1rem; border:1px solid var(--eddm-line-base);
  border-radius:.6rem; background:var(--eddm-code-surface); }
.table-wrap { margin:1.5rem 0; overflow-x:auto; border:1px solid var(--eddm-line-base); border-radius:.65rem; }
article table { width:100%; min-width:42rem; border-collapse:collapse; }
article th, article td { padding:.75rem .85rem; border-bottom:1px solid var(--eddm-line-base);
  text-align:left; vertical-align:top; line-height:1.6; }
article th { color:var(--eddm-ivory); background:var(--eddm-hover); font-size:.86rem; font-weight:500; }
article td { color:var(--eddm-text); font-size:.88rem; }
article tbody tr:last-child td { border-bottom:0; }
.cell { margin:1.9rem 0; border:1px solid var(--eddm-accent-line); border-radius:.85rem; overflow:hidden;
  background:var(--eddm-raise); }
.cell.bad { border-color:var(--eddm-danger-line); }
.cell-h { display:flex; align-items:center; gap:.5rem; padding:.7rem 1rem;
  border-bottom:1px solid var(--eddm-line-base); background:var(--eddm-accent-bg); }
.cell-dot { width:6px; height:6px; border-radius:50%; background:var(--eddm-accent); flex:0 0 auto; }
.cell-k { font-size:.72rem; letter-spacing:.14em; text-transform:uppercase; color:var(--eddm-accent); }
.cell-s { margin-left:auto; font-size:.78rem; color:var(--eddm-text-faint); }
.cell-t { margin:.9rem 1rem .2rem; font-size:.98rem; color:var(--eddm-text); font-weight:500; }
.cell-d { margin:.2rem 1rem .8rem; font-size:.88rem; line-height:1.7; color:var(--eddm-text-muted); }
.cell-c { display:block; width:100%; box-sizing:border-box; resize:vertical; border:0; outline:0;
  background:var(--eddm-code-surface); color:var(--eddm-text); padding:.9rem 1rem; line-height:1.65;
  font-family:inherit; font-size:.86rem; white-space:pre; overflow-x:auto; }
.cell-c:focus { background:var(--eddm-code-focus); }
.cell-b { display:flex; flex-wrap:wrap; align-items:center; gap:.5rem; padding:.75rem 1rem;
  border-top:1px solid var(--eddm-line-base); }
.cell-b button { border-radius:.5rem; padding:.4rem .9rem; font-size:.86rem; cursor:pointer;
  border:1px solid var(--eddm-line-strong); background:transparent; color:var(--eddm-text); }
.cell-b button[data-run] { background:var(--eddm-ivory); color:var(--eddm-carbon); border-color:transparent; font-weight:500; }
.cell-b button:disabled { opacity:.5; cursor:default; }
.cell-hint { font-size:.78rem; color:var(--eddm-text-faint); }
.cell-o { margin:0; padding:.9rem 1rem; border-top:1px solid var(--eddm-line-base);
  background:transparent; border-radius:0; max-height:18rem; overflow:auto; font-size:.82rem;
  line-height:1.6; color:var(--eddm-text-muted); white-space:pre-wrap; word-break:break-word; }
.cell.bad .cell-o { color:var(--eddm-danger); }
.cell-miss { padding:1rem; color:var(--eddm-danger); font-size:.88rem; }
.cell-miss i { display:block; margin-top:.3rem; font-style:normal; color:var(--eddm-text-faint); }
.slider { display:flex; gap:.75rem; overflow-x:auto; scroll-snap-type:x mandatory; margin:1.2rem 0; }
.slider figure.media { scroll-snap-align:center; flex:0 0 88%; margin:0; }
.slider img { margin:0; }
.zoom { position:fixed; inset:0; background:var(--eddm-overlay); display:none; align-items:center;
  justify-content:center; z-index:50; padding:1rem; cursor:zoom-out; }
.zoom.on { display:flex; }
.zoom img { max-width:100%; max-height:100%; border-radius:.4rem; }
.back { color:var(--eddm-text-muted); text-decoration:none; font-size:.9rem; }
article a { color:var(--eddm-accent); text-decoration:none; border-bottom:1px solid var(--eddm-accent-line); }
article a:hover { border-bottom-color:var(--eddm-accent); }

/* 용어 툴팁. 렌더러가 심은 term:// 마커가 이 모양으로 나온다. 호버, 키보드 포커스, 탭으로 연다. */
.term { position:relative; cursor:help; border-bottom:1px dashed var(--eddm-accent-dim); }
.term:focus { outline:none; border-bottom-style:solid; border-bottom-color:var(--eddm-accent); }
.term-pop { position:absolute; left:50%; bottom:calc(100% + .6rem); transform:translateX(-50%);
  width:max-content; max-width:min(19rem,calc(100vw - 2.5rem)); padding:.55rem .8rem;
  border:1px solid var(--eddm-line-strong); border-radius:.55rem; background:var(--eddm-code-surface);
  color:var(--eddm-text); font-size:.8rem; font-weight:400; font-style:normal; line-height:1.65;
  white-space:normal; text-align:left; letter-spacing:0;
  box-shadow:0 .75rem 2rem color-mix(in srgb,var(--eddm-ink) 45%,transparent); z-index:30; display:none; }
.term:hover .term-pop, .term:focus .term-pop, .term.on .term-pop { display:block; }
.yt { margin:1.75rem 0; }
.yt figcaption { margin-top:.6rem; display:flex; gap:.75rem; align-items:baseline;
  justify-content:space-between; font-size:.85rem; color:var(--eddm-text-muted); line-height:1.6; }
.yt figcaption a { font-size:.8rem; white-space:nowrap; }
.yt figcaption .at { font-style:normal; margin-left:.5rem; padding:.1rem .45rem; border-radius:.35rem;
  background:var(--eddm-accent-bg); color:var(--eddm-accent); font-size:.78rem; white-space:nowrap; }
.yt .frame { position:relative; width:100%; padding-top:56.25%; border-radius:.6rem;
  overflow:hidden; background:var(--eddm-media); }
.yt.tall .frame { padding-top:0; aspect-ratio:9/16; max-width:22rem; margin-inline:auto; }
.yt iframe, .yt .ytplay { position:absolute; inset:0; width:100%; height:100%; border:0; }
.yt .ytplay { background-color:var(--eddm-media); background-size:cover; background-position:center;
  cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; }
.yt .ytplay span { width:4rem; height:4rem; border-radius:50%; background:color-mix(in srgb,var(--eddm-media) 75%,transparent);
  border:1px solid var(--eddm-line-strong); display:flex; align-items:center; justify-content:center;
  transition:transform .15s; }
.yt .ytplay span::after { content:""; margin-left:.28rem; border-style:solid;
  border-width:.62rem 0 .62rem 1rem; border-color:transparent transparent transparent var(--eddm-ivory); }
.yt .ytplay:hover span { transform:scale(1.06); }
.yt.tall iframe { position:static; aspect-ratio:9/16; }
.yt figcaption { display:flex; flex-wrap:wrap; justify-content:space-between; gap:.35rem 1rem;
  align-items:baseline; margin-top:.5rem; font-size:.88rem; color:var(--eddm-text-muted); }
.yt figcaption a { color:var(--eddm-text); white-space:nowrap; }
.pending { border:1px dashed var(--eddm-line-strong); border-radius:.6rem; margin:1.2rem 0; padding:2.4rem 1.5rem;
  text-align:center; background:var(--eddm-raise); }
.pending b { display:block; font-size:.72rem; letter-spacing:.14em; color:var(--eddm-text-dim);
  text-transform:uppercase; margin-bottom:.6rem; font-weight:500; }
.pending span { display:block; font-size:.9rem; color:var(--eddm-text-muted); line-height:1.7; }
.pending i { display:block; margin-top:.5rem; font-size:.75rem; color:var(--eddm-text-faint); font-style:normal; }
.slider .pending { flex:0 0 88%; margin:0; scroll-snap-align:center; }

/* 강의 모드는 이미지 무대가 본체다. 상하 크롬 없이 왼쪽 인덱스와 장표만 화면을 쓴다. */
.lecture-deck[hidden] { display:none; }
.lecture-deck { position:fixed; inset:0; z-index:100; display:grid;
  grid-template-columns:clamp(12rem,14vw,15.5rem) minmax(0,1fr); grid-template-rows:minmax(0,1fr);
  --eddm-lecture-progress:0%; --lecture-motion:220ms;
  width:100vw; height:100vh; height:100dvh; max-width:none; max-height:none; margin:0; padding:0;
  overflow:hidden; background:var(--eddm-carbon); color:var(--eddm-ivory); }
.lecture-deck::before { content:""; position:absolute; z-index:0; inset:0; pointer-events:none;
  background:radial-gradient(circle at 15% 0%,var(--eddm-accent-bg),transparent 36rem); }
.lecture-deck:fullscreen { width:100vw; height:100vh; height:100dvh; margin:0; }
body.lecture-on { overflow:hidden; }
.lecture-rail { position:relative; z-index:4; grid-column:1; grid-row:1; min-width:0; min-height:0;
  display:grid; grid-template-rows:auto minmax(0,1fr) auto;
  padding:max(1rem,env(safe-area-inset-top)) .75rem max(.8rem,env(safe-area-inset-bottom))
    max(.75rem,env(safe-area-inset-left));
  border-right:1px solid var(--eddm-line-base);
  background:color-mix(in srgb,var(--eddm-carbon) 96%,transparent); }
.lecture-brand { min-width:0; display:flex; align-items:center; gap:.65rem; padding:.25rem .35rem .9rem;
  color:var(--eddm-text-muted); }
.lecture-symbol-wrap { flex:0 0 auto; display:grid; place-items:center; width:1.8rem; height:1.8rem; }
.lecture-symbol { width:1.55rem; height:auto; color:var(--eddm-ivory); }
.lecture-brand-copy { min-width:0; display:grid; gap:.1rem; }
.lecture-brand-copy b { overflow:hidden; color:var(--eddm-ivory); font-size:.66rem; font-weight:650;
  letter-spacing:.1em; text-transform:uppercase; white-space:nowrap; text-overflow:ellipsis; }
.lecture-brand-copy i { overflow:hidden; color:var(--eddm-text-faint); font-size:.68rem; font-style:normal;
  white-space:nowrap; text-overflow:ellipsis; }
.lecture-map-list { min-height:0; overflow:auto; display:grid; align-content:start; gap:.22rem;
  padding:.7rem .1rem; border-top:1px solid var(--eddm-line-base); border-bottom:1px solid var(--eddm-line-base);
  scrollbar-width:thin; }
.lecture-map-item { position:relative; min-width:0; display:grid; grid-template-columns:2rem minmax(0,1fr) auto;
  align-items:center; gap:.45rem; min-height:2.75rem; padding:.5rem .55rem; border:0; border-radius:.4rem;
  background:transparent; color:var(--eddm-text-muted); text-align:left;
  transition:color .15s ease,background .15s ease; }
.lecture-map-item::before { content:""; position:absolute; left:0; top:.45rem; bottom:.45rem; width:2px;
  background:transparent; }
.lecture-map-item:hover { color:var(--eddm-ivory); background:var(--eddm-hover); }
.lecture-map-item[aria-current="step"] { color:var(--eddm-ivory); background:var(--eddm-accent-bg); }
.lecture-map-item[aria-current="step"]::before { background:var(--eddm-accent); }
.lecture-map-item span { color:var(--eddm-accent); font-size:.65rem; font-weight:700; letter-spacing:.1em;
  font-variant-numeric:tabular-nums; }
.lecture-map-item b { min-width:0; overflow:hidden; font-size:.73rem; font-weight:560; line-height:1.35;
  white-space:nowrap; text-overflow:ellipsis; }
.lecture-map-item small { color:var(--eddm-text-faint); font-size:.6rem; white-space:nowrap; }
.lecture-rail-foot { min-width:0; padding:.75rem .1rem 0; }
.lecture-progress { position:relative; display:block; overflow:hidden; margin:0 0 .65rem; padding-bottom:.55rem;
  color:var(--eddm-accent); font-size:.68rem; font-weight:650; letter-spacing:.08em; text-align:center;
  font-variant-numeric:tabular-nums; }
.lecture-progress::before, .lecture-progress::after { content:""; position:absolute; left:0; bottom:0; height:2px; }
.lecture-progress::before { width:100%; background:var(--eddm-line-base); }
.lecture-progress::after { width:var(--eddm-lecture-progress); background:var(--eddm-accent); transition:width .28s ease-out; }
.lecture-nav, .lecture-actions { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.35rem; }
.lecture-actions { margin-top:.35rem; }
.lecture-rail button, .lecture-rail .theme-toggle { display:flex; align-items:center; justify-content:center; gap:.35rem;
  width:100%; min-width:0; height:2.25rem; margin:0; padding:.25rem .4rem;
  border:1px solid var(--eddm-line-base); border-radius:.4rem; background:transparent;
  color:var(--eddm-text-muted); font-size:.66rem; cursor:pointer;
  transition:color .15s ease,border-color .15s ease,background .15s ease; }
.lecture-rail button:hover, .lecture-rail .theme-toggle:hover { color:var(--eddm-ivory);
  border-color:var(--eddm-accent-line); background:var(--eddm-accent-bg); }
.lecture-rail button[aria-pressed="true"] { color:var(--eddm-accent); border-color:var(--eddm-accent-line);
  background:var(--eddm-accent-bg); }
.lecture-rail button:disabled { opacity:.28; cursor:not-allowed; }
.lecture-rail button svg, .lecture-rail .theme-toggle svg { flex:0 0 auto; width:.95rem; height:.95rem; }
.lecture-alert { position:absolute; z-index:7; top:1rem; left:calc(50% + 6rem); width:max-content;
  max-width:min(34rem,calc(100vw - 15rem)); margin:0; padding:.7rem .95rem;
  border:1px solid var(--eddm-accent-line); border-radius:.5rem;
  background:color-mix(in srgb,var(--eddm-ink) 96%,var(--eddm-accent)); color:var(--eddm-ivory);
  font-size:.8rem; line-height:1.5; text-align:center; transform:translateX(-50%); }
.lecture-alert[hidden] { display:none; }
.lecture-break { position:absolute; z-index:9; inset:0; display:block; width:100%; height:100%;
  border:0; background:var(--eddm-carbon); color:transparent; cursor:pointer; }
.lecture-break[hidden] { display:none; }
.lecture-stage { position:relative; z-index:1; grid-column:2; grid-row:1; min-width:0; min-height:0;
  overflow:hidden; display:grid; grid-template-columns:minmax(0,1fr); grid-template-rows:minmax(0,1fr);
  touch-action:pan-y; }
.lecture-stage > .lecture-scene { grid-column:1; grid-row:1; min-height:0; }
/* PPT처럼 왼쪽은 말할 내용, 오른쪽은 규격화된 단일 시각자료 무대다. */
.lecture-scene { display:none; position:relative; width:100%; height:100%; min-width:0; min-height:0;
  box-sizing:border-box; padding:clamp(1.4rem,3.2vw,4rem); contain:layout style;
  grid-template-columns:minmax(16rem,28%) minmax(0,1fr); grid-template-areas:"head canvas";
  gap:clamp(1.6rem,3.2vw,4.5rem); }
.lecture-scene.on { display:grid; }
.lecture-scene.on .scene-head { animation:scene-head var(--lecture-motion) ease both; }
.scene-head { grid-area:head; position:relative; z-index:2; min-width:0; min-height:0; align-self:center;
  display:flex; flex-direction:column; justify-content:center; }
.scene-meta { display:flex; align-items:center; gap:.7rem; margin-bottom:clamp(1.2rem,3vh,2.4rem); }
.scene-index { display:flex; align-items:center; gap:.6rem; color:var(--eddm-accent); font-size:.72rem;
  font-weight:700; letter-spacing:.12em; font-variant-numeric:tabular-nums; }
.scene-index::after { content:""; width:2.6rem; height:1px; background:var(--eddm-accent-line); }
.scene-cue { min-height:.85rem; color:var(--eddm-accent); font-size:.66rem; font-weight:650;
  letter-spacing:.08em; white-space:nowrap; opacity:.82; }
.scene-copy { min-width:0; opacity:1; transition:opacity var(--lecture-motion) ease; }
.scene-head h2 { margin:0; font-size:clamp(2.25rem,3.6vw,4.7rem); line-height:1.03;
  letter-spacing:-.05em; text-wrap:balance; }
.scene-subtitle { margin:clamp(.8rem,1.8vh,1.35rem) 0 0; color:var(--eddm-text-muted);
  font-size:clamp(1.02rem,1.35vw,1.55rem); line-height:1.5; text-wrap:balance; }
.scene-visual-note { margin:clamp(1.25rem,3vh,2.25rem) 0 0; padding-top:1rem;
  border-top:1px solid var(--eddm-line-base); color:var(--eddm-text-muted);
  font-size:clamp(.82rem,.9vw,1rem); line-height:1.55; }
.scene-visual-note[hidden] { display:none; }
.scene-callout { display:none; margin:clamp(1.1rem,2.5vh,2rem) 0 0; padding:.15rem 0 .15rem .9rem;
  border-left:2px solid var(--eddm-accent); color:var(--eddm-ivory);
  font-size:clamp(.92rem,1.05vw,1.18rem); line-height:1.55; }
.scene-callout.on { display:block; animation:scene-callout var(--lecture-motion) ease-out both; }
.scene-canvas { grid-area:canvas; align-self:stretch; min-width:0; min-height:0; overflow:hidden;
  display:grid; place-items:center; contain:layout style; }
.scene-canvas > p:not(.lb), .scene-canvas > ul, .scene-canvas > ol { display:none; }
.scene-canvas .slider { display:contents; }
.scene-canvas .lb, .scene-canvas h4 { display:none; }
.scene-canvas [data-visual] { display:none; width:100%; height:100%; max-width:100%; max-height:100%;
  min-width:0; min-height:0; margin:0; opacity:1;
  transition:opacity var(--lecture-motion) ease,filter var(--lecture-motion) ease; }
.scene-canvas [data-visual][data-scene-visible="true"] { display:block;
  animation:scene-enter var(--lecture-motion) cubic-bezier(.2,.7,.2,1) both; }
.scene-canvas figure.media[data-scene-visible="true"],
.scene-canvas figure.yt[data-scene-visible="true"],
.scene-canvas figure.course-embed[data-scene-visible="true"] { display:flex; flex-direction:column;
  align-items:center; justify-content:center; }
.scene-canvas [data-visual][data-scene-effect="replace"] { animation-name:scene-replace; }
.scene-canvas [data-visual][data-scene-effect="compare"],
.scene-canvas [data-visual][data-scene-effect="compose"] { animation-name:scene-carousel; }
.scene-canvas [data-visual][data-scene-active="true"] { will-change:transform,opacity; }
.scene-canvas [data-visual][data-scene-focus="true"],
.scene-canvas [data-visual][data-scene-live="true"] { filter:brightness(1.12) contrast(1.04); }
.lecture-scene[data-scene-effect="focus"] .scene-copy { opacity:.5; }
.scene-canvas figure.media img, .scene-canvas figure.media video { display:block; width:auto; height:auto;
  max-width:100%; max-height:100%; min-width:0; min-height:0; object-fit:contain; object-position:center;
  border:1px solid var(--eddm-line-strong); border-radius:.55rem; background:var(--eddm-ink); }
.scene-canvas figure.media figcaption, .scene-canvas .yt figcaption,
.scene-canvas .course-embed figcaption { display:none; }
.scene-canvas .yt .frame { width:100%; max-height:100%; aspect-ratio:16/9; }
.scene-canvas .yt.tall .frame { width:auto; height:100%; aspect-ratio:9/16; }
.scene-canvas .course-embed iframe { display:block; width:100%; max-width:100%; max-height:100%;
  aspect-ratio:var(--course-embed-ratio,16/9); border:0; border-radius:.65rem; background:var(--eddm-raise); }
.scene-canvas pre, .scene-canvas .table-wrap, .scene-canvas .cell { width:100%; height:100%; max-width:100%;
  max-height:100%; box-sizing:border-box; overflow:auto; margin:0; }
.scene-canvas pre { padding:clamp(1.15rem,2.2vw,2.4rem); border:1px solid var(--eddm-line-strong);
  border-radius:.55rem; background:color-mix(in srgb,var(--eddm-ink) 94%,var(--eddm-accent));
  color:var(--eddm-ivory); font-family:${DESIGN.font.mono}; font-size:clamp(.9rem,1.3vw,1.4rem);
  line-height:1.6; white-space:pre; }
.scene-canvas .table-wrap { border:1px solid var(--eddm-line-strong); border-radius:.55rem;
  background:var(--eddm-raise); }
.scene-canvas table { width:100%; border-collapse:collapse; }
.scene-canvas th, .scene-canvas td { padding:clamp(.65rem,1.2vw,1rem); border-bottom:1px solid var(--eddm-line-base);
  text-align:left; font-size:clamp(.82rem,1.05vw,1.12rem); line-height:1.45; }
.scene-canvas th { position:sticky; top:0; z-index:1; background:var(--eddm-hover); color:var(--eddm-ivory); }
.scene-canvas td { color:var(--eddm-text); }
.scene-canvas [data-media-host] { position:relative; }
.scene-media-status { display:none; place-items:center; width:100%; height:100%; min-height:12rem; padding:2rem;
  box-sizing:border-box; border:1px solid var(--eddm-line-strong); border-radius:.55rem;
  background:var(--eddm-raise); color:var(--eddm-text-muted); text-align:center; }
.scene-media-status span { display:block; max-width:32rem; font-size:clamp(.95rem,1.2vw,1.15rem); line-height:1.6; }
.scene-media-status button { margin-top:1rem; padding:.55rem .9rem; border:1px solid var(--eddm-accent-line);
  border-radius:.45rem; background:transparent; color:var(--eddm-ivory); font:inherit; cursor:pointer; }
.scene-canvas [data-media-state="loading"] > .scene-media-status,
.scene-canvas [data-media-state="error"] > .scene-media-status { display:grid; }
.scene-canvas [data-media-state="loading"] > .scene-media-status button { display:none; }
.scene-canvas [data-media-host][data-media-state="loading"] > img,
.scene-canvas [data-media-host][data-media-state="loading"] > video,
.scene-canvas [data-media-host][data-media-state="loading"] > iframe,
.scene-canvas [data-media-host][data-media-state="error"] > img,
.scene-canvas [data-media-host][data-media-state="error"] > video,
.scene-canvas [data-media-host][data-media-state="error"] > iframe { display:none; }
@keyframes scene-enter { from { opacity:0; transform:translateY(10px) scale(.988); } to { opacity:1; transform:none; } }
@keyframes scene-replace { from { opacity:0; transform:translateX(18px); } to { opacity:1; transform:none; } }
@keyframes scene-carousel { from { opacity:0; } to { opacity:1; } }
@keyframes scene-callout { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:none; } }
@keyframes scene-head { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:none; } }
@media (max-width:1200px) {
  .lecture-deck { grid-template-columns:4.5rem minmax(0,1fr); }
  .lecture-rail { padding-right:.5rem; padding-left:max(.5rem,env(safe-area-inset-left)); }
  .lecture-brand { justify-content:center; padding-right:0; padding-left:0; }
  .lecture-brand-copy, .lecture-map-item b, .lecture-map-item small,
  .lecture-nav button span, .lecture-actions button span { display:none; }
  .lecture-map-item { grid-template-columns:1fr; justify-items:center; padding:.45rem .2rem; }
  .lecture-nav, .lecture-actions { grid-template-columns:minmax(0,1fr); }
  .lecture-rail button, .lecture-rail .theme-toggle { height:2rem; padding:0; }
  .lecture-progress { font-size:.58rem; letter-spacing:.02em; }
  .lecture-alert { left:calc(50% + 2.25rem); max-width:calc(100vw - 7rem); }
  .lecture-scene { grid-template-columns:minmax(14rem,29%) minmax(0,1fr); }
}
@media (max-width:900px) {
  .lecture-deck { grid-template-columns:3.6rem minmax(0,1fr); }
  .lecture-rail { padding-top:max(.65rem,env(safe-area-inset-top)); padding-right:.35rem;
    padding-bottom:max(.5rem,env(safe-area-inset-bottom)); padding-left:max(.35rem,env(safe-area-inset-left)); }
  .lecture-brand { padding-bottom:.55rem; }
  .lecture-map-list { padding:.45rem 0; }
  .lecture-map-item { min-height:2.25rem; }
  .lecture-rail-foot { padding-top:.5rem; }
  .lecture-progress { margin-bottom:.4rem; padding-bottom:.4rem; }
  .lecture-rail button, .lecture-rail .theme-toggle { height:1.8rem; }
  .lecture-actions { display:grid; grid-template-columns:minmax(0,1fr); }
  .lecture-scene { padding:clamp(.9rem,4vw,1.4rem); grid-template-columns:minmax(0,1fr);
    grid-template-rows:auto minmax(0,1fr); grid-template-areas:"head" "canvas"; gap:.85rem; }
  .scene-head { align-self:start; display:grid; grid-template-columns:auto minmax(0,1fr); gap:.45rem .7rem; }
  .scene-meta { grid-column:1/-1; margin-bottom:.15rem; }
  .scene-index::after { width:1.4rem; }
  .scene-head h2 { font-size:clamp(1.5rem,7vw,2.35rem); }
  .scene-subtitle { margin-top:.4rem; font-size:.88rem; line-height:1.4; }
  .scene-visual-note, .scene-callout { margin-top:.55rem; padding-top:.5rem; font-size:.74rem; line-height:1.4; }
  .scene-visual-note { height:3.4rem; box-sizing:border-box; overflow:auto; }
  .scene-callout { padding-top:.1rem; }
  .scene-canvas { place-items:start stretch; }
  .scene-canvas figure.media[data-scene-visible="true"],
  .scene-canvas figure.yt[data-scene-visible="true"],
  .scene-canvas figure.course-embed[data-scene-visible="true"] { justify-content:flex-start; }
  .scene-canvas pre { padding:.85rem; font-size:.75rem; white-space:pre-wrap; overflow-wrap:anywhere; }
  .scene-canvas th, .scene-canvas td { padding:.5rem .55rem; font-size:.72rem; }
}
@media (max-height:650px) and (min-width:901px) {
  .lecture-brand { padding-bottom:.45rem; }
  .lecture-map-list { padding:.35rem .1rem; }
  .lecture-map-item { min-height:2.15rem; padding:.35rem .5rem; }
  .lecture-rail-foot { padding-top:.45rem; }
  .lecture-progress { margin-bottom:.4rem; padding-bottom:.35rem; }
  .lecture-rail button, .lecture-rail .theme-toggle { height:1.8rem; }
  .lecture-scene { padding:1.15rem 1.5rem; gap:1.5rem; }
  .scene-meta { margin-bottom:.75rem; }
  .scene-head h2 { font-size:clamp(1.9rem,3.3vw,3.1rem); }
  .scene-subtitle { margin-top:.45rem; font-size:.92rem; }
  .scene-visual-note, .scene-callout { margin-top:.75rem; font-size:.8rem; }
}
@media (prefers-reduced-motion:reduce) {
  .scene-canvas [data-visual][data-scene-visible="true"], .scene-callout.on, .scene-head { animation:none; }
  .scene-copy { transition:none; }
}
`;

/**
 * 목차가 지금 보는 절을 따라간다.
 *
 * 강사가 화면을 띄워 놓고 설명하는 동안 수강생이 "지금 어디" 를 놓치면 따라오지 못한다.
 * IntersectionObserver 로 화면에 든 절을 잡아 목차에 표시만 한다.
 */
const TOC_SCRIPT = `
(() => {
  const toc = document.querySelector(".toc");
  if (!toc) return;
  // 좁은 화면에서는 접어 둔다. 열 줄이 펼쳐지면 본문에 닿기까지 두 화면을 스크롤한다.
  const narrow = () => matchMedia("(max-width:1100px)").matches;
  if (narrow()) toc.removeAttribute("open");
  // 목차에서 뛰면 그 자리에서 다시 접는다. 펼친 채로 두면 본문을 가린다.
  toc.addEventListener("click", (e) => {
    if (narrow() && e.target.closest && e.target.closest("a[data-to]")) {
      setTimeout(() => toc.removeAttribute("open"), 0);
    }
  });
  if (!("IntersectionObserver" in window)) return;
  const links = new Map();
  toc.querySelectorAll("a[data-to]").forEach((a) => links.set(a.dataset.to, a));
  const seen = new Set();
  const mark = () => {
    let top = null;
    for (const id of links.keys()) if (seen.has(id)) { top = id; break; }
    links.forEach((a, id) => a.classList.toggle("on", id === top));
    if (top) {
      const a = links.get(top);
      const box = toc.getBoundingClientRect();
      const r = a.getBoundingClientRect();
      if (r.top < box.top || r.bottom > box.bottom) a.scrollIntoView({ block: "nearest" });
    }
  };
  const at = document.querySelector(".toc-at");
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) seen.add(e.target.id);
      else seen.delete(e.target.id);
    }
    mark();
    // 목차 머리의 "3 / 10". 지금 몇 번째인지 숫자로도 말해 준다.
    if (at) {
      let n = 0;
      let i = 0;
      for (const id of links.keys()) { i += 1; if (seen.has(id)) { n = i; break; } }
      if (n) at.textContent = n + " / " + links.size;
    }
  }, { rootMargin: "-72px 0px -65% 0px" });
  document.querySelectorAll("article h2[id]").forEach((h) => io.observe(h));

  // 읽은 만큼 차는 띠. 글이 길어서 어디쯤인지 감이 없으면 지친다.
  const bar = document.querySelector(".prog i");
  if (bar) {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      bar.style.width = (max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0) + "%";
    };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    onScroll();
  }
})();
`;

const ZOOM_SCRIPT = `
const z = document.getElementById("zoom");
document.addEventListener("click", (e) => {
  const t = e.target;
  const play = t.closest ? t.closest("button.ytplay") : null;
  if (play) {
    const f = document.createElement("iframe");
    const at = play.dataset.start ? "&start=" + play.dataset.start : "";
    f.src = "https://www.youtube-nocookie.com/embed/" + play.dataset.yt + "?autoplay=1&rel=0&playsinline=1" + at;
    f.title = play.dataset.label || "YouTube 영상";
    f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    f.referrerPolicy = "strict-origin-when-cross-origin";
    f.allowFullscreen = true;
    play.replaceWith(f);
    return;
  }
  if (t.tagName === "IMG" && t.closest("article")) {
    z.querySelector("img").src = t.src;
    z.querySelector("img").alt = t.alt;
    z.classList.add("on");
  } else if (z.classList.contains("on")) {
    z.classList.remove("on");
  }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") z.classList.remove("on"); });
`;

/**
 * 용어 툴팁의 탭 토글. 호버가 없는 화면(태블릿, 휴대전화)에서는 탭이 유일한 길이다.
 * 다른 용어를 탭하거나 빈 곳을 탭하면 열려 있던 것을 닫는다. 툴팁이 두 개 겹치면 못 읽는다.
 */
const TERM_SCRIPT = `
document.addEventListener("click", (e) => {
  const t = e.target.closest ? e.target.closest(".term") : null;
  document.querySelectorAll(".term.on").forEach((el) => { if (el !== t) el.classList.remove("on"); });
  if (t) t.classList.toggle("on");
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") document.querySelectorAll(".term.on").forEach((el) => el.classList.remove("on"));
});
`;

/**
 * pyproc 이 고정한 Pyodide 배포판. `site/src/pymachine.ts` 와 **같은 판이어야 한다.**
 * 블로그 실행 칸과 강의장 실행 칸이 다른 파이썬을 돌리면 같은 코드가 다르게 동작한다.
 */
const ENGINE = "https://cdn.jsdelivr.net/pyodide/v314.0.2/full/";

/**
 * 실행 칸을 살린다.
 *
 * **페이지 전체가 파이썬 머신 하나를 나눠 쓴다.** 004 는 실행 칸이 일곱 개인데 칸마다
 * 부팅하면 강의가 멈춘다. 처음 실행을 누를 때만 받아 오고 그 뒤로는 즉시 돈다.
 *
 * 미리 부팅하지 않는 것도 일부러다. 수강생이 글만 읽고 지나가는 편이 훨씬 많은데
 * 페이지를 열자마자 수십 MB 를 받으면 강의장 전체가 느려진다.
 */
const CELL_SCRIPT = `
(() => {
  const cells = document.querySelectorAll("[data-cell]");
  if (!cells.length) return;
  let booting = null;
  const boot = () => {
    if (!booting) {
      booting = import("${ENGINE}pyodide.mjs")
        .then((m) => m.loadPyodide({ indexURL: "${ENGINE}" }))
        .catch((e) => { booting = null; throw e; });
    }
    return booting;
  };
  cells.forEach((cell) => {
    const ta = cell.querySelector("[data-code]");
    const out = cell.querySelector("[data-out]");
    const st = cell.querySelector("[data-state]");
    const run = cell.querySelector("[data-run]");
    const reset = cell.querySelector("[data-reset]");
    if (!ta || !out || !st || !run) return;
    const first = ta.value;
    if (reset) reset.addEventListener("click", () => { ta.value = first; ta.focus(); });
    run.addEventListener("click", async () => {
      run.disabled = true;
      cell.classList.remove("bad");
      out.textContent = "";
      st.textContent = booting ? "실행 중" : "파이썬을 처음 받는 중입니다";
      try {
        const py = await boot();
        st.textContent = "실행 중";
        const lines = [];
        py.setStdout({ batched: (s) => lines.push(s) });
        py.setStderr({ batched: (s) => lines.push(s) });
        const value = await py.runPythonAsync(ta.value);
        if (value !== undefined && value !== null) lines.push(String(value));
        out.textContent = lines.length ? lines.join("\\n") : "(나온 값이 없습니다)";
        st.textContent = "완료";
      } catch (e) {
        out.textContent = e && e.message ? e.message : String(e);
        st.textContent = "오류";
        cell.classList.add("bad");
      } finally {
        run.disabled = false;
      }
    });
  });
})();
`;

/**
 * H2 장면과 선언된 beat를 한 장표 한 시각자료의 전체화면 강의 흐름으로 실행한다.
 *
 * 발표자 노트, 발표자 분리 창, 발표 시간은 계약 3 과 함께 걷어냈다 (2026-08-31 운영자 지시).
 * 다중 대상 beat는 렌더러가 같은 좌표의 연속 프레임으로 펼친다. 브라우저는 완성된 프레임
 * 하나만 투영하며 좌측 인덱스와 앞뒤 단추로 이동한다.
 */
const LECTURE_SCRIPT = `
(() => {
  const deck = document.querySelector("[data-lecture-deck]");
  const openButton = document.querySelector("[data-lecture-open]");
  if (!deck || !openButton) return;
  const scenes = [...deck.querySelectorAll(".lecture-scene")];
  if (!scenes.length) return;
  if (scenes.some((scene) => scene.dataset.sceneRuntime !== deck.dataset.lectureRuntime)) return;
  const progress = deck.querySelector("[data-lecture-progress]");
  const mapList = deck.querySelector("[data-lecture-map-list]");
  const blankButton = deck.querySelector("[data-lecture-blank-toggle]");
  const blankLabel = deck.querySelector("[data-lecture-blank-label]");
  const breakScreen = deck.querySelector("[data-lecture-break]");
  const fullscreenButton = deck.querySelector("[data-lecture-fullscreen]");
  const alert = deck.querySelector("[data-lecture-alert]");
  const prevButton = deck.querySelector("[data-lecture-prev]");
  const nextButton = deck.querySelector("[data-lecture-next]");
  const status = deck.querySelector("[data-lecture-status]");
  let sceneAt = 0;
  let frameAt = 0;
  let beforeHash = "";
  let opened = false;
  let alertTimer = null;
  let blanked = false;

  const showAlert = (message) => {
    if (!alert) return;
    if (alertTimer) clearTimeout(alertTimer);
    alert.textContent = message;
    alert.hidden = false;
    alertTimer = setTimeout(() => {
      alert.hidden = true;
      alert.textContent = "";
      alertTimer = null;
    }, 6000);
  };

  const mapItems = scenes.map((scene, index) => {
    const button = document.createElement("button");
    const number = document.createElement("span");
    const title = document.createElement("b");
    const count = document.createElement("small");
    button.type = "button";
    button.className = "lecture-map-item";
    button.dataset.lectureMapScene = String(index);
    number.textContent = String(index + 1).padStart(2, "0");
    title.textContent = scene.querySelector("h2")?.textContent.trim() || "강의 장면";
    count.textContent = scene.querySelectorAll("[data-visual]").length + "장";
    button.setAttribute("aria-label", number.textContent + " " + title.textContent + " · " + count.textContent);
    button.append(number, title, count);
    button.addEventListener("click", () => {
      showScene(index, 0);
      deck.focus({ preventScroll:true });
    });
    mapList.append(button);
    return button;
  });
  const syncMap = () => mapItems.forEach((item, index) => {
    if (index === sceneAt) item.setAttribute("aria-current", "step");
    else item.removeAttribute("aria-current");
  });
  const syncBlankUi = () => {
    deck.dataset.audienceBlanked = blanked ? "true" : "false";
    blankButton.setAttribute("aria-pressed", blanked ? "true" : "false");
    const blankTitle = blanked ? "관객 화면 다시 보이기" : "관객 화면 가리기";
    blankButton.setAttribute("aria-label", blankTitle);
    blankButton.title = blankTitle;
    blankLabel.textContent = blanked ? "보이기" : "가리기";
    breakScreen.hidden = !blanked;
    deck.querySelector(".lecture-rail").toggleAttribute("inert", blanked);
    deck.querySelector(".lecture-stage").toggleAttribute("inert", blanked);
  };
  const setBlanked = (active) => {
    blanked = Boolean(active);
    syncBlankUi();
  };
  const framesOf = (scene) => {
    try { return JSON.parse(scene.dataset.timeline || "[]"); }
    catch { return []; }
  };
  const visualCatalog = new Map(scenes.map((scene) => {
    const visuals = [...scene.querySelectorAll("[data-visual]")];
    return [scene, { visuals, byId: new Map(visuals.map((visual) => [Number(visual.dataset.visual), visual])) }];
  }));
  const targetsOf = (scene, beat) => beat.targets.map((n) => visualCatalog.get(scene)?.byId.get(n)).filter(Boolean);
  const allVisuals = (scene) => visualCatalog.get(scene)?.visuals || [];
  const flag = (node, name, on, value = "true") => {
    if (on) {
      if (node.dataset[name] !== value) node.dataset[name] = value;
    } else if (node.dataset[name] !== undefined) delete node.dataset[name];
  };
  const hideAll = (scene) => allVisuals(scene).forEach((visual) => {
    delete visual.dataset.sceneVisible;
    delete visual.dataset.sceneEffect;
    delete visual.dataset.sceneActive;
    delete visual.dataset.sceneFocus;
    delete visual.dataset.sceneLive;
  });
  const mediaHosts = new Map();
  const bindMedia = (media) => {
    if (mediaHosts.has(media)) return;
    const host = media.closest("figure.media, figure.course-embed") || media.parentElement;
    if (!host) return;
    host.dataset.mediaHost = "true";
    const box = document.createElement("div");
    box.className = "scene-media-status";
    box.dataset.mediaStatus = "";
    box.setAttribute("role", "status");
    const message = document.createElement("span");
    const retry = document.createElement("button");
    retry.type = "button";
    retry.textContent = "다시 불러오기";
    box.append(message, retry);
    host.insertBefore(box, host.querySelector("figcaption"));
    let timer = 0;
    const set = (state, text) => {
      clearTimeout(timer);
      host.dataset.mediaState = state;
      message.textContent = text;
    };
    const loading = () => {
      clearTimeout(timer);
      delete host.dataset.mediaState;
      timer = setTimeout(() => set("loading", "시각물을 불러오는 중입니다"), 350);
    };
    const ready = () => set("ready", "");
    const failed = () => set("error", "시각물을 불러오지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요");
    const sourceUrl = media.getAttribute("src") || "";
    retry.addEventListener("click", () => {
      if (!sourceUrl) return;
      loading();
      media.removeAttribute("src");
      if (media.load) media.load();
      requestAnimationFrame(() => {
        media.setAttribute("src", sourceUrl);
        if (media.load) media.load();
      });
    });
    const readyEvent = media.matches("video") ? "loadeddata" : "load";
    media.addEventListener(readyEvent, ready);
    media.addEventListener("error", failed);
    mediaHosts.set(media, { host, ready, failed, loading });
    if (media.matches("img") && media.complete) {
      if (media.naturalWidth > 0) ready();
      else failed();
    } else if (media.matches("video") && media.readyState >= 1) ready();
    else loading();
  };
  scenes.forEach((scene) => scene.querySelectorAll("img, video, .course-embed > iframe").forEach(bindMedia));
  const prime = (scene) => {
    if (!scene) return;
    scene.querySelectorAll("img").forEach((img) => {
      img.loading = "eager";
      img.decode?.().catch(() => {});
    });
  };
  let paintFrame = 0;
  const markPaint = () => {
    deck.dataset.scenePhase = "painting";
    cancelAnimationFrame(paintFrame);
    paintFrame = requestAnimationFrame(() => {
      paintFrame = requestAnimationFrame(() => {
        deck.dataset.scenePhase = "ready";
        deck.dispatchEvent(new CustomEvent("lectureframe", { detail: { scene: sceneAt, frame: frameAt } }));
      });
    });
  };

  // 사례 라벨을 바로 아래 시각물에 붙이고, 장표에서는 캡션과 함께 왼쪽 설명 칸으로 옮긴다.
  scenes.forEach((scene) => {
    let labels = [];
    scene.querySelectorAll(".scene-canvas .lb, .scene-canvas h4, .scene-canvas [data-visual]").forEach((node) => {
      if (node.matches("[data-visual]")) {
        labels.forEach((label) => { label.dataset.sceneLabelFor = node.dataset.visual; });
        labels = [];
      } else labels.push(node);
    });
  });

  const syncVisualNote = (scene, visual) => {
    const note = scene.querySelector("[data-scene-visual-note]");
    if (!note) return;
    const id = visual?.dataset.visual || "";
    const label = scene.querySelector('[data-scene-label-for="' + id + '"]')?.textContent.trim() || "";
    const caption = visual?.querySelector("figcaption")?.textContent.trim() || "";
    const count = allVisuals(scene).length;
    const position = count > 1 && id ? "자료 " + id + " / " + count : "";
    note.textContent = [position, label, caption].filter(Boolean).join(" · ");
    note.hidden = !note.textContent;
  };

  const trigger = (visual, effect) => {
    if (effect === "run") {
      const play = visual.matches("button.ytplay") ? visual : visual.querySelector("button.ytplay");
      const video = visual.matches("video") ? visual : visual.querySelector("video");
      const run = visual.querySelector("[data-run]");
      if (play) play.click();
      else if (video) video.play().catch(() => mediaHosts.get(video)?.failed());
      else if (run && !run.disabled) run.click();
    }
    if (effect === "simulate") {
      visual.dataset.sceneLive = "true";
      const control = visual.querySelector("button, input, textarea, iframe") || visual;
      if (control.focus) control.focus({ preventScroll:true });
    }
  };
  const syncControls = () => {
    const lastScene = scenes.length - 1;
    const lastFrame = framesOf(scenes[lastScene]).length - 1;
    const atStart = sceneAt === 0 && frameAt === 0;
    const atEnd = sceneAt === lastScene && frameAt === lastFrame;
    prevButton.disabled = atStart;
    nextButton.disabled = atEnd;
    prevButton.setAttribute("aria-disabled", atStart ? "true" : "false");
    nextButton.setAttribute("aria-disabled", atEnd ? "true" : "false");
  };
  const frameCounts = scenes.map((scene) => Math.max(1, framesOf(scene).length));
  const totalFrames = frameCounts.reduce((sum, count) => sum + count, 0);
  const globalFrame = () => frameCounts.slice(0, sceneAt).reduce((sum, count) => sum + count, 0) + frameAt + 1;
  const announce = (scene, frame) => {
    if (!status) return;
    const title = scene.querySelector("h2")?.textContent.trim() || "강의 장면";
    status.textContent = "장표 " + globalFrame() + " / " + totalFrames + " · " + title
      + (frame?.cue ? " · " + frame.cue : "");
  };

  const apply = (fire = false) => {
    const scene = scenes[sceneAt];
    const frames = framesOf(scene);
    const frame = frames[frameAt] || frames[0] || null;
    const visible = new Set(frame?.visible || []);
    const focused = new Set(frame?.focus || []);
    const active = new Set(frame?.targets || []);
    const interacting = new Set(frame?.interaction || []);
    const cue = scene.querySelector("[data-scene-cue]");
    flag(scene, "sceneEffect", Boolean(frame), frame?.effect || "");
    if (cue) cue.textContent = frame?.cue || "";
    let shownVisual = null;
    allVisuals(scene).forEach((visual) => {
      const id = Number(visual.dataset.visual);
      const isVisible = visible.has(id);
      const isActive = active.has(id);
      if (isVisible) shownVisual = visual;
      flag(visual, "sceneVisible", isVisible);
      flag(visual, "sceneActive", isActive);
      flag(visual, "sceneFocus", focused.has(id));
      flag(visual, "sceneLive", interacting.has(id));
      flag(visual, "sceneEffect", isActive, frame?.effect || "");
    });
    const callout = scene.querySelector("[data-scene-callout]");
    callout.textContent = frame?.annotation || "";
    callout.classList.toggle("on", Boolean(frame?.annotation));
    if (fire && frame && (frame.effect === "run" || frame.effect === "simulate")) {
      targetsOf(scene, frame).forEach((visual) => trigger(visual, frame.effect));
    }
    syncVisualNote(scene, shownVisual);
    const current = globalFrame();
    const ratio = totalFrames > 1 ? (current - 1) / (totalFrames - 1) : 1;
    deck.style.setProperty("--eddm-lecture-progress", (ratio * 100).toFixed(2) + "%");
    progress.textContent = String(current).padStart(2, "0") + " / " + String(totalFrames).padStart(2, "0");
    progress.setAttribute("aria-valuenow", String(Math.round(ratio * 100)));
    syncMap();
    history.replaceState(null, "", "#lecture=" + scene.dataset.scene + "." + (frameAt + 1));
    syncControls();
    announce(scene, frame);
    markPaint();
  };

  const showScene = (nextScene, nextFrame = 0, fire = false) => {
    sceneAt = Math.max(0, Math.min(scenes.length - 1, nextScene));
    const frames = framesOf(scenes[sceneAt]);
    frameAt = Math.max(0, Math.min(Math.max(0, frames.length - 1), nextFrame));
    scenes.forEach((scene, index) => {
      scene.classList.toggle("on", index === sceneAt);
      scene.setAttribute("aria-hidden", index === sceneAt ? "false" : "true");
      scene.toggleAttribute("inert", index !== sceneAt);
      if (index !== sceneAt) hideAll(scene);
    });
    prime(scenes[sceneAt]);
    prime(scenes[sceneAt + 1]);
    apply(fire);
  };

  const next = () => {
    const frames = framesOf(scenes[sceneAt]);
    if (frameAt < frames.length - 1) showScene(sceneAt, frameAt + 1, true);
    else if (sceneAt < scenes.length - 1) showScene(sceneAt + 1, 0);
  };
  const prev = () => {
    if (frameAt > 0) showScene(sceneAt, frameAt - 1);
    else if (sceneAt > 0) {
      const before = framesOf(scenes[sceneAt - 1]);
      showScene(sceneAt - 1, before.length - 1);
    }
  };

  const syncFullscreen = () => {
    const active = document.fullscreenElement === deck;
    fullscreenButton.hidden = !deck.requestFullscreen;
    fullscreenButton.setAttribute("aria-pressed", active ? "true" : "false");
    fullscreenButton.setAttribute("aria-label", active ? "전체화면 종료" : "전체화면 시작");
    fullscreenButton.title = active ? "전체화면 종료" : "전체화면 시작";
  };

  const toggleFullscreen = async () => {
    if (!deck.requestFullscreen) return;
    if (document.fullscreenElement === deck) await document.exitFullscreen().catch(() => {});
    else await deck.requestFullscreen().catch(() => {
      if (status) status.textContent = "브라우저에서 전체화면을 시작하지 못했습니다";
      showAlert("브라우저에서 전체화면을 시작하지 못했습니다");
    });
    syncFullscreen();
  };

  const close = async () => {
    if (!opened) return;
    setBlanked(false);
    opened = false;
    deck.hidden = true;
    document.body.classList.remove("lecture-on");
    if (document.fullscreenElement === deck) await document.exitFullscreen().catch(() => {});
    history.replaceState(null, "", beforeHash || location.pathname + location.search);
    syncFullscreen();
    openButton.focus();
  };

  const nearestScene = () => {
    const headings = [...document.querySelectorAll("article h2[id]")];
    let found = 0;
    headings.forEach((heading, index) => { if (heading.getBoundingClientRect().top <= innerHeight * .45) found = index; });
    return found;
  };

  const open = async (fromHash = false) => {
    if (opened) return;
    opened = true;
    if (!fromHash) beforeHash = location.hash && !location.hash.startsWith("#lecture=") ? location.hash : location.pathname + location.search;
    deck.hidden = false;
    document.body.classList.add("lecture-on");
    blanked = false;
    syncBlankUi();
    let targetScene = nearestScene();
    let targetFrame = 0;
    const saved = location.hash.match(/^#lecture=(s\\d+)\\.(\\d+)$/);
    if (saved) {
      const found = scenes.findIndex((scene) => scene.dataset.scene === saved[1]);
      if (found >= 0) targetScene = found;
      targetFrame = Number(saved[2]) - 1;
    }
    showScene(targetScene, targetFrame);
    deck.focus({ preventScroll:true });
    if (!fromHash && deck.requestFullscreen) await deck.requestFullscreen().catch(() => {});
    syncFullscreen();
  };

  openButton.addEventListener("click", () => { void open(false); });
  deck.querySelector("[data-lecture-close]").addEventListener("click", () => { void close(); });
  nextButton.addEventListener("click", next);
  prevButton.addEventListener("click", prev);
  blankButton.addEventListener("click", () => setBlanked(!blanked));
  breakScreen.addEventListener("click", () => setBlanked(false));
  fullscreenButton.addEventListener("click", () => { void toggleFullscreen(); });
  document.addEventListener("fullscreenchange", syncFullscreen);
  const stage = deck.querySelector(".lecture-stage");
  let pointerStart = null;
  let suppressStageClick = false;
  stage.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.target.closest("button, a, input, textarea, video, iframe, .cell")) return;
    pointerStart = { x:event.clientX, y:event.clientY };
  });
  stage.addEventListener("pointerup", (event) => {
    if (!pointerStart || !event.isPrimary) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(dx) < Math.max(48, innerWidth * .08) || Math.abs(dx) <= Math.abs(dy) * 1.25) return;
    suppressStageClick = true;
    setTimeout(() => { suppressStageClick = false; }, 0);
    if (dx < 0) next();
    else prev();
  });
  stage.addEventListener("pointercancel", () => { pointerStart = null; });
  stage.addEventListener("click", (event) => {
    if (suppressStageClick) return;
    if (event.target.closest("button, a, input, textarea, video, iframe, .cell")) return;
    if (getSelection()?.toString()) return;
    next();
  });
  document.addEventListener("keydown", (event) => {
    if (!opened) return;
    if (event.key === "Tab") {
      const focusable = [...deck.querySelectorAll("button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])")]
        .filter((node) => node.getClientRects().length > 0 && !node.closest("[inert]"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      return;
    }
    if (blanked) {
      if (event.key === "Escape" || event.key.toLowerCase() === "b") {
        event.preventDefault();
        setBlanked(false);
      }
      return;
    }
    if (event.target?.matches?.("input, textarea") && event.key !== "Escape") return;
    if (["ArrowRight", "PageDown", " "].includes(event.key)) { event.preventDefault(); next(); }
    else if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); prev(); }
    else if (event.key === "Home") { event.preventDefault(); showScene(0, 0); }
    else if (event.key === "End") { event.preventDefault(); const last = scenes.length - 1; showScene(last, framesOf(scenes[last]).length - 1); }
    else if (event.key.toLowerCase() === "f") { event.preventDefault(); void toggleFullscreen(); }
    else if (event.key.toLowerCase() === "b") { event.preventDefault(); setBlanked(!blanked); }
    else if (event.key === "Escape") { event.preventDefault(); void close(); }
  });

  if (/^#lecture=s\\d+\\.\\d+$/.test(location.hash)) void open(true);
  addEventListener("pagehide", () => {
    if (alertTimer) clearTimeout(alertTimer);
  }, { once:true });
})();
`;

/* 세션 ------------------------------------------------------------------ */

/**
 * 수강생 쿠키.
 *
 * 운영자 쿠키와 이름도 경로도 겹치지 않는다. 강의방 세션으로 운영장에 들어가거나 그 반대가
 * 되면 안 된다. 경로를 방 하나로 좁혀 두어 옆 방 쿠키도 따라가지 않는다.
 */
const ROOM_COOKIE = "eddm_room";

const roomPath = (slug: string) => `/room/${slug}`;

async function signKey(env: Env): Promise<string> {
  const { data } = await call(env, { action: "signKey" });
  return data.key as string;
}

/**
 * 쿠키가 이 방의 것이고 아직 살아 있는지 본다.
 *
 * 방 이름만이 아니라 **세대**까지 본다. 비밀번호를 바꾸거나 방을 지웠다 다시 만들면 세대가
 * 바뀌고 앞의 쿠키가 전부 죽는다. 비밀번호를 바꾸는 이유는 그것이 샜기 때문인데 세대를
 * 안 보면 이미 들어와 있는 사람은 12시간을 그대로 남는다.
 */
function hasSession(key: string, request: Request, room: PublicRoom): Promise<boolean> {
  return checkToken(key, readCookie(request, ROOM_COOKIE), room.slug, room.gen);
}

/**
 * 강의방 화면 하나.
 *
 * 공용 크롬은 shell.ts 가 깔고 여기서는 강의방 CSS 와 확대 오버레이만 얹는다.
 */
function roomPage(
  title: string,
  inner: string,
  extraScript = "",
  wide = false,
  cells = false,
): Response {
  return page({
    title,
    style: CLASSROOM_STYLE,
    inner,
    extraBody: `<div class="zoom" id="zoom"><img alt=""></div>`,
    script: `${ZOOM_SCRIPT}${extraScript}`,
    wide,
    cells,
  });
}

function loginPage(slug: string, title: string, message = ""): Response {
  return roomPage(
    title,
    `${header()}<section class="gate">
       <p class="eyebrow">eddmpython course</p>
       <h1>${esc(title)}</h1>
       <p class="sub">등록된 수강생을 위한 비공개 과정입니다. 안내받은 비밀번호로 입장해 주세요</p>
       <form method="post" action="/room/${esc(slug)}/login">
         <input type="password" name="password" placeholder="수강 비밀번호" aria-label="수강 비밀번호" autofocus autocomplete="current-password">
         <button type="submit">과정 입장</button>
       </form>${message ? `<p class="err">${esc(message)}</p>` : ""}
     </section>`,
  );
}

/* 라우팅 ---------------------------------------------------------------- */

function visible(categories: CourseCategory[], unlocked: string[]): CourseCategory[] {
  return categories.filter((c) => unlocked.includes(c.slug));
}

const poll = (slug: string) => `
setInterval(async () => {
  const r = await fetch("/room/${slug}/state", { cache: "no-store" });
  // 세션이 끊겼으면(비밀번호가 바뀌었거나 방이 지워졌다) 그 자리에 머물지 않고 나간다
  if (r.status === 401 || r.status === 404) { location.reload(); return; }
  if (!r.ok) return;
  const s = await r.json();
  if (s.stamp !== window.__stamp) location.reload();
}, 3000);`;

/**
 * 상태 지문. 무엇이 열렸는지가 **읽히지 않는** 값이어야 한다.
 *
 * 처음에는 열린 카테고리 슬러그를 그대로 이어 붙였다. 그것은 지문이 아니라 커리큘럼
 * 폴더 이름 목록이고 진도까지 같이 새어 나간다. 이 저장소는 커리큘럼 공개를 금지한다.
 * 서명 키로 눌러서 밖에서는 바뀌었다는 것만 알게 한다.
 */
async function stampOf(key: string, room: PublicRoom, version: string): Promise<string> {
  const raw = `${room.gen}:${room.open ? 1 : 0}:${[...room.unlocked].sort().join(",")}:${version}`;
  return (await hmac(key, raw)).slice(0, 16);
}

export async function handleRoom(request: Request, env: Env, url: URL): Promise<Response> {
  const path = url.pathname.replace(/\/$/, "") || "/room";

  if (path === "/room") {
    return roomPage(
      "course",
      `${header()}<section class="gate"><p class="eyebrow">eddmpython course</p>
       <h1>비공개 과정</h1><p class="sub wait">안내받은 과정 주소로 들어오세요</p></section>`,
    );
  }

  const parts = path.split("/").slice(2);
  const slug = parts[0] ?? "";
  if (!validSlug(slug)) return new Response("not found", { status: 404 });

  const { data: found } = await call(env, { action: "get", slug });
  // 없는 방은 없는 주소다. 만들기 전에는 아무 데도 존재하지 않는다.
  if (!found.room) return new Response("없는 강의방입니다.", { status: 404 });
  const room = found.room as PublicRoom;

  if (parts[1] === "login" && parts.length === 2) {
    if (request.method !== "POST") return loginPage(slug, room.title);
    const form = await request.formData();
    const { data: tried } = await call(env, {
      action: "login",
      slug,
      password: String(form.get("password") ?? ""),
    });
    if (!tried.ok) {
      return loginPage(
        slug,
        room.title,
        tried.retryAfter
          ? `너무 여러 번 틀렸습니다. ${Math.ceil(tried.retryAfter / 60)}분 뒤에 다시 해 주세요.`
          : "비밀번호가 맞지 않습니다.",
      );
    }
    const fresh = await signKey(env);
    return new Response(null, {
      status: 303,
      headers: {
        location: roomPath(slug),
        "set-cookie": cookie(
          ROOM_COOKIE,
          await issueToken(fresh, room.slug, room.gen),
          roomPath(slug),
          url,
        ),
      },
    });
  }

  const key = await signKey(env);

  // 폴링도 들어온 사람만 한다. 앞에 두면 비밀번호 없이 방 상태를 감시할 수 있다.
  if (!(await hasSession(key, request, room))) {
    if (parts[1] === "state" && parts.length === 2) {
      return Response.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }
    return loginPage(slug, room.title);
  }

  if (parts[1] === "state" && parts.length === 2) {
    // 지문만 준다. 본문도 카테고리 목록도 여기서 안 내려간다.
    return Response.json(
      { stamp: await stampOf(key, room, await courseVersion(env)) },
      { headers: { "cache-control": "no-store" } },
    );
  }

  const mark = await stampOf(key, room, await courseVersion(env));
  const stamp = `window.__stamp=${JSON.stringify(mark)};${poll(slug)}`;

  if (!room.open) {
    return roomPage(
      room.title,
      `${header()}<section class="gate"><p class="eyebrow">eddmpython course</p>
       <h1>${esc(room.title)}</h1><p class="sub wait">아직 열리지 않았습니다. 이 화면을 열어 두세요</p></section>`,
      stamp,
    );
  }

  const courseState = await course(env);
  const all = courseState.categories;
  const open = visible(all, room.unlocked);

  if (parts.length === 1) {
    // 잠긴 카테고리도 이름만 보여 준다. 진도가 어디까지 남았는지 알면 덜 불안하다.
    // 본문은 여전히 안 내려간다. 그것이 이 파일이 존재하는 이유다.
    const locked = all.filter((c: CourseCategory) => !room.unlocked.includes(c.slug));
    const cards = open.length
      ? open
          .map((c, i) => {
            const n = String(i + 1).padStart(2, "0");
            const posts = c.posts
              .map(
                (p, j) =>
                  `<a class="post" href="/room/${esc(slug)}/${esc(c.slug)}/${esc(p.id)}"><b>${String(
                    j + 1,
                  ).padStart(2, "0")}</b><span>${esc(p.title)}</span></a>`,
              )
              .join("");
            return `<div class="cat"><div class="cat-h"><span class="cat-n">${n}</span>
              <h2>${esc(c.title)}</h2><span class="state on">열림</span></div>
              ${c.goal ? `<p class="goal">이 카테고리를 덮으면 ${esc(c.goal)} 것이 됩니다.</p>` : ""}
              ${posts}
            </div>`;
          })
          .join("")
      : '<p class="wait">곧 시작합니다. 이 화면을 열어 두시면 됩니다.</p>';
    const later = locked.length
      ? `<div class="later"><p class="later-h">다음에 열립니다</p>${locked
          .map(
            (c) =>
              `<div class="later-row"><span>${esc(c.title)}</span><span>${c.posts.length}편</span></div>`,
          )
          .join("")}</div>`
      : "";
    const total = open.reduce((n, c) => n + c.posts.length, 0);
    return roomPage(
      room.title,
      `${header()}
       <section class="hero">
         <p class="eyebrow">eddmpython course</p>
         <h1>${esc(room.title)}</h1>
         <p class="sub">${
           total
             ? `${open.length}개 과정 ${total}편이 열려 있습니다. 순서대로 따라오시면 됩니다.`
             : "곧 시작합니다. 이 화면을 열어 두고 기다리시면 됩니다."
         }</p>
       </section>${cards}${later}`,
      stamp,
    );
  }

  if (parts.length === 3) {
    const category = open.find((c) => c.slug === parts[1]);
    // 잠긴 카테고리는 본문을 만들지도 않는다. 여기서 막는 것이 이 설계의 요점이다.
    if (!category) return new Response("아직 열리지 않았습니다.", { status: 404 });
    const at = category.posts.findIndex((p) => p.id === parts[2]);
    const post = category.posts[at];
    if (!post) return new Response("없는 글입니다.", { status: 404 });
    const { html, headings, hasCells } = renderPost(post.body, category.cells ?? {}, courseState.glossary);
    const lecture = renderLecture(post.body, post.scenes ?? [], category.cells ?? {}, courseState.glossary);

    // 왼쪽. 같은 과정의 글을 오간다. 강의 중에 앞 편으로 되돌아가는 일이 잦다.
    const nav = category.posts
      .map(
        (p, i) =>
          `<a class="nav-post${p.id === post.id ? " on" : ""}" href="/room/${esc(slug)}/${esc(
            category.slug,
          )}/${esc(p.id)}"><b>${String(i + 1).padStart(2, "0")}</b><span>${esc(p.title)}</span></a>`,
      )
      .join("");

    // 오른쪽. 절이 스물 몇 개라 목차 없이는 강사가 원하는 자리를 스크롤로 찾아야 한다.
    const toc = headings.length
      ? `<details class="toc" open><summary class="toc-h"><span>목차</span><span class="toc-at">1 / ${
          headings.length
        }</span></summary>${headings
          .map(
            (h: string, i: number) =>
              `<a href="#s${i + 1}" data-to="s${i + 1}"><b>${String(i + 1).padStart(
                2,
                "0",
              )}</b><span>${esc(h)}</span></a>`,
          )
          .join("")}</details>`
      : "";

    const prev = category.posts[at - 1];
    const next = category.posts[at + 1];
    const foot =
      prev || next
        ? `<div class="pager">${
            prev
              ? `<a href="/room/${esc(slug)}/${esc(category.slug)}/${esc(prev.id)}"><span>이전</span><b>${esc(prev.title)}</b></a>`
              : "<i></i>"
          }${
            next
              ? `<a class="nx" href="/room/${esc(slug)}/${esc(category.slug)}/${esc(next.id)}"><span>다음</span><b>${esc(next.title)}</b></a>`
              : "<i></i>"
          }</div>`
        : "";

    const lectureUi = lecture.ok
      ? `<div class="lecture-deck" data-lecture-deck data-lecture-runtime="${COURSE_SCENE_RUNTIME}" role="dialog" aria-modal="true" aria-label="${esc(
          post.title,
        )} 강의 모드" tabindex="-1" hidden>
           <aside class="lecture-rail" aria-label="강의 장표 인덱스">
             <span class="lecture-brand">
               <span class="lecture-symbol-wrap"><svg class="lecture-symbol" viewBox="${esc(SYMBOL.viewBox)}" aria-hidden="true">${symbolMarkup()}</svg></span>
               <span class="lecture-brand-copy"><b>eddmpython course</b><i>${esc(category.title)} · ${esc(post.title)}</i></span>
             </span>
             <nav class="lecture-map-list" data-lecture-map-list aria-label="장표 바로가기"></nav>
             <div class="lecture-rail-foot">
               <span class="lecture-progress" data-lecture-progress role="progressbar" aria-label="강의 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">01 / 01</span>
               <div class="lecture-nav"><button type="button" data-lecture-prev aria-label="이전 장표" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg><span>이전</span></button><button type="button" data-lecture-next aria-label="다음 장표"><span>다음</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></button></div>
               <div class="lecture-actions">
                 ${themeToggle("lecture-theme-toggle")}
                 <button type="button" class="lecture-tool-secondary" data-lecture-fullscreen aria-label="전체화면 시작" title="전체화면 시작" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3.5H3.5V8M16 3.5h4.5V8M8 20.5H3.5V16M16 20.5h4.5V16"/></svg><span>전체화면</span></button>
                 <button type="button" class="lecture-tool-secondary" data-lecture-blank-toggle aria-pressed="false" aria-label="관객 화면 가리기" title="관객 화면 가리기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="13" rx="1.5"/><path d="M8 21h8M12 17.5V21"/></svg><span data-lecture-blank-label>가리기</span></button>
                 <button type="button" data-lecture-close aria-label="강의 모드 닫기" title="강의 모드 닫기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg><span>닫기</span></button>
               </div>
             </div>
           </aside>
           <p class="lecture-alert" data-lecture-alert role="status" aria-live="assertive" aria-atomic="true" hidden></p>
           <button type="button" class="lecture-break" data-lecture-break aria-label="관객 화면 다시 보이기" hidden><span class="sr-only">클릭하거나 B를 눌러 강의 화면으로 돌아갑니다</span></button>
           <div class="lecture-stage">
             ${lecture.html}
           </div>
           <p class="sr-only" data-lecture-status aria-live="polite" aria-atomic="true"></p>
         </div>`
      : "";

    return roomPage(
      post.title,
      `<div class="prog" aria-hidden="true"><i></i></div>
       ${header()}
       <div class="lay">
         <aside class="side">
           <a class="back" href="/room/${esc(slug)}">← ${esc(room.title)}</a>
           <p class="side-h">${esc(category.title)}</p>
           ${nav}
         </aside>
         <main class="body">
           <div class="body-top"><div class="body-title">
             <p class="eyebrow">${esc(category.title)} · ${at + 1}편</p>
             <h1>${esc(post.title)}</h1>
             <p class="sub">${esc(post.summary)}</p>
           </div>${
             lecture.ok
               ? `<button type="button" class="lecture-open" data-lecture-open><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="m9 21 3-4 3 4M8 9h8M8 12h5"/></svg>강의 모드</button>`
               : ""
           }</div>
           <article>${html}</article>
           ${foot}
         </main>
         ${toc}
       </div>${lectureUi}`,
      stamp
        + TOC_SCRIPT
        + (hasCells || lecture.hasCells ? CELL_SCRIPT : "")
        + (lecture.ok ? LECTURE_SCRIPT : "")
        + (html.includes('class="term"') || lecture.html.includes('class="term"') ? TERM_SCRIPT : ""),
      true,
      hasCells || lecture.hasCells,
    );
  }

  return new Response("not found", { status: 404 });
}
