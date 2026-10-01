// 기존 Durable Object 소유자의 Classroom 구현만 교체한다. 공개 사이트 코드와 설정은 보존한다.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import ts from 'typescript';
import { executionRoot } from './executionWorkspace.mjs';

async function credential() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  const candidates = [
    join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), '.wrangler', 'config', 'default.toml'),
    join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'xdg.config', '.wrangler', 'config', 'default.toml'),
    join(homedir(), '.wrangler', 'config', 'default.toml'),
  ];
  for (const path of candidates) {
    try { const found = (await readFile(path, 'utf8')).match(/oauth_token\s*=\s*"([^"]+)"/); if (found) return found[1]; } catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  throw new Error('Wrangler 로그인 또는 CLOUDFLARE_API_TOKEN이 필요합니다');
}
const token = await credential();
async function api(path, init = {}) {
  const response = await fetch('https://api.cloudflare.com/client/v4' + path, { ...init, headers: { Authorization: 'Bearer ' + token, ...init.headers }, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`저장소 배포 API 실패: HTTP ${response.status} ${await response.text()}`);
  return response;
}
const config = JSON.parse(await readFile(new URL('../wrangler.classroom.jsonc', import.meta.url), 'utf8'));
const owner = config.durable_objects.bindings.find(b => b.name === 'CLASSROOM').script_name;
let account = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!account) { const accounts = (await (await api('/accounts')).json()).result; assert.equal(accounts.length, 1, '계정이 여러 개면 CLOUDFLARE_ACCOUNT_ID를 지정하세요'); account = accounts[0].id; }
const root = `/accounts/${account}/workers/scripts/${owner}`;
const settings = async () => {
  const value = (await (await api(root + '/settings')).json()).result;
  // 내용 교체 API가 기록하는 배포 방식은 운영 설정이 아니다.
  if (value.annotations) delete value.annotations['workers/triggered_by'];
  return value;
};
const getContent = async () => {
  const response = await api(root + '/content/v2');
  return { entry: response.headers.get('cf-entrypoint'), form: await response.formData() };
};
const before = await getContent();
const part = before.form.get(before.entry);
assert.ok(part && typeof part !== 'string', '현재 운영 모듈을 확인할 수 없습니다');
const source = await part.text();
const tree = ts.createSourceFile(before.entry, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
const declarations = tree.statements.filter(ts.isVariableStatement).flatMap(s => s.declarationList.declarations).filter(d => ts.isIdentifier(d.name) && d.name.text === 'Classroom');
assert.equal(declarations.length, 1, 'Classroom 선언이 하나여야 합니다');
const initializer = declarations[0].initializer;
assert.ok(initializer, 'Classroom 구현이 없습니다');
assert.match(source, /export\s*\{[^}]*\bClassroom\b/, '기존 Classroom 내보내기를 보존해야 합니다');
const compiled = await build({ entryPoints: [fileURLToPath(new URL('../rooms.ts', import.meta.url))], bundle: true, format: 'iife', globalName: 'roomStore', platform: 'browser', write: false, logLevel: 'silent', minify: false });
const replacement = `(() => {\n${compiled.outputFiles[0].text}\nreturn roomStore.Classroom;\n})()`;
const next = source.slice(0, initializer.getStart(tree)) + replacement + source.slice(initializer.end);
if (source === next) { console.log('Classroom 저장소: 운영 구현과 동일합니다'); process.exit(0); }
const savedSettings = await settings();
const dir = join(executionRoot(), 'roomStore'); await mkdir(dir, { recursive: true });
await writeFile(join(dir, 'previous.js'), source);
await writeFile(join(dir, 'next.js'), next);
// 다른 작업의 배포를 조용히 덮지 않는다.
const latest = await getContent();
assert.equal(await latest.form.get(latest.entry).text(), source, '확인 중 운영 코드가 바뀌었습니다. 다시 실행하세요');
const upload = new FormData();
upload.set('metadata', JSON.stringify({ main_module: before.entry }));
for (const [name, value] of before.form) {
  if (name === 'metadata') continue;
  if (typeof value === 'string') upload.set(name, value);
  else upload.set(name, name === before.entry ? new File([next], name, { type: value.type }) : value, name);
}
// 이 API는 설정, 바인딩, 사이트 자산을 갱신하지 않는다.
await api(root + '/content', { method: 'PUT', body: upload });
const after = await getContent();
assert.equal(await after.form.get(after.entry).text(), next, '저장소 코드 되읽기가 다릅니다');
assert.deepEqual(await settings(), savedSettings, '운영 설정 보존 확인이 필요합니다');
console.log('Classroom 저장소: 새 구현 반영, 다른 코드·설정 보존 확인');
