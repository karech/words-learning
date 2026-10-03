// "Все слова" screen (spec §30a).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { wordGroups, wordRow, addToLearning } from '../js/words.js'
import { createSession, markUnknown, calculateActiveTier } from '../js/scheduler.js'
import { interact } from '../js/stats.js'
import { TIER_MASTERY_CORRECT as M } from '../js/config.js'

const NOW = Date.parse('2026-10-03T12:00:00Z')
const card = (id, word, translation, priority) => ({ id, word, translation, priority })
const CARDS = [
  card('a', 'da', 'что', 1), card('b', 'čaj', 'чай', 1), card('c', 'cena', 'цена', 1),
  card('d', 'da', 'да', 1), card('e', 'ćevap', 'чевапчичи', 1), card('f', 'voda', 'вода', 2),
  card('g', 'ulica', 'улица', 10), card('h', 'kuća', 'дом', 2),
]
const ids = groups => groups.map(g => [g.priority, g.rows.map(r => r.card.id)])

// a: mastered across both directions; b: Уже знаю; c: learning; rest unseen → tier 1 active.
const progress = () => ({
  a: { 'sr-ru': { correct: M - 1, lastResult: 'correct' }, 'ru-sr': { correct: 1, lastResult: 'correct' } },
  b: { 'sr-ru': { known: 1, lastResult: 'known' } },
  c: { 'sr-ru': { correct: 1, lastResult: 'correct' }, 'ru-sr': { correct: M - 2, lastResult: 'wrong' } },
})
const statusOf = (p, id) => wordGroups(CARDS, p).flatMap(g => g.rows).find(r => r.card.id === id)

test('sorted: priority ascending, Serbian alphabet inside, same word by translation', () => {
  assert.deepEqual(ids(wordGroups(CARDS, {})), [[1, ['c', 'b', 'e', 'd', 'a']], [2, ['h', 'f']], [10, ['g']]])
})

test('statuses: mastered (counters or Уже знаю), learning with total correct, new in active tier, later beyond', () => {
  const p = progress()
  assert.equal(calculateActiveTier(CARDS, p), 1)
  assert.deepEqual(['a', 'b', 'c', 'd', 'f'].map(id => statusOf(p, id).label), ['Выучено', 'Выучено', 'В изучении', 'Новое', 'Позже'])
  assert.equal(statusOf(p, 'c').mark, `${M - 1}/${M}`)
  assert.deepEqual(['a', 'b', 'c', 'd', 'f'].map(id => statusOf(p, id).canAdd), [false, false, false, true, true])
})

test('group header: mastered / total semantic cards', () => {
  const [p1, p2] = wordGroups(CARDS, progress())
  assert.deepEqual([p1.mastered, p1.total, p2.mastered, p2.total], [2, 5, 0, 2])
})

test('search: word or translation, case-insensitive, trimmed, empty groups hidden, order kept', () => {
  const p = progress()
  assert.deepEqual(ids(wordGroups(CARDS, p, ' ČAJ ')), [[1, ['b']]])
  assert.deepEqual(ids(wordGroups(CARDS, p, 'ЧТО')), [[1, ['a']]])
  assert.deepEqual(ids(wordGroups(CARDS, p, 'u')), [[2, ['h']], [10, ['g']]])
  assert.deepEqual(wordGroups(CARDS, p, 'da')[0].total, 5) // counts cover the whole priority
  assert.deepEqual(wordGroups(CARDS, p, 'zzz'), [])
})

test('Добавить в обучение = Не знаю on SR→RU: same progress, stats and retry from the same state', () => {
  const run = act => {
    const state = { progress: progress(), stats: {}, session: createSession() }
    act(state)
    return { ...state, session: state.session.retry.map(r => [r.cardId, r.direction]) }
  }
  const viaAdd = run(s => addToLearning({ ...s, cardId: 'f', now: NOW }))
  const viaQuiz = run(s => interact({ ...s, cardId: 'f', direction: 'sr-ru', now: NOW, result: 'unknown', update: markUnknown }))
  assert.deepEqual(viaAdd, viaQuiz)
})

test('after adding: learning, button gone, tier not unlocked, RU→SR not unlocked', () => {
  const p = progress()
  addToLearning({ progress: p, stats: {}, session: createSession(), cardId: 'f', now: NOW })
  assert.equal(statusOf(p, 'f').label, 'В изучении')
  assert.equal(statusOf(p, 'f').canAdd, false)
  assert.equal(calculateActiveTier(CARDS, p), 1)
  assert.equal(statusOf(p, 'h').label, 'Позже')
  assert.equal(p.f['ru-sr'], undefined)
  assert.equal(wordRow(CARDS[5], p, 1).mark, `0/${M}`)
})
