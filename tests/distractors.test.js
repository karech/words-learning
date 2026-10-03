import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildOptions, normalize } from '../js/distractors.js'

let n = 0
const card = (word, translation, extra = {}) => ({
  id: `t_${++n}`, word, translation,
  partOfSpeech: 'noun', difficulty: 1, groups: ['place'],
  distractors: { ru: ['ф1', 'ф2', 'ф3'], sr: ['f1', 'f2', 'f3'] },
  ...extra,
})

const distractorsOf = r => r.options.filter((_, i) => i !== r.correctIndex)

test('normalize: trim, lowercase, ё→е', () => {
  assert.equal(normalize('  Счёт '), 'счет')
})

test('tier 0 (same pos+difficulty+group) wins over fallback', () => {
  const target = card('prodavnica', 'магазин')
  const cards = [target, card('pijaca', 'рынок'), card('apoteka', 'аптека'), card('restoran', 'ресторан'),
    card('stan', 'квартира', { groups: ['home'] })]
  const r = buildOptions(target, cards, 'sr-ru')
  assert.deepEqual(distractorsOf(r).sort(), ['аптека', 'ресторан', 'рынок'])
  assert.equal(r.options[r.correctIndex], 'магазин')
})

test('fallback fills before loosened tiers', () => {
  const target = card('prodavnica', 'магазин')
  const cards = [target, card('pijaca', 'рынок'), card('kuća', 'дом', { groups: ['home'] })]
  const r = buildOptions(target, cards, 'sr-ru', () => 0)
  const d = distractorsOf(r)
  assert.ok(d.includes('рынок'))
  assert.ok(!d.includes('дом'))
  assert.equal(d.filter(x => x.startsWith('ф')).length, 2)
})

test('loosened tiers used when fallback is unusable', () => {
  const target = card('prodavnica', 'магазин', { distractors: { ru: ['магазин', 'Магазин ', 'магазин'], sr: [] } })
  const cards = [target,
    card('pijaca', 'рынок', { difficulty: 2 }),        // tier 1
    card('kuća', 'дом', { groups: ['home'] }),          // tier 2
    card('zgrada', 'здание', { difficulty: 3, groups: ['home'] }), // tier 3
    card('ići', 'идти', { partOfSpeech: 'verb' })]      // never
  const d = distractorsOf(buildOptions(target, cards, 'sr-ru'))
  assert.deepEqual(d.sort(), ['дом', 'здание', 'рынок'])
})

test('exclusions: same word other sense, duplicates after normalize', () => {
  const target = card('račun', 'счёт')
  const cards = [target,
    card('račun', 'расчёт'),     // other sense of same word
    card('cena', 'Счет'),        // duplicate of correct after normalize
    card('kusur', 'сдача'), card('kusur2', 'сдача'), // duplicate distractor
    card('novac', 'деньги'), card('plata', 'зарплата')]
  const d = distractorsOf(buildOptions(target, cards, 'sr-ru'))
  assert.ok(!d.includes('расчёт'))
  assert.ok(!d.includes('Счет'))
  assert.equal(new Set(d.map(normalize)).size, 3)
})

test('RU→SR excludes cards with the same translation', () => {
  const target = card('novac', 'деньги')
  const cards = [target, card('pare', 'Деньги'), card('kusur', 'сдача'), card('cena', 'цена'), card('popust', 'скидка')]
  for (let i = 0; i < 20; i++) {
    const r = buildOptions(target, cards, 'ru-sr')
    assert.equal(r.options[r.correctIndex], 'novac')
    assert.ok(!r.options.includes('pare'))
  }
})

test('insufficient pool → null', () => {
  const target = card('prodavnica', 'магазин', { distractors: { ru: ['рынок'], sr: [] } })
  assert.equal(buildOptions(target, [target], 'sr-ru'), null)
})

test('correct position is randomized', () => {
  const target = card('prodavnica', 'магазин')
  const seen = new Set()
  for (let i = 0; i < 200; i++) seen.add(buildOptions(target, [target], 'sr-ru').correctIndex)
  assert.deepEqual([...seen].sort(), [0, 1, 2, 3])
})
