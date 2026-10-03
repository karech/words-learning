import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validate, parseSource } from '../scripts/validate-cards.js'

// Runs against the live dataset; assertions must not depend on its specific words.
const seed = JSON.parse(readFileSync(new URL('../data/cards.json', import.meta.url), 'utf8'))
const clone = x => structuredClone(x)
const identity = c => `${c.word} / ${c.sense}`
const [c0, c1] = seed.cards

// Mutate one card of a seed copy, expect an error mentioning `match`.
function failsWith(match, mutate) {
  const d = clone(seed)
  mutate(d.cards[0], d)
  const { errors } = validate(d)
  assert.ok(errors.some(e => e.includes(match)), `expected "${match}", got ${JSON.stringify(errors)}`)
}

test('data/cards.json is valid', () => {
  assert.deepEqual(validate(seed).errors, [])
})

test('warns on duplicated normalized translation', () => {
  const d = clone(seed)
  d.cards[1].translation = ` ${d.cards[0].translation.toUpperCase()} `
  assert.ok(validate(d).warnings.some(w => w.includes(`${c0.id}, ${c1.id}`)))
})

test('structure', () => {
  assert.deepEqual(validate({}).errors, ['top level: expected { cards: [] }'])
})

test('per-card field rules', () => {
  failsWith('missing pronunciation', c => { delete c.pronunciation })
  failsWith('empty translation', c => { c.translation = ' ' })
  failsWith('bad sense', c => { c.sense = 'Store place' })
  failsWith('bad partOfSpeech', c => { c.partOfSpeech = 'place-noun' })
  failsWith('bad difficulty', c => { c.difficulty = 4 })
  failsWith('groups must have 1–3', c => { c.groups = [] })
  failsWith('groups must have 1–3', c => { c.groups = ['a', 'b', 'c', 'd'] })
  failsWith('duplicate groups', c => { c.groups = ['food', 'Food'] })
  failsWith('examples must have exactly 3', c => { c.examples = [] })
  failsWith('examples must have exactly 3', c => { c.examples = c.examples.slice(0, 2) })
  failsWith('sr and ru', c => { c.examples = [{ sr: 'x' }, { sr: 'y', ru: 'у' }, { sr: 'z', ru: 'з' }] })
  for (const p of [0, 11, 1.5, '1', null]) failsWith('bad priority', c => { c.priority = p })
  failsWith('missing priority', c => { delete c.priority })
  failsWith('exactly 3', c => { c.distractors.ru.pop() })
  failsWith('duplicate distractors.sr', c => { c.distractors.sr = ['xyz', 'XYZ ', 'abc'] })
  failsWith('contains the correct answer', c => { c.distractors.ru[0] = c.translation.toUpperCase() })
})

test('duplicate id and word + sense', () => {
  failsWith('duplicate id', (c, d) => { d.cards[1].id = c.id })
  failsWith('duplicate word + sense', (c, d) => { Object.assign(d.cards[1], { word: c.word, sense: c.sense }) })
})

test('warns when a word has more than 3 cards', () => {
  const d = clone(seed)
  for (const [i, c] of d.cards.slice(0, 4).entries()) Object.assign(c, { word: 'test-word', sense: `s${i}` })
  assert.ok(validate(d).warnings.some(w => w.startsWith('word "test-word" has 4 cards')))
})

// Errors added by the previous-dataset check only (independent of the live dataset's own errors).
function previousErrors(next, previous) {
  const own = new Set(validate(next).errors)
  return validate(next, { previous }).errors.filter(e => !own.has(e))
}

test('previous: id must keep word + sense, word + sense must keep id', () => {
  const prev = clone(seed)
  const next = clone(seed)
  assert.deepEqual(previousErrors(next, prev), [])

  const renamed = clone(next); renamed.cards[0].sense = 'renamed-sense'
  assert.ok(previousErrors(renamed, prev).some(e => e.includes(`was ${identity(c0)}`)))

  const moved = clone(next); moved.cards[0].id = 'sr_99999'
  assert.ok(previousErrors(moved, prev).some(e => e.includes('changed id to sr_99999')))
})

test('previous: allowed changes and removed-card warning', () => {
  const next = clone(seed)
  Object.assign(next.cards[0], { translation: 'новый перевод', difficulty: 3, groups: ['place'] })
  next.cards.splice(1, 1)
  assert.deepEqual(previousErrors(next, seed), [])
  assert.ok(validate(next, { previous: seed }).warnings.includes(`removed ${c1.id} ${identity(c1)}`))
})

test('source: Priority format, skip rows empty, linked card priority must match', () => {
  const d = clone(seed)
  // Only source-check errors: the live dataset may have unrelated ones (e.g. pending 3-examples upgrade).
  const errorsFor = rows => validate(d, { source: parseSource(rows.join('\n')) }).errors
    .filter(e => e.startsWith('source') || e.includes('Priority'))
  const linked = `| ${c0.word} | x | ${c0.priority} | ${c0.id} |`
  assert.deepEqual(errorsFor(['| Srpski | Meaning | Priority | Card |', linked, '| novo | y | 10 | |', '| sad | z | | skip: variant sada |']), [])
  assert.ok(errorsFor(['| novo | y | 11 | |'])[0].includes('bad Priority "11"'))
  assert.ok(errorsFor(['| novo | y | | |'])[0].includes('bad Priority ""'))
  assert.ok(errorsFor(['| sad | z | 3 | skip: variant sada |'])[0].includes('skip row must have empty Priority'))
  assert.ok(errorsFor(['| nema | y | 1 | sr_99999 |'])[0].includes('sr_99999 not in cards'))
  d.cards[0].priority = c0.priority === 10 ? 9 : c0.priority + 1
  assert.ok(errorsFor([linked])[0].includes(`≠ source Priority ${c0.priority}`))
})

test('docs/serbian-words.md priorities are valid and match data/cards.json', () => {
  const source = parseSource(readFileSync(new URL('../docs/serbian-words.md', import.meta.url), 'utf8'))
  assert.deepEqual(validate(seed, { source }).errors.filter(e => e.startsWith('source') || /priority/i.test(e)), [])
})

test('history: deleted id reused for a different card fails', () => {
  const old = { cards: [{ id: 'sr_99999', word: 'nepostojeće', sense: 'gone' }] }
  const next = clone(seed); next.cards[0].id = 'sr_99999'
  const { errors } = validate(next, { history: [{ name: 'old.cards.json', dataset: old }] })
  assert.ok(errors.some(e => e.includes('reused: was nepostojeće / gone in old.cards.json')))
})
