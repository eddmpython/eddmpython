import type { Env } from "./env";
import { call } from "./rooms";
import { esc } from "./classroom-render";

type MailStatus = { ready: boolean; state: "ready" | "unconfigured" | "local"; label: string };
export type QuestionNotification = { state: string; error?: string };

function emailAddress(value: string | undefined): string {
  const address = value?.trim() ?? "";
  return address.length <= 254 && /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(address) ? address : "";
}

/** 주소나 인증 정보를 관리자 응답과 브라우저에 내보내지 않는다. */
export function notebookEmailStatus(env: Env): MailStatus {
  if (env.LOCAL_PREVIEW_BYPASS === "1") return { ready: false, state: "local", label: "로컬에서는 이메일을 보내지 않습니다." };
  if (!env.CLASSROOM_EMAIL || !emailAddress(env.CLASSROOM_NOTIFY_TO) || !emailAddress(env.CLASSROOM_NOTIFY_FROM)) {
    return { ready: false, state: "unconfigured", label: "이메일 알림 설정 전입니다. 질문은 질문함에 정상적으로 저장됩니다." };
  }
  return { ready: true, state: "ready", label: "질문 등록 시 이메일 알림을 보냅니다. 실제 발송 결과는 질문별로 확인할 수 있습니다." };
}

function shortLine(value: unknown, fallback: string): string {
  return String(value || fallback).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
}

/** 공급자의 원문 오류에는 수신 주소가 포함될 수 있어 정해진 설명만 저장한다. */
function mailFailure(cause: unknown): QuestionNotification {
  const code = cause && typeof cause === "object" && "code" in cause ? String(cause.code) : "";
  switch (code) {
    case "E_SENDER_NOT_VERIFIED":
    case "E_SENDER_DOMAIN_NOT_AVAILABLE":
      return { state: "failed", error: "발신 도메인 확인이 필요합니다." };
    case "E_RECIPIENT_NOT_ALLOWED":
    case "E_RECIPIENT_SUPPRESSED":
      return { state: "failed", error: "수신 주소의 허용 또는 수신 차단 상태를 확인해야 합니다." };
    case "E_RATE_LIMIT_EXCEEDED":
    case "E_DAILY_LIMIT_EXCEEDED":
      return { state: "failed", error: "이메일 발송 한도에 도달했습니다. 잠시 뒤 다시 시도해 주세요" };
    case "E_VALIDATION_ERROR":
    case "E_FIELD_MISSING":
    case "E_CONTENT_TOO_LARGE":
    case "E_HEADER_NOT_ALLOWED":
    case "E_HEADER_USE_API_FIELD":
    case "E_HEADER_VALUE_INVALID":
      return { state: "failed", error: "이메일 발송 설정을 확인해야 합니다." };
    case "E_DELIVERY_FAILED":
      return { state: "failed", error: "메일 서버가 알림을 받지 못했습니다. 수신 상태를 확인한 뒤 다시 시도해 주세요" };
    default:
      return { state: "unknown", error: "발송 결과를 확인하지 못했습니다. 이미 도착했을 수 있으니 받은편지함을 확인해 주세요" };
  }
}

/**
 * 질문 저장이 끝난 뒤 호출한다. 발송 실패는 질문 저장 실패가 아니다.
 * 호출자는 waitUntil로 응답과 분리한다. 바인딩에는 취소나 idempotency 옵션이 없으므로
 * 보내는 중인 알림을 시간만 보고 자동 재시도하지 않는다.
 */
export async function notifyQuestion(env: Env, input: { roomId: string; messageId: string }, retry = false): Promise<QuestionNotification> {
  const status = notebookEmailStatus(env);
  if (!status.ready) return { state: status.state, error: status.label };
  let claim;
  try {
    claim = await call(env, { action: "notebookClaimNotification", roomId: input.roomId, messageId: input.messageId, retry, confirm: retry });
  } catch {
    return { state: "pending", error: "알림 대기 상태를 확인하지 못했습니다. 질문함에서 다시 확인해 주세요" };
  }
  if (claim.status !== 200) return { state: "pending", error: "알림 대기 상태를 확인하지 못했습니다. 질문함에서 다시 확인해 주세요" };
  const notification = claim.data.notification;
  if (!notification) return { state: "skipped" };
  const thread = claim.data.thread;
  const roomTitle = shortLine(thread.roomTitle, "강의방");
  const ownerName = shortLine(thread.ownerName, "학습자");
  const lessonTitle = shortLine(thread.lessonTitle, "수업");
  const sectionTitle = shortLine(thread.sectionTitle, "섹션");
  const questionUrl = `https://eddmpython.com/admin/students/questions?thread=${encodeURIComponent(notification.threadId)}`;
  let result: QuestionNotification;
  try {
    const sent = await env.CLASSROOM_EMAIL!.send({
      from: { email: emailAddress(env.CLASSROOM_NOTIFY_FROM), name: "eddmpython 강의장" },
      to: emailAddress(env.CLASSROOM_NOTIFY_TO),
      subject: `[강의 질문] ${lessonTitle}`,
      text: ["강의장에 새 질문이 등록되었습니다.", "", `강의방: ${roomTitle}`, `학습자: ${ownerName}`, `수업: ${lessonTitle}`, `섹션: ${sectionTitle}`, "", "질문 확인 및 답변 (관리자 로그인 필요)", questionUrl, "", "질문 내용과 코드는 질문함에서 확인할 수 있습니다. 이 메일에 답장하면 강의장에 등록되지 않습니다."].join("\n"),
      html: `<h1>새 강의 질문</h1><p>강의장에 새 질문이 등록되었습니다.</p><dl><dt>강의방</dt><dd>${esc(roomTitle)}</dd><dt>학습자</dt><dd>${esc(ownerName)}</dd><dt>수업</dt><dd>${esc(lessonTitle)}</dd><dt>섹션</dt><dd>${esc(sectionTitle)}</dd></dl><p><a href="${esc(questionUrl)}">질문 확인 및 답변</a> (관리자 로그인 필요)</p><p>질문 내용과 코드는 질문함에서 확인할 수 있습니다. 이 메일에 답장하면 강의장에 등록되지 않습니다.</p>`,
      headers: { "Auto-Submitted": "auto-generated", "Content-Language": "ko" },
    });
    result = sent?.messageId ? { state: "sent" } : mailFailure(null);
  } catch (cause) {
    result = mailFailure(cause);
  }
  try {
    const finished = await call(env, { action: "notebookFinishNotification", roomId: input.roomId, messageId: input.messageId, attempt: notification.attempt, state: result.state, error: result.error ?? "" });
    if (finished.status !== 200) return { state: "unknown", error: "알림 결과를 저장하지 못했습니다. 이미 도착했을 수 있으니 받은편지함을 확인해 주세요" };
  } catch {
    return { state: "unknown", error: "알림 결과를 저장하지 못했습니다. 이미 도착했을 수 있으니 받은편지함을 확인해 주세요" };
  }
  return result;
}
