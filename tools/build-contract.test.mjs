import { test } from 'node:test'
import { readFileSync, existsSync } from 'node:fs'
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CLIENT_FILES, parseMode, resolveBuild, validateArtifact } from './build-contract.mjs'
import { EVIDENCE_INPUTS, evidenceProblems } from './audit-evidence.mjs'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('S10: source distribution includes build tools and all declared runtime modules', () => {
  const pkg=JSON.parse(readFileSync(join(root,'package.json'),'utf8'))
  assert.ok(pkg.files.includes('tools/*.mjs'))
  assert.ok(pkg.files.includes('src'))
  assert.ok(pkg.files.includes('build'))
  assert.ok(pkg.files.includes('client.js'))
  for(const file of [...CLIENT_FILES,'tools/build-client.mjs','tools/build-contract.mjs','tools/source-transforms.mjs']) assert.ok(existsSync(join(root,file)))
})

test('S1: modes are strict and legacy public is compatible', () => {
  assert.equal(parseMode([]), 'auto')
  assert.equal(parseMode(['--public']), 'public')
  assert.equal(parseMode(['--mode=local']), 'local')
  for (const args of [['--mode'], ['--mode', 'wat'], ['--mode='], ['--public', '--mode', 'local'], ['--mode=auto', '--mode=auto']]) assert.throws(() => parseMode(args))
  assert.equal(resolveBuild(root, ['--mode=public']).wallpaperManifest, 'build/wallpapers.json')
  assert.throws(() => resolveBuild(join(root, 'nonexistent-fixture'), ['--mode=local']), /missing/)
})

test('S1: artifact input and mode mismatch fail; no image-format inference', () => {
  const expected = resolveBuild(root, ['--mode=public'])
  const source = 'var MANIFEST = ' + JSON.stringify({ build: expected }) + '\n'
  assert.deepEqual(validateArtifact(source, expected), expected)
  assert.throws(() => validateArtifact(source, { ...expected, mode: 'local' }), /mismatch/)
  assert.throws(() => validateArtifact(source, { ...expected, wallpaperSha256: 'changed' }), /mismatch/)
  assert.throws(() => validateArtifact('data:image/webp;base64,old', expected), /mismatch/)
})

test('S1: release provenance rejects absent, stale, mismatched host or input', () => {
  const now = Date.parse('2026-10-20T00:00:00Z')
  const hashes = Object.fromEntries(EVIDENCE_INPUTS.map(p => [p, 'hash:' + p]))
  const record = { schema: 1, hostVersion: 'test-target', collectedAt: '2026-10-19T00:00:00Z', sha256: hashes }
  assert.deepEqual(evidenceProblems(record, hashes, 'test-target', now), [])
  assert.ok(evidenceProblems(null, hashes, 'test-target', now).length)
  assert.ok(evidenceProblems(record, hashes, null, now).length)
  assert.ok(evidenceProblems(record, hashes, 'other', now).length)
  assert.ok(evidenceProblems({...record, collectedAt:'2026-01-01'}, hashes, 'test-target', now).length)
  assert.ok(evidenceProblems(record, {...hashes, 'client.js':'changed'}, 'test-target', now).length)
})
