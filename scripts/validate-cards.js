// Cards validator (spec §45–49). Dev-only; not deployed.
//
//   node scripts/validate-cards.js                      # data/cards.json vs latest data/history/*
//   node scripts/validate-cards.js data/cards.json      # same, explicit new file
//   node scripts/validate-cards.js <previous> <new>     # explicit previous
//
// Exit code 1 on any error. Warnings never fail.

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildOptions, normalize } from '../js/distractors.js'

const POS = ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'conjunction', 'other']
const REQUIRED = ['id', 'word', 'sense', 'translation', 'pronunciation', 'partOfSpeech', 'difficulty', 'groups', 'distractors', 'examples']
const SENSE = /^[a-z0-9]+(-[a-z0-9]+)*$/

const nonEmpty = v => typeof v === 'string' && v.trim() !== ''
const identity = c => `${c.word} / ${c.sense}`
const hasDuplicates = arr => new Set(arr.map(normalize)).size !== arr.length

// history: [{ name, dataset }] — every archived dataset, for the id-reuse check.
export function validate(dataset, { previous = null, history = [] } = {}) {
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
    if (![1, 2, 3].includes(c.difficulty)) err(at, `bad difficulty ${c.difficulty}`)

    if (!Array.isArray(c.groups) || c.groups.length < 1 || c.groups.length > 3) err(at, 'groups must have 1–3 entries')
    else if (!c.groups.every(nonEmpty) || hasDuplicates(c.groups)) err(at, 'empty or duplicate groups')

    if (!Array.isArray(c.examples) || c.examples.length < 1 || c.examples.length > 3) err(at, 'examples must have 1–3 entries')
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

  console.log(`Validating ${newPath}` + (prevPath ? ` against ${prevPath}` : ' (no previous dataset, identity checks skipped)'))
  const { errors, warnings } = validate(dataset, { previous, history })
  for (const w of warnings) console.log(`⚠ ${w}`)
  for (const e of errors) console.error(`✖ ${e}`)
  console.log(`${dataset.cards?.length ?? 0} cards, ${errors.length} errors, ${warnings.length} warnings`)
  return errors.length ? 1 : 0
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main(process.argv.slice(2))
