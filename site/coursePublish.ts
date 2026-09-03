import { parseCourseText } from "./course.ts";
import type { Env } from "./env.ts";

const GITHUB_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_DISCOVERY = `${GITHUB_ISSUER}/.well-known/openid-configuration`;
const TRUSTED_REPOSITORY = "eddmpython/eddmpython-course";
const TRUSTED_REPOSITORY_ID = "1339889488";
const TRUSTED_REF = "refs/heads/main";
const TRUSTED_WORKFLOW = `${TRUSTED_REPOSITORY}/.github/workflows/publishCourse.yml@${TRUSTED_REF}`;
const MAX_BUNDLE_BYTES = 10 * 1024 * 1024;
const CLOCK_SKEW_SECONDS = 30;

type GitHubClaims = {
  aud?: string | string[];
  event_name?: string;
  exp?: number;
  iat?: number;
  iss?: string;
  nbf?: number;
  ref?: string;
  repository?: string;
  repository_id?: string;
  repository_visibility?: string;
  runner_environment?: string;
  workflow_ref?: string;
};

type GitHubKey = JsonWebKey & { kid?: string; alg?: string; use?: string };

const textEncoder = new TextEncoder();

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-robots-tag": "noindex, nofollow",
    },
  });
}

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const decoded = atob(padded);
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
}

function decodeJson<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(value))) as T;
}

function hasAudience(audience: string | string[] | undefined, expected: string): boolean {
  return Array.isArray(audience) ? audience.includes(expected) : audience === expected;
}

function validClaims(claims: GitHubClaims, audience: string, nowSeconds: number): boolean {
  const validEvent = claims.event_name === "push" || claims.event_name === "workflow_dispatch";
  return (
    claims.iss === GITHUB_ISSUER &&
    hasAudience(claims.aud, audience) &&
    typeof claims.exp === "number" &&
    nowSeconds <= claims.exp + CLOCK_SKEW_SECONDS &&
    typeof claims.nbf === "number" &&
    nowSeconds + CLOCK_SKEW_SECONDS >= claims.nbf &&
    typeof claims.iat === "number" &&
    claims.iat <= nowSeconds + CLOCK_SKEW_SECONDS &&
    claims.exp - claims.iat <= 1200 &&
    claims.repository === TRUSTED_REPOSITORY &&
    String(claims.repository_id) === TRUSTED_REPOSITORY_ID &&
    claims.repository_visibility === "private" &&
    claims.ref === TRUSTED_REF &&
    claims.workflow_ref === TRUSTED_WORKFLOW &&
    claims.runner_environment === "github-hosted" &&
    validEvent
  );
}

