#!/usr/bin/env node
/**
 * Test harness for tools/testing/lint-adapter-model-ids.sh.
 *
 * Exercises the lint with synthetic adapter-config.ts fixtures covering:
 *   - all-pass (valid prefixes, unaffected providers)
 *   - plain violation (blocks commit with exit 1)
 *   - legacy exemption (warns, exits 0)
 *   - mixed exempted + real violation (still blocks, exemption still warns)
 *
 * Runs via plain `node` — no jest/vitest dependency, so it stays executable
 * even if the main jest config ignores unit_test/100 (it does by default).
 *
 * Run:  node apps/superadmin/unit_test/100/lint-adapter-model-ids.test.js
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '../../../..');
const LINT_SCRIPT = path.join(PROJECT_ROOT, 'tools/testing/lint-adapter-model-ids.sh');

function runLint(fixturePath) {
  const result = spawnSync('bash', [LINT_SCRIPT, fixturePath], {
    encoding: 'utf8',
  });
  return {
    exit: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function writeFixture(tmpdir, name, entries) {
  const filePath = path.join(tmpdir, name);
  const body = `export const ADAPTER_CONFIG_ITEMS: AdapterConfigItem[] = [\n${entries
    .map(
      (e) => `  {
    id: '${e.id}',
    provider: '${e.provider}',
    model: '${e.model}',
  },`,
    )
    .join('\n')}\n];\n`;
  fs.writeFileSync(filePath, body, 'utf8');
  return filePath;
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

function assert(cond, message) {
  if (!cond) throw new Error(`assertion failed: ${message}`);
}

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'lint-adapter-'));

test('all valid rows exit 0 and print OK', () => {
  const fixture = writeFixture(tmpRoot, 'all-valid.ts', [
    { id: 'claude-opus-4-7', provider: 'claude', model: 'claude-opus-4-7' },
    { id: 'opencode-minimax-m2-5', provider: 'opencode', model: 'openrouter/minimax/minimax-m2.5' },
    { id: 'kilo-minimax-m2-5', provider: 'kilo', model: 'openrouter/minimax/minimax-m2.5' },
    { id: 'opencode-native', provider: 'opencode', model: 'opencode/grok-code' },
  ]);
  const { exit, stdout, stderr } = runLint(fixture);
  assert(exit === 0, `expected exit 0, got ${exit}. stderr=${stderr}`);
  assert(stdout.includes('adapter entries OK'), `expected OK banner, got stdout=${stdout}`);
  assert(!stderr.includes('violation(s)'), `unexpected violation banner: ${stderr}`);
});

test('bare vendor id on opencode provider fails with exit 1', () => {
  const fixture = writeFixture(tmpRoot, 'opencode-no-prefix.ts', [
    { id: 'opencode-bad', provider: 'opencode', model: 'moonshotai/kimi-k2.5' },
  ]);
  const { exit, stderr } = runLint(fixture);
  assert(exit === 1, `expected exit 1, got ${exit}`);
  assert(stderr.includes('opencode-bad'), `expected id in stderr, got ${stderr}`);
  assert(stderr.includes('must start with'), `expected fix hint, got ${stderr}`);
});

test('bare vendor id on kilo provider fails with exit 1', () => {
  const fixture = writeFixture(tmpRoot, 'kilo-no-prefix.ts', [
    { id: 'kilo-bad', provider: 'kilo', model: 'qwen/qwen3.6-plus' },
  ]);
  const { exit, stderr } = runLint(fixture);
  assert(exit === 1, `expected exit 1, got ${exit}`);
  assert(stderr.includes('kilo-bad'), `expected id in stderr, got ${stderr}`);
});

test('claude/codex/gemini providers are not constrained', () => {
  const fixture = writeFixture(tmpRoot, 'other-providers.ts', [
    { id: 'codex-gpt-5-3', provider: 'codex', model: 'gpt-5.3-codex' },
    { id: 'gemini-3-1', provider: 'gemini', model: 'gemini-3.1-pro-preview' },
    { id: 'claude-opus-4-7', provider: 'claude', model: 'claude-opus-4-7' },
  ]);
  const { exit, stdout } = runLint(fixture);
  assert(exit === 0, `expected exit 0, got ${exit}`);
  assert(stdout.includes('adapter entries OK'));
});

test('legacy-exempted id warns but exits 0', () => {
  const fixture = writeFixture(tmpRoot, 'legacy-exempt.ts', [
    { id: 'claude-opus-4-7', provider: 'claude', model: 'claude-opus-4-7' },
    { id: 'opencode-kimi-k2-5', provider: 'opencode', model: 'moonshotai/kimi-k2.5' },
  ]);
  const { exit, stdout, stderr } = runLint(fixture);
  assert(exit === 0, `expected exit 0 for legacy exemption, got ${exit}. stderr=${stderr}`);
  assert(
    stderr.includes('legacy exemption'),
    `expected exemption warning, got stderr=${stderr}`,
  );
  assert(stderr.includes('opencode-kimi-k2-5'));
  assert(stdout.includes('adapter entries OK'));
});

test('new violation still blocks even when exempted rows present', () => {
  const fixture = writeFixture(tmpRoot, 'mixed.ts', [
    { id: 'opencode-kimi-k2-5', provider: 'opencode', model: 'moonshotai/kimi-k2.5' },
    { id: 'opencode-newbad', provider: 'opencode', model: 'vendor/something' },
  ]);
  const { exit, stderr } = runLint(fixture);
  assert(exit === 1, `expected exit 1 when a non-exempt violation exists, got ${exit}`);
  assert(stderr.includes('opencode-newbad'), `expected new violation reported: ${stderr}`);
  assert(stderr.includes('legacy exemption'), `expected exemption warning still printed: ${stderr}`);
});

let failed = 0;
for (const t of tests) {
  try {
    t.fn();
    console.log(`  ✓ ${t.name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${t.name}`);
    console.error(`    ${err.message}`);
  }
}

fs.rmSync(tmpRoot, { recursive: true, force: true });

console.log('');
if (failed > 0) {
  console.error(`${failed}/${tests.length} test(s) failed`);
  process.exit(1);
}
console.log(`${tests.length}/${tests.length} tests passed`);
process.exit(0);
