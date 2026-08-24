/**
 * 검수 스크립트가 운영장을 조종하는 통로.
 *
 * 운영장은 사람이 브라우저로 들어오는 곳이다. 검수 스크립트도 **같은 문으로** 들어온다.
 * 기계용 문을 따로 내면 인증이 둘이 되고, 둘 중 약한 쪽이 전체의 세기가 된다. 예전에는
 * Bearer 토큰을 받는 문이 따로 있었고 그 토큰이 노트북의 평문 JSON 에 있었다.
 *
 * 비밀번호는 배포 비밀값과 같은 이름으로 `site/.dev.vars` 에 두거나 환경 변수로 준다.
 * `.dev.vars` 는 추적하지 않는다.
 */
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const COOKIE = "eddm_admin";

export async function adminPassword() {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  let text = "";
  try {
    text = await readFile(join(SITE, ".dev.vars"), "utf8");
  } catch {
    /* 없으면 아래에서 안내하고 멈춘다 */
  }
  for (const line of text.split(/\r?\n/)) {
    const at = line.indexOf("=");
    if (at > 0 && line.slice(0, at).trim() === "ADMIN_PASSWORD") return line.slice(at + 1).trim();
  }
  throw new Error(
    "운영자 비밀번호가 없다. site/.dev.vars 에 ADMIN_PASSWORD 를 적거나 환경 변수로 준다",
  );
}

/**
 * 운영장에 들어가 조종 함수를 돌려준다.
 *
 * 로그인은 303 으로 끝나고 쿠키를 준다. `redirect: "manual"` 이 없으면 fetch 가 따라가면서
 * 그 응답을 삼켜 쿠키를 못 본다.
 */
export async function signIn(base) {
  const password = await adminPassword();
  const res = await fetch(`${base}/admin/login`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ password }).toString(),
    redirect: "manual",
  });
  const token = (res.headers.get("set-cookie") ?? "").split(";")[0];
  if (res.status !== 303 || !token.startsWith(`${COOKIE}=`) || token === `${COOKIE}=`) {
    throw new Error(
      `운영장 로그인 실패 (${res.status}). ADMIN_PASSWORD 가 그 서버의 배포 비밀값과 같은지 본다`,
    );
  }

  return async function drive(body) {
    const r = await fetch(`${base}/admin/api`, {
      method: "POST",
      headers: { "content-type": "application/json", cookie: token },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`운영장 ${body.action} 실패 (${r.status}): ${JSON.stringify(data)}`);
    return data;
  };
}