export async function verifyGitHubOidc(
  token: string,
  audience: string,
  options: { fetcher?: typeof fetch; now?: number } = {},
): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) return false;

  let header: { alg?: string; kid?: string; typ?: string };
  let claims: GitHubClaims;
  try {
    header = decodeJson(parts[0]);
    claims = decodeJson(parts[1]);
  } catch {
    return false;
  }
  if (header.alg !== "RS256" || !header.kid || (header.typ && header.typ !== "JWT")) return false;

  const fetcher = options.fetcher ?? fetch;
  try {
    const discoveryResponse = await fetcher(GITHUB_DISCOVERY);
    if (!discoveryResponse.ok) return false;
    const discovery = await discoveryResponse.json() as { issuer?: string; jwks_uri?: string };
    if (discovery.issuer !== GITHUB_ISSUER || !discovery.jwks_uri) return false;
    const jwksUrl = new URL(discovery.jwks_uri);
    if (jwksUrl.protocol !== "https:" || jwksUrl.hostname !== "token.actions.githubusercontent.com") return false;

    const keysResponse = await fetcher(jwksUrl);
    if (!keysResponse.ok) return false;
    const keys = await keysResponse.json() as { keys?: GitHubKey[] };
    const key = keys.keys?.find((candidate) => (
      candidate.kid === header.kid &&
      candidate.kty === "RSA" &&
      (!candidate.alg || candidate.alg === "RS256") &&
      (!candidate.use || candidate.use === "sig")
    ));
    if (!key) return false;

    const publicKey = await crypto.subtle.importKey(
      "jwk",
      key,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const verified = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      decodeBase64Url(parts[2]).buffer as ArrayBuffer,
      textEncoder.encode(`${parts[0]}.${parts[1]}`),
    );
    if (!verified) return false;
  } catch {
    return false;
  }

  return validClaims(claims, audience, Math.floor((options.now ?? Date.now()) / 1000));
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function validCourseBundle(raw: string): { categories: number; posts: number } | null {
  let source: {
    schema?: unknown;
    glossary?: unknown;
    categories?: Array<{ slug?: unknown; posts?: Array<{ id?: unknown; scenes?: unknown[] }> }>;
  };
  try {
    source = JSON.parse(raw) as typeof source;
  } catch {
    return null;
  }
  if (source.schema !== 4 || !Array.isArray(source.categories) || !source.categories.length) return null;
  if (source.glossary !== undefined && (
    !source.glossary ||
    typeof source.glossary !== "object" ||
    Array.isArray(source.glossary) ||
    Object.entries(source.glossary).some(([term, def]) => !term || typeof def !== "string" || !def)
  )) return null;

  const parsed = parseCourseText(raw);
  if (!parsed.ok || parsed.categories.length !== source.categories.length) return null;
  const slugs = new Set<string>();
  let posts = 0;
  for (const category of source.categories) {
    if (typeof category.slug !== "string" || slugs.has(category.slug) || !Array.isArray(category.posts)) return null;
    slugs.add(category.slug);
    const parsedCategory = parsed.categories.find((candidate) => candidate.slug === category.slug);
    if (!parsedCategory || parsedCategory.posts.length !== category.posts.length) return null;
    const postIds = new Set<string>();
    for (const post of category.posts) {
      if (typeof post.id !== "string" || postIds.has(post.id)) return null;
      postIds.add(post.id);
      const parsedPost = parsedCategory.posts.find((candidate) => candidate.id === post.id);
      if (!parsedPost) return null;
      if (Array.isArray(post.scenes) && parsedPost.scenes?.length !== post.scenes.length) return null;
    }
    posts += category.posts.length;
  }
  return { categories: source.categories.length, posts };
}

async function authorized(
  request: Request,
  options: { fetcher?: typeof fetch; now?: number } = {},
): Promise<boolean> {
  const match = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;
  const url = new URL(request.url);
  return verifyGitHubOidc(match[1], `${url.origin}${url.pathname}`, options);
}

export async function handleCoursePublish(
  request: Request,
  env: Env,
  options: { fetcher?: typeof fetch; now?: number } = {},
): Promise<Response> {
  if (!(await authorized(request, options))) return jsonResponse({ error: "unauthorized" }, 401);
  if (request.method === "GET") {
    const [raw, version] = await Promise.all([env.COURSE.get("bundle"), env.COURSE.get("version")]);
    return jsonResponse({ hash: raw ? await sha256(raw) : "", version: version ?? "" });
  }
  if (request.method !== "POST") return jsonResponse({ error: "method not allowed" }, 405);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return jsonResponse({ error: "application/json required" }, 415);
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BUNDLE_BYTES) return jsonResponse({ error: "bundle too large" }, 413);

  const raw = await request.text();
  if (!raw || textEncoder.encode(raw).byteLength > MAX_BUNDLE_BYTES) {
    return jsonResponse({ error: "bundle too large" }, 413);
  }
  const expectedHash = request.headers.get("x-course-sha256") ?? "";
  const hash = await sha256(raw);
  if (!/^[0-9a-f]{64}$/.test(expectedHash) || hash !== expectedHash) {
    return jsonResponse({ error: "bundle hash mismatch" }, 400);
  }
  const summary = validCourseBundle(raw);
  if (!summary) return jsonResponse({ error: "invalid course bundle" }, 400);

  const version = hash.slice(0, 16);
  await env.COURSE.put("bundle", raw);
  await env.COURSE.put("version", version);
  return jsonResponse({ ok: true, hash, version, ...summary });
}
