import type { Env } from "./env";
import type { PublicRoom } from "./rooms";
import { call } from "./rooms";
import { esc } from "./classroom-render";

export type GithubLink = { repository: string; lesson: string; username: string; accountId?: number; status: string; error: string; updated: number; attempt?: string };
const headers = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" };
const fail = (error: string, status = 400) => Response.json({ error }, { status, headers });

async function githubApi(env: Env, path: string, method = "GET", body?: object) {
  return fetch(`https://api.github.com${path}`, {
    method, redirect: "manual", signal: AbortSignal.timeout(8000),
    headers: { Authorization: `Bearer ${env.GITHUB_INVITE_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2026-03-10", "User-Agent": "eddmpython-classroom", "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

export async function verifyGithubRepository(env: Env, repository: string) {
  if (!env.GITHUB_INVITE_TOKEN) throw new Error("GitHub 자동 초대 인증이 설정되지 않았습니다. 강사에게 알려 주세요");
  if (!/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error("저장소 주소를 확인해 주세요");
  const response = await githubApi(env, `/repos/${repository}`);
  if (!response.ok) throw new Error("GitHub 저장소 또는 초대 권한을 확인할 수 없습니다. 강사에게 알려 주세요");
  const data = await response.json() as { private?: boolean; full_name?: string; archived?: boolean };
  if (!data.private || data.archived || data.full_name?.toLowerCase() !== repository.toLowerCase()) throw new Error("사용 가능한 비공개 저장소가 아닙니다. 강사에게 알려 주세요");
}

/** HTTP 처리자가 방 세션, 수업 접근, 미리보기와 Origin을 먼저 검사한다. */
export async function connectGithub(env: Env, room: PublicRoom, body: Record<string, unknown>): Promise<Response> {
  if (!env.GITHUB_INVITE_TOKEN) return fail("GitHub 자동 초대 인증이 설정되지 않았습니다. 강사에게 알려 주세요", 503);
  if (!["invite", "check"].includes(String(body.mode))) return fail("지원하지 않는 작업입니다");
  if (body.mode === "invite" && body.confirm !== true) return fail("본인의 GitHub 사용자 이름인지 확인해 주세요");
  const started = await call(env, { action: "studentGithubStart", roomId: room.id, username: body.username });
  if (started.status !== 200) return fail(String(started.data.error), started.status);
  const link = started.data.github as GithubLink;
  let accountId = link.accountId, release = false;
  let status = "error", error = "", responseStatus = 200;
  try {
    await verifyGithubRepository(env, link.repository);
    const profile = await githubApi(env, `/users/${encodeURIComponent(link.username)}`);
    if (profile.status === 404) { release = !accountId; throw new Error("존재하지 않는 GitHub 사용자 이름입니다. 프로필 주소를 확인해 주세요"); }
    if (!profile.ok) throw new Error("GitHub 계정을 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요");
    const user = await profile.json() as { id: number; type: string };
    if (user.type !== "User" || (accountId && accountId !== user.id)) throw new Error("연결한 GitHub 계정과 일치하지 않습니다. 강사에게 알려 주세요");
    accountId = user.id;
    const path = `/repos/${link.repository}/collaborators/${encodeURIComponent(link.username)}`;
    const access = await githubApi(env, path);
    if (access.status === 204) status = "active";
    else if (access.status !== 404) throw new Error("GitHub 접근 권한을 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요");
    else if (body.mode === "check") {
      const pending = await githubApi(env, `/repos/${link.repository}/invitations?per_page=100`);
      if (!pending.ok) throw new Error("GitHub 초대 상태를 확인하지 못했습니다. 강사에게 알려 주세요");
      const invitations = await pending.json() as { invitee: { id: number } | null }[];
      if (invitations.some(invite => invite.invitee?.id === accountId)) status = "pending";
      else throw new Error("유효한 초대가 없습니다. 초대받기를 다시 클릭해 주세요");
    } else {
      const invited = await githubApi(env, path, "PUT", { permission: "push" });
      if (invited.status === 201) status = "pending";
      else if (invited.status === 204) status = "active";
      else if (invited.status === 403 || invited.status === 429) throw new Error("GitHub 초대 권한 또는 요청 한도를 확인해야 합니다. 강사에게 알려 주세요");
      else throw new Error("초대하지 못했습니다. 잠시 뒤 다시 시도하고 계속 실패하면 강사에게 알려 주세요");
    }
  } catch (cause) {
    error = cause instanceof Error && cause.name === "Error" ? cause.message : "GitHub 응답을 확인하지 못했습니다. 30초 뒤 같은 아이디로 다시 확인해 주세요";
    responseStatus = 502;
  }
  const finished = await call(env, { action: "studentGithubFinish", roomId: room.id, attempt: link.attempt, accountId, release, status: release ? "unlinked" : status, error });
  if (finished.status !== 200) return fail("초대 결과를 저장하지 못했습니다. 같은 아이디로 다시 확인해 주세요", 503);
  return Response.json({ html: githubForm(finished.data.github, room, false, true), error }, { status: responseStatus, headers });
}

export const githubLabels: Record<string, string> = { unlinked: "아이디 입력 전", pending: "초대 수락 대기", active: "연결 완료", error: "확인 필요" };
export function githubForm(link: GithubLink | null, room: PublicRoom, readOnly: boolean, ready: boolean): string {
  if (!link) return '<p class="notice">연결할 실습 저장소가 없습니다. 강사에게 알려 주세요.</p>';
  const repositoryUrl = `https://github.com/${link.repository}`;
  const disabled = readOnly || !ready;
  return `<section class="github-connect" data-github-panel><p class="github-heading"><strong>실습 저장소 연결</strong><span>${esc(githubLabels[link.status] ?? "확인 필요")}</span></p>
    <p><a href="${esc(repositoryUrl)}" target="_blank" rel="noreferrer">${esc(link.repository)}</a> · Private</p>
    ${link.username ? `<p>GitHub 계정: <a href="https://github.com/${esc(link.username)}" target="_blank" rel="noreferrer">${esc(link.username)}</a></p>` : ""}
    ${link.status === "pending" ? `<p>초대를 보냈습니다. 아래에서 초대를 수락한 뒤 ‘연결 상태 확인’을 클릭하세요.</p><p><a class="github-button" href="${esc(repositoryUrl)}/invitations" target="_blank" rel="noreferrer">GitHub에서 초대 수락</a></p>` : ""}
    ${link.status === "active" ? `<p>저장소에 접근할 수 있습니다. 다음 섹션에서 실습을 진행하세요.</p><p><a class="github-button" href="${esc(repositoryUrl)}" target="_blank" rel="noreferrer">실습 저장소 열기</a></p>` : ""}
    <form data-github-form action="/room/${esc(room.slug)}/github" method="post">
      ${link.username ? `<input type="hidden" name="username" value="${esc(link.username)}">` : `<label>GitHub 사용자 이름<input name="username" maxlength="39" autocomplete="off" autocapitalize="none" spellcheck="false" required ${disabled ? "disabled" : ""} placeholder="예: my-github-id"></label>`}
      ${!["active", "pending"].includes(link.status) ? '<label class="github-confirm"><input type="checkbox" name="confirm" required> 본인의 GitHub 프로필에서 사용자 이름을 확인했습니다.</label>' : ""}
      <button class="github-button" type="submit" name="mode" value="${["active", "pending"].includes(link.status) ? "check" : "invite"}" ${disabled ? "disabled" : ""}>${["active", "pending"].includes(link.status) ? "연결 상태 확인" : "이 계정으로 초대받기"}</button>
      <p role="status" aria-live="polite" class="github-message">${esc(readOnly ? "강사 미리보기에서는 초대를 보내지 않습니다." : !ready ? "자동 초대 인증이 아직 설정되지 않았습니다. 강사에게 알려 주세요." : link.error || "")}</p>
    </form></section>`;
}

export function githubPractice(room: PublicRoom): string {
  const command = `Set-Location (Join-Path ([Environment]::GetFolderPath("MyDocuments")) "gitPractice/coursePractice/practice/${room.slug}")\nnotepad README.md`;
  return `<p>내 실습 파일: <code>practice/${esc(room.slug)}/README.md</code></p><div class="command-box"><div class="command-head"><span>PowerShell에 입력</span><button type="button" data-command-copy aria-label="PowerShell에 입력할 내용 복사">복사</button></div><pre>${esc(command)}</pre></div>`;
}

export const githubStyle = `.github-connect{margin:1.5rem 0;padding:1.4rem;border:1px solid var(--eddm-line-strong);border-radius:.8rem}.github-heading{display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap}.github-heading span{font-size:.85rem;color:var(--eddm-text-muted)}.github-connect form{display:block}.github-connect label{display:grid;gap:.5rem;margin:1rem 0}.github-connect input:not([type=checkbox]){width:100%;box-sizing:border-box;padding:.7rem;border:1px solid var(--eddm-line-strong);border-radius:.4rem;background:var(--eddm-carbon);color:var(--eddm-ivory);font:inherit}.github-connect .github-confirm{display:flex;align-items:baseline;font-size:.9rem}.github-button{display:inline-block;padding:.7rem 1rem;border:1px solid var(--eddm-line-strong);border-radius:.5rem;background:var(--eddm-carbon);color:var(--eddm-ivory);font:inherit;cursor:pointer}.github-button:disabled{opacity:.5;cursor:default}.github-message{font-size:.9rem}.github-connect[aria-busy=true] .github-message:before{content:"";display:inline-block;width:1rem;height:1rem;border:2px solid var(--eddm-line);border-top-color:var(--eddm-accent);border-radius:50%;animation:github-spin .8s linear infinite;margin-right:.5rem}@keyframes github-spin{to{transform:rotate(360deg)}}`;
export const githubScript = `document.addEventListener('submit',async event=>{const form=event.target;if(!form.matches('[data-github-form]'))return;event.preventDefault();const panel=form.closest('[data-github-panel]');if(panel.getAttribute('aria-busy')==='true')return;const data=new FormData(form);panel.setAttribute('aria-busy','true');const button=form.querySelector('button');button.disabled=true;const message=form.querySelector('[role=status]');message.textContent='';try{const response=await fetch(form.action,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:data.get('username'),confirm:data.get('confirm')==='on',mode:button.value}),signal:AbortSignal.timeout(40000)});if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('로그인 상태를 확인하고 새로고침해 주세요');const result=await response.json();if(result.html){panel.outerHTML=result.html;}else throw new Error(result.error||'연결하지 못했습니다. 다시 시도해 주세요');}catch(error){message.textContent=error.name==='TimeoutError'?'응답을 확인하지 못했습니다. 30초 뒤 같은 아이디로 다시 확인해 주세요':error.message;}finally{panel.removeAttribute('aria-busy');button.disabled=false;}});`;
