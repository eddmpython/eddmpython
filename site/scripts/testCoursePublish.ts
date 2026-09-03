import assert from "node:assert/strict";

import { handleCoursePublish, verifyGitHubOidc } from "../coursePublish.ts";
import type { Env } from "../env.ts";

const issuer = "https://token.actions.githubusercontent.com";
const audience = "https://eddmpython.com/admin/course-publish";
const now = 1_788_500_000;
const encoder = new TextEncoder();

const keys = await crypto.subtle.generateKey(
  {
    name: "RSASSA-PKCS1-v1_5",
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
  },
  true,
  ["sign", "verify"],
);
const publicKey = await crypto.subtle.exportKey("jwk", keys.publicKey);
Object.assign(publicKey, { kid: "test-key", alg: "RS256", use: "sig" });

function base64Url(value: Uint8Array | string): string {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  return Buffer.from(bytes).toString("base64url");
}

async function token(overrides: Record<string, unknown> = {}): Promise<string> {
  const head = base64Url(JSON.stringify({ alg: "RS256", kid: "test-key", typ: "JWT" }));
  const claims = base64Url(JSON.stringify({
    iss: issuer,
    aud: audience,
    exp: now + 300,
    nbf: now - 10,
    iat: now - 10,
    repository: "eddmpython/eddmpython-course",
    repository_id: "1339889488",
    repository_visibility: "private",
    ref: "refs/heads/main",
    workflow_ref: "eddmpython/eddmpython-course/.github/workflows/publishCourse.yml@refs/heads/main",
    runner_environment: "github-hosted",
    event_name: "push",
    ...overrides,
  }));
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    keys.privateKey,
    encoder.encode(`${head}.${claims}`),
  );
  return `${head}.${claims}.${base64Url(new Uint8Array(signature))}`;
}

const fetcher = async (input: string | URL | Request): Promise<Response> => {
  const url = String(input);
  if (url.endsWith("/.well-known/openid-configuration")) {
    return Response.json({ issuer, jwks_uri: `${issuer}/.well-known/jwks` });
  }
  if (url.endsWith("/.well-known/jwks")) return Response.json({ keys: [publicKey] });
  return new Response("not found", { status: 404 });
};

assert.equal(await verifyGitHubOidc(await token(), audience, { fetcher, now: now * 1000 }), true);
assert.equal(
  await verifyGitHubOidc(await token({ ref: "refs/heads/preview" }), audience, { fetcher, now: now * 1000 }),
  false,
);
assert.equal(
  await verifyGitHubOidc(await token({ repository_id: "1" }), audience, { fetcher, now: now * 1000 }),
  false,
);

const values = new Map<string, string>();
const env = {
  COURSE: {
    get: async (key: string) => values.get(key) ?? null,
    put: async (key: string, value: string) => { values.set(key, value); },
  },
} as unknown as Env;
const bundle = JSON.stringify({
  schema: 4,
  sceneContract: 12,
  glossary: {},
  categories: [{
    slug: "00-course-guide",
    order: 0,
    displayNumber: "00",
    title: "과정 안내",
    goal: "과정의 길을 안다",
    cells: {},
    posts: [{ id: "01-course-map", title: "과정 지도", summary: "", body: "# 과정 지도", scenes: [] }],
  }],
});
const digest = await crypto.subtle.digest("SHA-256", encoder.encode(bundle));
const hash = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
const auth = `Bearer ${await token()}`;
const posted = await handleCoursePublish(new Request(audience, {
  method: "POST",
  headers: { authorization: auth, "content-type": "application/json", "x-course-sha256": hash },
  body: bundle,
}), env, { fetcher, now: now * 1000 });
assert.equal(posted.status, 200);
assert.equal(values.get("bundle"), bundle);
assert.equal(values.get("version"), hash.slice(0, 16));

const checked = await handleCoursePublish(new Request(audience, {
  headers: { authorization: auth },
}), env, { fetcher, now: now * 1000 });
assert.equal(checked.status, 200);
assert.deepEqual(await checked.json(), { hash, version: hash.slice(0, 16) });

const rejected = await handleCoursePublish(new Request(audience, {
  method: "POST",
  headers: { authorization: auth, "content-type": "application/json", "x-course-sha256": "0".repeat(64) },
  body: bundle,
}), env, { fetcher, now: now * 1000 });
assert.equal(rejected.status, 400);

console.log("course publish: GitHub OIDC와 묶음 발행 계약 통과");
