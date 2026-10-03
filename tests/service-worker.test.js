// The precache list is maintained by hand; a missing file breaks offline mode silently.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, existsSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const sw = readFileSync(new URL('service-worker.js', root), 'utf8')
const shell = [...sw.match(/const SHELL = \[([\s\S]*?)\]/)[1].matchAll(/'([^']+)'/g)].map(m => m[1])

test('every precached file exists', () => {
  for (const f of shell.filter(f => f !== './')) assert.ok(existsSync(new URL(f, root)), f)
})

test('every runtime js/font/icon file is precached', () => {
  const runtime = ['js', 'fonts', 'icons'].flatMap(dir =>
    readdirSync(new URL(`${dir}/`, root)).filter(f => !f.endsWith('.txt')).map(f => `${dir}/${f}`))
  for (const f of runtime) assert.ok(shell.includes(f), `${f} missing from SHELL`)
})

test('version.txt is empty in the repo (only the Pages workflow stamps it)', () => {
  assert.equal(readFileSync(new URL('version.txt', root), 'utf8').trim(), '')
})
