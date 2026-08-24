/**
 * 비밀번호와 세션의 원시 함수.
 *
 * 강의방에 들어오는 수강생과 운영장에 들어오는 운영자가 **같은 기계**를 쓴다. 한쪽만
 * 튼튼하게 만들면 약한 쪽이 전체의 세기가 된다. 운영장은 방을 지울 수 있으므로 오히려
 * 더 센 쪽이어야 한다.
 *
 * 여기에 화면도 저장소도 없다. 그래서 운영장과 강의방 어느 쪽에도 딸리지 않는다.
 */

const enc = new TextEncoder();

/** 한 번 들어오면 12시간 산다. 하루 강의를 넘기지 않는다. */
export const SESSION_TTL_SEC = 60 * 60 * 12;
/** 여덟 번 틀리면 잠근다. 공개 주소에 짧은 비밀번호가 걸려 있다. */
export const MAX_FAILS = 8;
/** 잠기는 시간. 강의 중의 5분은 길지만 두드리는 것을 막는 값이다. */
export const LOCK_MS = 5 * 60 * 1000;

export function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomHex(bytes: number): string {
  return hex(crypto.getRandomValues(new Uint8Array(bytes)).buffer);
}

export async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

/**
 * 비밀번호는 짧다. 그대로 해시하면 금방 뒤집히므로 반복해서 늘린다.
 *
 * 반복은 10만 회다. **Cloudflare Workers 가 PBKDF2 반복을 10만 회로 막는다.** 12만 회를
 * 요청했더니 로컬 miniflare 는 통과하고 배포된 Worker 만 NotSupportedError 로 던졌다.
 * 로그를 잡기 전까지 방 만들기와 로그인이 프로덕션에서만 500 이었다. 이 상한을 넘기지 않는다.
 */
export const PBKDF2_ITERATIONS = 100000;

export async function stretch(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return hex(bits);
}

/** 길이가 같으면 전부 비교한다. 타이밍으로 비밀번호를 재는 것을 막는다. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* 세션 ------------------------------------------------------------------ */

/**
 * 세션 토큰 하나를 만든다.
 *
 * `subject` 는 이 토큰이 어디에 쓰이는지다. 방이면 방 이름, 운영장이면 `admin` 이다.
 * `gen` 은 **세대**다. 비밀번호를 바꾸거나 방을 지웠다 다시 만들면 세대가 바뀌고 앞의
 * 토큰이 전부 죽는다. 비밀번호를 바꾸는 이유는 그것이 샜기 때문인데, 세대를 안 보면
 * 이미 들어와 있는 사람은 12시간을 그대로 남는다.
 */
export function issueToken(key: string, subject: string, gen: string): Promise<string> {
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
  const payload = `${subject}.${gen}.${expires}`;
  return hmac(key, payload).then((sig) => `${payload}.${sig}`);
}

export async function checkToken(
  key: string,
  token: string | null,
  subject: string,
  gen: string,
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 4) return false;
  const [got, tokenGen, expiresRaw, sig] = parts;
  if (got !== subject) return false;
  if (!gen || tokenGen !== gen) return false;
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires * 1000 < Date.now()) return false;
  return safeEqual(sig, await hmac(key, `${got}.${tokenGen}.${expiresRaw}`));
}

export function readCookie(request: Request, name: string): string | null {
  const raw = request.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k.trim() === name) return v.join("=");
  }
  return null;
}

/**
 * 쿠키를 발급한다.
 *
 * `path` 를 좁게 잡는다. 강의방 쿠키가 운영장으로 따라가거나 그 반대가 되면 안 된다.
 * `SameSite=Lax` 라 남의 페이지가 보낸 POST 에는 이 쿠키가 실리지 않는다. 운영장의
 * 조종은 전부 POST 이므로 이것만으로 남의 페이지가 부추기는 요청이 막힌다.
 */
export function cookie(name: string, token: string, path: string, url: URL): string {
  const secure = url.protocol === "https:" ? " Secure;" : "";
  return `${name}=${token}; Path=${path}; HttpOnly;${secure} SameSite=Lax; Max-Age=${SESSION_TTL_SEC}`;
}

export function clearCookie(name: string, path: string, url: URL): string {
  const secure = url.protocol === "https:" ? " Secure;" : "";
  return `${name}=; Path=${path}; HttpOnly;${secure} SameSite=Lax; Max-Age=0`;
}
