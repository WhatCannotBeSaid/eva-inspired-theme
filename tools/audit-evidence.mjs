import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { sha256 } from './build-contract.mjs'

// A collector must record these hashes when it captures the official host data.
// This module never stamps old dumps with a new collection date.
export const EVIDENCE_INPUTS = ['src/tokens.json', 'src/theme.css', 'client.js',
  'out/s2-token-baseline.json', 'out/s2-refcount.json', 'out/cssom-refs.json']

export function evidenceProblems(record, hashes, hostVersion, now = Date.now()) {
  const errors = []
  if (!record || record.schema !== 1) return ['missing evidence manifest (schema 1)']
  if (!hostVersion || record.hostVersion !== hostVersion) errors.push('host version missing or mismatched')
  const collected = Date.parse(record.collectedAt)
  if (!Number.isFinite(collected) || collected > now || now - collected > 30 * 86400000) errors.push('collection date missing, future or older than 30 days')
  for (const path of EVIDENCE_INPUTS) {
    if (!hashes[path] || record.sha256?.[path] !== hashes[path]) errors.push(`missing or stale hash: ${path}`)
  }
  return errors
}

export function inspectEvidence(root, hostVersion) {
  const file = join(root, 'out/audit-evidence.json')
  let record = null
  try { if (existsSync(file)) record = JSON.parse(readFileSync(file, 'utf8')) } catch { /* report unverified */ }
  const hashes = Object.fromEntries(EVIDENCE_INPUTS.map(path => {
    const file = join(root, path)
    return [path, existsSync(file) ? sha256(readFileSync(file)) : null]
  }))
  return { record, problems: evidenceProblems(record, hashes, hostVersion) }
}
