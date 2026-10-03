import { call, type PublicRoom } from "./rooms";
import { checkToken, clearCookie, cookie, issueToken, readCookie } from "./auth";
import { sameOrigin, readJson } from "./students";
import { renderPost } from "./classroom-render";
import { notebookSections } from "./notebookSections";
import type { CourseCategory } from "./course";
import type { Env } from "./env";
import { notifyQuestion } from "./notebookEmail";

const privateHeaders = { "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow" };
const json = (data: unknown, status = 200, extra: Record<string, string> = {}) => Response.json(data, { status, headers: { ...privateHeaders, ...extra } });
type Options = { key: string; personal: boolean; readOnly: boolean; categories: CourseCategory[]; canOpen: (category: CourseCategory, post: string) => boolean; ctx?: ExecutionContext };

/** Invoked only after the classroom's room authentication and open-state checks. */
export async function handleNotebook(request: Request, env: Env, url: URL, room: PublicRoom, options: Options): Promise<Response> {
  if (request.method !== "POST" || !sameOrigin(request, url)) return json({ error: "이 강의장에서 다시 시도해 주세요" }, 403);
  const body = await readJson(request, 64000);
  if (!body) return json({ error: "입력한 내용을 확인해 주세요" }, 400);
  const action = String(body.action ?? "");
  if (!["read", "register", "login", "logout", "save", "ask", "followup"].includes(action)) return json({ error: "지원하지 않는 작업입니다" }, 400);
  // A teacher's preview never reads a learner's private notes.
  if (options.readOnly) return action === "read" ? json({ readOnly: true, identity: null, notes: [], threads: [] }) : json({ error: "미리보기에서는 기록을 저장하거나 전송할 수 없습니다" }, 403);
  const path = `/room/${room.slug}`;
  const session = readCookie(request, "eddm_notebook");
  let ownerId = options.personal ? "personal" : "";
  if (!ownerId && session) {
    const subject = session.split(".")[0];
    const memberId = subject?.replace(/^notebook:/, "") ?? "";
    if (/^[a-f0-9-]{36}$/.test(memberId) && await checkToken(options.key, session, `notebook:${memberId}`, room.gen)) ownerId = memberId;
  }
  if (action === "logout") return json({ ok: true }, 200, { "set-cookie": clearCookie("eddm_notebook", path, url) });
  if (action === "register" || action === "login") {
    if (options.personal) return json({ error: "개인 강의장에서는 바로 기록할 수 있습니다" }, 400);
    const result = await call(env, { action: action === "register" ? "notebookRegister" : "notebookLogin", roomId: room.id, name: body.name, password: body.password });
    if (result.status !== 200) return json(result.data, result.status);
    const token = await issueToken(options.key, `notebook:${result.data.identity.id}`, room.gen);
    return json({ identity: result.data.identity }, 200, { "set-cookie": cookie("eddm_notebook", token, path, url) });
  }
  const identity = ownerId ? (await call(env, { action: "notebookIdentity", roomId: room.id, ownerId })).data.identity : null;
  if (!identity) return action === "read" ? json({ identity: null, notes: [], threads: [] }) : json({ error: "내 기록에 로그인한 뒤 다시 시도해 주세요" }, 401);
  if (action !== "read" && body.expectedOwnerId !== identity.id) return json({ error: "다른 탭에서 로그인한 계정이 바뀌었습니다. 작성 중인 내용을 보관하고 내 기록을 다시 열어 주세요", identityChanged: true }, 409);
  const lesson = String(body.lesson ?? "");
  const category = options.categories.find(c => c.slug === lesson.split("/")[0]);
  const post = category?.posts.find(p => `${category.slug}/${p.id}` === lesson);
  if (!category || !post || !options.canOpen(category, post.id)) return json({ error: "열람할 수 있는 수업이 아닙니다" }, 404);
  const context = { roomId: room.id, ownerId, lesson };
  const notify = async (messageId: unknown) => {
    if (typeof messageId !== "string" || env.LOCAL_PREVIEW_BYPASS === "1") return;
    const work = notifyQuestion(env, { roomId: room.id, messageId });
    if (options.ctx) options.ctx.waitUntil(work); else await work;
  };
  if (action === "read") {
    const result = await call(env, { action: "notebookRead", ...context });
    return json({ ...result.data, identity }, result.status);
  }
  if (action === "followup") {
    // Validate the thread's lesson before forwarding any mutation.
    const read = await call(env, { action: "notebookRead", ...context });
    if (!read.data.threads?.some((t: { id: string }) => t.id === body.id)) return json({ error: "질문을 찾을 수 없습니다" }, 404);
    const result = await call(env, { action: "notebookFollowup", ...context, id: body.id, messageId: body.messageId, body: body.body });
    if (result.status === 200) await notify(body.messageId);
    return json(result.data, result.status);
  }
  const sections = await notebookSections(renderPost(post.body).headings);
  const section = sections.find(s => s.key === body.sectionKey);
  if (!section) return json({ error: "섹션이 변경되었습니다. 작성한 내용을 복사한 뒤 교안을 다시 열어 주세요" }, 409);
  const result = await call(env, { action: action === "save" ? "notebookSaveNote" : "notebookAsk", ...context,
    sectionKey: section.key, sectionTitle: section.title, lessonTitle: post.title, body: body.body, version: body.version, id: body.id });
  if (action === "ask" && result.status === 200) await notify(body.id);
  return json(result.data, result.status);
}
