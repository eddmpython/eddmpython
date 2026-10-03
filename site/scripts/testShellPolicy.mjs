import assert from 'node:assert/strict';
import { build } from 'esbuild';

const result = await build({ entryPoints: ['shell.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const { page } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const options = { title: 'test', style: '', inner: '' };
const policy = cells => page({ ...options, cells }).headers.get('content-security-policy');
const directive = (value, name) => value.split('; ').find(part => part.startsWith(name + ' '));
const enabled = policy(true);
const disabled = policy(false);
assert.equal(directive(enabled, 'connect-src'), "connect-src 'self' https://cdn.jsdelivr.net https://pypi.org https://files.pythonhosted.org");
assert.equal(directive(disabled, 'connect-src'), "connect-src 'self'");
assert.ok(!directive(enabled, 'script-src').includes('pypi.org'));
assert.ok(!directive(enabled, 'script-src').includes('pythonhosted.org'));
assert.ok(directive(enabled, 'script-src').includes("'wasm-unsafe-eval'"));
assert.ok(!disabled.includes('wasm-unsafe-eval'));
assert.equal(directive(enabled, 'default-src'), "default-src 'self'");
assert.equal(directive(enabled, 'form-action'), "form-action 'self'");
console.log('실행 칸의 Python 패키지 연결과 일반 화면의 제한 확인');
