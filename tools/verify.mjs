import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolveBuild } from './build-contract.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const build = resolveBuild(root, args)
const mode = ['--mode', build.mode]
const audit = [...mode]
if (args.includes('--strict-evidence')) audit.push('--strict-evidence')
const host = args.indexOf('--host-version')
if (host >= 0) {
  if (!args[host + 1] || args[host + 1].startsWith('--')) throw Error('--host-version requires an exact target version')
  audit.push('--host-version', args[host + 1])
}
console.log(`VERIFY mode=${build.mode}; source=${build.wallpaperManifest}`)
for (const argv of [
  ['--check', 'index.js'], ['--check', 'client.js'],
  ['--test', 'tools/runtime.test.mjs', 'tools/build-contract.test.mjs'],
  ['tools/selfcheck.mjs', ...mode], ['tools/token-audit.mjs', ...audit],
  ['tools/build-client.mjs', '--check', ...mode],
]) {
  const child = spawnSync(process.execPath, argv, { cwd: root, stdio: 'inherit' })
  if (child.error) throw child.error
  if (child.status !== 0) process.exit(child.status ?? 1)
}
