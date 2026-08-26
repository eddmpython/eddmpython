/**
 * 감시가 잡은 변화를 어디로 알릴지.
 *
 * 채널은 셋이다. 글마다 `track.json` 의 `notify` 로 고른다.
 *
 * | 채널 | 누가 보나 | 무엇이 필요한가 |
 * |---|---|---|
 * | `issue` | 글쓴이 | 없음. GITHUB_TOKEN 으로 된다 |
 * | `comment` | 독자와 글쓴이 | 없음. 그 글의 Discussions 스레드에 단다 |
 * | `mail` | 글쓴이 | 발송 시크릿 |
 *
 * **`comment` 가 이 파일의 핵심이다.** 글 아래 댓글은 giscus 가 그리고 giscus 는
 * `data-strict="1"` 로 도는데, strict 는 discussion 제목이 아니라 **본문에 박힌 SHA-1** 로
 * 스레드를 찾는다. 그래서 자동화가 스레드를 새로 만들 때 그 해시를 직접 넣어야 giscus 가
 * 같은 스레드를 집는다. 해시는 term(글 폴더 이름)의 SHA-1 이다.
 *
 * 2026-08-26 에 003 으로 실측했다. 이 파일이 만든 스레드에 이 파일이 단 댓글이 글 화면의
 * giscus 위젯에 "댓글 1개" 로 그대로 떴다.
 *
 * 스레드를 미리 만들어 두는 것은 부작용이 아니라 이득이다. giscus 는 스레드가 없을 때 첫
 * 댓글을 쓰는 사람이 만들게 하는데, GitHub 검색 색인이 최종 일관성이라 만든 직후에는 검색이
 * 못 찾아 같은 글에 스레드가 둘 생기는 창이 있다. 자동화가 방문자보다 먼저 만들면 그 창이
 * 닫힌다.
 */

import { createHash } from "node:crypto";

const GITHUB_API = "https://api.github.com";
const GRAPHQL = "https://api.github.com/graphql";

/** giscus 가 strict 모드에서 찾는 값. term 의 SHA-1 이다. */
export function giscusHash(term) {
  return createHash("sha1").update(term).digest("hex");
}

function token() {
  const value = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!value) throw new Error("GITHUB_TOKEN 이 없습니다");
  return value;
}

async function graphql(query, variables) {
  const res = await fetch(GRAPHQL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token()}`,
      "content-type": "application/json",
      accept: "application/vnd.github+json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json();
  if (!res.ok || body.errors) {
    throw new Error(`GraphQL 실패: ${JSON.stringify(body.errors ?? body).slice(0, 300)}`);
  }
  return body.data;
}

/**
 * 이 글의 스레드를 찾는다.
 *
 * 검색이 아니라 목록을 훑는다. GitHub 검색 색인은 최종 일관성이라 방금 만든 스레드를 놓칠 수
 * 있는데, 목록은 즉시 정확하다. 글 수가 수백 편이 되기 전에는 이 방식이 더 싸고 정확하다.
 */
export async function findDiscussion(repo, category, term) {
  const [owner, name] = repo.split("/");
  const data = await graphql(
    `query($owner: String!, $name: String!, $after: String) {
      repository(owner: $owner, name: $name) {
        discussions(first: 100, after: $after) {
          pageInfo { hasNextPage endCursor }
          nodes { id number title url category { name } }
        }
      }
    }`,
    { owner, name, after: null },
  );
  const nodes = data.repository.discussions.nodes ?? [];
  return nodes.find((d) => d.title === term && d.category?.name === category) ?? null;
}

/** 스레드를 만든다. giscus 가 찾을 수 있도록 본문에 SHA-1 을 박는다. */
export async function createDiscussion(repoId, categoryId, term, { title, url }) {
  const lines = [];
  if (title) lines.push(title, "");
  if (url) lines.push(url, "");
  lines.push("이 글에 대한 이야기를 여기에 남깁니다.", "");
  /* giscus strict 매칭의 열쇠다. 이 줄이 없으면 위젯이 이 스레드를 못 찾고 새로 만든다. */
  lines.push(`<!-- sha1: ${giscusHash(term)} -->`);
  const data = await graphql(
    `mutation($repo: ID!, $cat: ID!, $title: String!, $body: String!) {
      createDiscussion(input: {repositoryId: $repo, categoryId: $cat, title: $title, body: $body}) {
        discussion { id number url title }
      }
    }`,
    { repo: repoId, cat: categoryId, title: term, body: lines.join("\n") },
  );
  return data.createDiscussion.discussion;
}

/** 스레드에 댓글을 단다. */
export async function addComment(discussionId, body) {
  const data = await graphql(
    `mutation($d: ID!, $body: String!) {
      addDiscussionComment(input: {discussionId: $d, body: $body}) { comment { id url } }
    }`,
    { d: discussionId, body },
  );
  return data.addDiscussionComment.comment;
}

/** 이슈를 연다. */
export async function createIssue(repo, title, body) {
  const res = await fetch(`${GITHUB_API}/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token()}`,
      "content-type": "application/json",
      accept: "application/vnd.github+json",
    },
    body: JSON.stringify({ title, body }),
  });
  if (!res.ok) throw new Error(`이슈 생성 실패: HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * 메일을 보낸다.
 *
 * GitHub 기본 알림으로는 "성공했지만 변화 감지" 를 표현할 수 없다. 켜면 변화 없는 날도 매일
 * 오고 끄면 변화 있는 날에도 안 온다. 그래서 발송을 따로 둔다.
 *
 * 시크릿이 없으면 보내지 않고 그 사실을 돌려준다. 조용히 넘어가면 메일이 오는 줄 알고 기다리게
 * 된다. 필요한 시크릿은 `RESEND_API_KEY` 와 `TRACK_MAIL_TO` 와 `TRACK_MAIL_FROM` 셋이다.
 */
export async function sendMail(subject, markdown) {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.TRACK_MAIL_TO;
  const from = process.env.TRACK_MAIL_FROM;
  if (!key || !to || !from) {
    const missing = [
      !key && "RESEND_API_KEY",
      !to && "TRACK_MAIL_TO",
      !from && "TRACK_MAIL_FROM",
    ].filter(Boolean);
    return { sent: false, reason: `발송 설정이 없습니다: ${missing.join(", ")}` };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, text: markdown }),
  });
  if (!res.ok) {
    return { sent: false, reason: `Resend HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` };
  }
  const body = await res.json();
  return { sent: true, id: body.id };
}

/** 한 감시의 변화를 댓글 한 편으로 쓴다. 독자도 읽으므로 저장소 용어를 쓰지 않는다. */
export function renderComment(items) {
  const lines = [];
  for (const item of items) {
    lines.push(`**${item.label}** \`${item.before}\` -> \`${item.now}\``, "");
    lines.push(item.why, "");
    if (item.anchor) lines.push(`> ${item.anchor}`, "");
    lines.push(`출처: ${item.source}`, "");
  }
  lines.push("---", "");
  lines.push("이 글이 지켜보던 것이 움직여서 자동으로 남긴 기록입니다. 본문은 아직 그대로입니다.");
  return lines.join("\n");
}
