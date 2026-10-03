// Cards validator (spec §45–49). Dev-only; not deployed.
//
//   node scripts/validate-cards.js                      # data/cards.json vs latest data/history/*
//   node scripts/validate-cards.js data/cards.json      # same, explicit new file
//   node scripts/validate-cards.js <previous> <new>     # explicit previous
//
// Also checks docs/serbian-words.md Priority against the cards (§46). Exit code 1 on any error. Warnings never fail.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildOptions, normalize } from '../js/distractors.js'

const POS = ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'other']
const REQUIRED = ['id', 'word', 'sense', 'translation', 'pronunciation', 'partOfSpeech', 'priority', 'groups', 'distractors', 'examples']
const SENSE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const SOURCE_PRIORITY = /^(10|[1-9])$/

const nonEmpty = v => typeof v === 'string' && v.trim() !== ''
const identity = c => `${c.word} / ${c.sense}`
const hasDuplicates = arr => new Set(arr.map(normalize)).size !== arr.length
const validPriority = p => Number.isInteger(p) && p >= 1 && p <= 10

// Vocabulary source table rows → [{ srpski, meaning, priority, card }] (strings, as written).
export function parseSource(text) {
  return text.split('\n')
    .filter(l => l.startsWith('| ') && !l.startsWith('| Srpski'))
    .map(l => {
      const [, srpski, meaning, priority, card] = l.split('|').map(s => s.trim())
      return { srpski, meaning, priority, card }
    })
}

