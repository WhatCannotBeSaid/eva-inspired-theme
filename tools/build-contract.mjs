import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

export const LOCAL_WALLPAPERS = 'out/wallpapers.local.json'
export const CLIENT_FILES = ['src/runtime/glass.js', 'src/runtime/pins.js', 'src/runtime/im.js', 'src/runtime/panels.js', 'src/client.js']
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')

export function parseMode(args = []) {
  const choices = []
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--public') choices.push('public')
    else if (args[i] === '--mode') choices.push(args[++i])
    else if (args[i].startsWith('--mode=')) choices.push(args[i].slice(7))
  }
  if (choices.length > 1 || choices.some(mode => !['auto', 'public', 'local'].includes(mode))) {
    throw Error('Use exactly one --mode auto|public|local (--public is a legacy alias).')
  }
  return choices[0] ?? 'auto'
}

export function resolveBuild(root, args = []) {
  const requested = parseMode(args)
  const local = existsSync(join(root, LOCAL_WALLPAPERS))
  const mode = requested === 'auto' ? (local ? 'local' : 'public') : requested
  if (mode === 'local' && !local) throw Error('Local wallpaper manifest is missing; refusing to fall back to public.')
  const wallpaperManifest = mode === 'local' ? LOCAL_WALLPAPERS : 'build/wallpapers.json'
  return { mode, wallpaperManifest, wallpaperSha256: sha256(readFileSync(join(root, wallpaperManifest))) }
}

export function validateArtifact(source, expected) {
  const match = /var MANIFEST = (\{[^\n]+\})\n/.exec(source)
  const actual = match ? JSON.parse(match[1]).build : null
  if (!actual || Object.keys(expected).some(key => actual[key] !== expected[key])) {
    throw Error(`Artifact mode/input mismatch: expected ${expected.mode}; rebuild with --mode ${expected.mode}.`)
  }
  return actual
}