// history: [{ name, dataset }] — every archived dataset, for the id-reuse check.
// source: parseSource() rows — Priority format + source ↔ card priority (§46).
export function validate(dataset, { previous = null, history = [], source = null } = {}) {
  const errors = [], warnings = []
  const err = (where, msg) => errors.push(`${where}: ${msg}`)

  if (!dataset || typeof dataset !== 'object' || !Array.isArray(dataset.cards)) {
    return { errors: ['top level: expected { cards: [] }'], warnings }
  }

  const ids = new Set(), keys = new Set(), byWord = {}, byTranslation = {}
  const cards = dataset.cards

  for (const [i, c] of cards.entries()) {
    const at = c?.id ?? `cards[${i}]`
    const missing = REQUIRED.filter(f => c?.[f] === undefined)
    if (missing.length) { err(at, `missing ${missing.join(', ')}`); continue }

    if (ids.has(c.id)) err(at, 'duplicate id')
    ids.add(c.id)
    const key = `${normalize(c.word)}|${c.sense}`
    if (keys.has(key)) err(at, `duplicate word + sense ${identity(c)}`)
    keys.add(key)

    for (const f of ['word', 'translation', 'pronunciation']) if (!nonEmpty(c[f])) err(at, `empty ${f}`)
    if (!SENSE.test(c.sense)) err(at, `bad sense format "${c.sense}" (lowercase kebab-case)`)
    if (!POS.includes(c.partOfSpeech)) err(at, `bad partOfSpeech "${c.partOfSpeech}"`)
    // Removed 2026-10-03; history files may still carry it (only id/word/sense are read there).
    if ('difficulty' in c) err(at, 'contains deprecated field "difficulty"')
    if (!validPriority(c.priority)) err(at, `bad priority ${JSON.stringify(c.priority)} (integer 1–10)`)

    if (!Array.isArray(c.groups) || c.groups.length < 1 || c.groups.length > 3) err(at, 'groups must have 1–3 entries')
    else if (!c.groups.every(nonEmpty) || hasDuplicates(c.groups)) err(at, 'empty or duplicate groups')

    if (!Array.isArray(c.examples) || c.examples.length !== 3) err(at, 'examples must have exactly 3 entries')
    else if (!c.examples.every(e => nonEmpty(e?.sr) && nonEmpty(e?.ru))) err(at, 'every example needs sr and ru')

    for (const [lang, correct] of [['ru', c.translation], ['sr', c.word]]) {
      const d = c.distractors?.[lang]
      if (!Array.isArray(d) || d.length !== 3 || !d.every(nonEmpty)) { err(at, `distractors.${lang} must have exactly 3 non-empty entries`); continue }
      if (hasDuplicates(d)) err(at, `duplicate distractors.${lang}`)
      if (nonEmpty(correct) && d.some(x => normalize(x) === normalize(correct))) err(at, `distractors.${lang} contains the correct answer`)
    }

    ;(byWord[normalize(c.word)] ??= []).push(c.id)
    ;(byTranslation[normalize(c.translation)] ??= []).push(c.id)
  }

  for (const [t, list] of Object.entries(byTranslation)) if (list.length > 1) warnings.push(`same translation "${t}": ${list.join(', ')}`)
  for (const [w, list] of Object.entries(byWord)) if (list.length > 3) warnings.push(`word "${w}" has ${list.length} cards: ${list.join(', ')}`)

  // §49: simulate with the runtime algorithm. Only if the cards are structurally sound.
  if (!errors.length) {
    for (const c of cards) for (const dir of ['sr-ru', 'ru-sr']) {
      if (!buildOptions(c, cards, dir)) err(c.id, `cannot build 1 correct + 3 distractors for ${dir}`)
    }
  }

  const newById = new Map(cards.filter(Boolean).map(c => [c.id, c]))

  // §47: previous vs new.
  if (previous) {
    const newByKey = new Map([...newById.values()].map(c => [identity(c), c.id]))
    for (const old of previous.cards) {
      const now = newById.get(old.id)
      if (now && identity(now) !== identity(old)) err(old.id, `was ${identity(old)}, now ${identity(now)}`)
      const movedTo = newByKey.get(identity(old))
      if (movedTo && movedTo !== old.id) err(old.id, `${identity(old)} changed id to ${movedTo}`)
      if (!now && !movedTo) warnings.push(`removed ${old.id} ${identity(old)}`)
    }
  }

  // §47: ids from any history file must never point to a different word + sense.
  for (const { name, dataset: h } of history) {
    for (const old of h.cards ?? []) {
      const now = newById.get(old.id)
      if (now && identity(now) !== identity(old)) err(old.id, `reused: was ${identity(old)} in ${name}, now ${identity(now)}`)
    }
  }

  // §46: source Priority — 1–10 on non-skip rows, empty on skip rows, equal to the linked card's priority.
  for (const row of source ?? []) {
    const at = `source "${row.srpski} / ${row.meaning}"`
    if (row.card.startsWith('skip')) {
      if (row.priority) err(at, `skip row must have empty Priority, got "${row.priority}"`)
      continue
    }
    if (!SOURCE_PRIORITY.test(row.priority)) { err(at, `bad Priority "${row.priority}" (1–10)`); continue }
    if (!row.card) continue // pending
    const card = newById.get(row.card)
    if (!card) err(at, `linked ${row.card} not in cards`)
    else if (card.priority !== Number(row.priority)) err(row.card, `priority ${card.priority} ≠ source Priority ${row.priority}`)
  }

  return { errors, warnings }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function main(args) {
  const historyDir = 'data/history'
  const names = existsSync(historyDir) ? readdirSync(historyDir).filter(f => f.endsWith('.cards.json')).sort() : []
  const history = names.map(name => ({ name, dataset: readJson(join(historyDir, name)) }))

  const newPath = args.at(-1) ?? 'data/cards.json'
  const prevPath = args.length === 2 ? args[0] : names.length ? join(historyDir, names.at(-1)) : null

  let dataset
  try { dataset = readJson(newPath) } catch (e) { console.error(`✖ ${newPath}: invalid JSON — ${e.message}`); return 1 }
  const previous = prevPath ? readJson(prevPath) : null
  const sourcePath = 'docs/serbian-words.md'
  const source = existsSync(sourcePath) ? parseSource(readFileSync(sourcePath, 'utf8')) : null

  console.log(`Validating ${newPath}` + (prevPath ? ` against ${prevPath}` : ' (no previous dataset, identity checks skipped)')
    + (source ? ` and ${sourcePath}` : ''))
  const { errors, warnings } = validate(dataset, { previous, history, source })
  for (const w of warnings) console.log(`⚠ ${w}`)
  for (const e of errors) console.error(`✖ ${e}`)
  // §46: tier sizes are approximate — report only, never fail.
  const dist = {}
  for (const c of dataset.cards ?? []) dist[c?.priority] = (dist[c?.priority] ?? 0) + 1
  console.log('Priority distribution (cards): ' + Object.entries(dist).map(([p, n]) => `P${p} ${n}`).join(' · '))
  console.log(`${dataset.cards?.length ?? 0} cards, ${errors.length} errors, ${warnings.length} warnings`)
  return errors.length ? 1 : 0
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main(process.argv.slice(2))
