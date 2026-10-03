import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSession, nextItem, markShown, answer, markKnown, filterRetry, priority } from '../js/scheduler.js'
import { INTERVALS } from '../js/config.js'

const MIN = 60_000
const DAY = 24 * 60 * MIN
const NOW = Date.parse('2026-10-03T12:00:00Z')
const cards = n => Array.from({ length: n }, (_, i) => ({ id: `c${i}` }))
const settings = (direction = 'mixed', newWords = 'normal') => ({ direction, newWords })

test('mixed: new cards are exposed SR→RU only', () => {
  const session = createSession()
  for (let i = 0; i < 50; i++) {
    assert.equal(nextItem({ cards: cards(5), progress: {}, settings: settings(), session, now: NOW }).direction, 'sr-ru')
  }
})

test('mixed: first correct SR→RU creates RU→SR at level 0, due now', () => {
  const progress = {}
  answer({ progress, session: createSession(), cardId: 'c0', direction: 'sr-ru', correct: true, now: NOW })
  const rev = progress.c0['ru-sr']
  assert.equal(rev.level, 0)
  assert.equal(Date.parse(rev.nextReviewAt), NOW)
  assert.equal(rev.answered, 0)
})

test('mixed: reverse item is not the very next question (recent exclusion)', () => {
  const cs = cards(10), progress = {}, session = createSession()
  const first = nextItem({ cards: cs, progress, settings: settings(), session, now: NOW })
  answer({ progress, session, cardId: first.card.id, direction: 'sr-ru', correct: true, now: NOW })
  for (let i = 0; i < 3; i++) {
    assert.notEqual(nextItem({ cards: cs, progress, settings: settings(), session, now: NOW }).card.id, first.card.id)
  }
})

test('RU→SR mode: new cards start directly in RU→SR', () => {
  const r = nextItem({ cards: cards(3), progress: {}, settings: settings('ru-sr'), session: createSession(), now: NOW })
  assert.equal(r.direction, 'ru-sr')
})

test('correct answer: level+1, streak+1, interval from new level', () => {
  const progress = { c0: { 'sr-ru': { level: 2, streak: 1, answered: 3, correct: 2, nextReviewAt: 'x' } } }
  const item = answer({ progress, session: createSession(), cardId: 'c0', direction: 'sr-ru', correct: true, now: NOW })
  assert.equal(item.level, 3)
  assert.equal(item.streak, 2)
  assert.equal(item.answered, 4)
  assert.equal(item.lastResult, 'correct')
  assert.equal(Date.parse(item.nextReviewAt), NOW + INTERVALS[3])
})

test('correct answer: level capped at 6', () => {
  const progress = { c0: { 'sr-ru': { level: 6, nextReviewAt: 'x' } } }
  assert.equal(answer({ progress, session: createSession(), cardId: 'c0', direction: 'sr-ru', correct: true, now: NOW }).level, 6)
})

test('wrong answer: level-2 (min 0), streak 0, due now, queued for retry', () => {
  const progress = { c0: { 'sr-ru': { level: 1, streak: 4, nextReviewAt: 'x' } } }
  const session = createSession()
  const item = answer({ progress, session, cardId: 'c0', direction: 'sr-ru', correct: false, now: NOW, random: () => 0 })
  assert.equal(item.level, 0)
  assert.equal(item.streak, 0)
  assert.equal(item.wrong, 1)
  assert.equal(item.lastResult, 'wrong')
  assert.equal(Date.parse(item.nextReviewAt), NOW)
  assert.deepEqual(session.retry, [{ cardId: 'c0', direction: 'sr-ru', at: 5 }])
})

test('retry: wrong item comes back after 5–10 other questions', () => {
  for (const [rand, k] of [[0, 5], [0.999, 10]]) {
    const cs = cards(20), progress = {}, session = createSession()
    const first = nextItem({ cards: cs, progress, settings: settings('sr-ru'), session, now: NOW })
    answer({ progress, session, cardId: first.card.id, direction: 'sr-ru', correct: false, now: NOW, random: () => rand })
    const seq = Array.from({ length: k + 1 }, () => nextItem({ cards: cs, progress, settings: settings('sr-ru'), session, now: NOW }).card.id)
    assert.equal(seq.indexOf(first.card.id), k, `k=${k}`)
  }
})

test('уже знаю: level 6, +30d, known; answered/shown and other direction untouched', () => {
  const progress = { c0: { 'sr-ru': { shown: 1, answered: 0 }, 'ru-sr': { level: 2, nextReviewAt: 'keep' } } }
  const item = markKnown({ progress, cardId: 'c0', direction: 'sr-ru', now: NOW })
  assert.equal(item.level, 6)
  assert.equal(item.lastResult, 'known')
  assert.equal(Date.parse(item.nextReviewAt), NOW + 30 * DAY)
  assert.equal(item.shown, 1)
  assert.equal(item.answered, 0)
  assert.deepEqual(progress.c0['ru-sr'], { level: 2, nextReviewAt: 'keep' })
})

test('markShown increments shown only', () => {
  const progress = {}
  markShown(progress, 'c0', 'sr-ru', NOW)
  const item = markShown(progress, 'c0', 'sr-ru', NOW)
  assert.equal(item.shown, 2)
  assert.equal(item.answered, 0)
  assert.equal(item.nextReviewAt, null) // shown-only stays in New
})

test('recent exclusion: last 3 card ids not repeated, ignored when impossible', () => {
  const cs = cards(4), session = createSession()
  const seq = Array.from({ length: 40 }, () => nextItem({ cards: cs, progress: {}, settings: settings(), session, now: NOW }).card.id)
  for (let i = 3; i < seq.length; i++) assert.ok(!seq.slice(i - 3, i).includes(seq[i]), `at ${i}`)
  const one = createSession()
  nextItem({ cards: cards(1), progress: {}, settings: settings(), session: one, now: NOW })
  assert.equal(nextItem({ cards: cards(1), progress: {}, settings: settings(), session: one, now: NOW }).card.id, 'c0')
})

test('pools: weights by setting, empty pool redistributed', () => {
  // c0 due (review), c1 new; fresh empty → review .65, new .25 of .90
  const progress = { c0: { 'sr-ru': { level: 2, nextReviewAt: new Date(NOW - MIN).toISOString() } } }
  const pick = r => nextItem({ cards: cards(2), progress, settings: settings('sr-ru'), session: createSession(), now: NOW, random: () => r }).card.id
  assert.equal(pick(0.70), 'c0') // 0.70 * 0.90 = 0.63 < 0.65
  assert.equal(pick(0.75), 'c1') // 0.675 ≥ 0.65
})

test('pools: fresh items are used when nothing else is left', () => {
  const progress = { c0: { 'sr-ru': { level: 3, nextReviewAt: new Date(NOW + DAY).toISOString() } } }
  assert.equal(nextItem({ cards: cards(1), progress, settings: settings('sr-ru'), session: createSession(), now: NOW }).card.id, 'c0')
})

test('direction change drops disallowed retries', () => {
  const session = { ...createSession(), retry: [{ cardId: 'a', direction: 'sr-ru', at: 9 }, { cardId: 'b', direction: 'ru-sr', at: 9 }] }
  filterRetry(session, 'sr-ru')
  assert.deepEqual(session.retry.map(r => r.cardId), ['a'])
})

test('orphan progress (removed card) is ignored', () => {
  const progress = { gone: { 'sr-ru': { level: 1, nextReviewAt: new Date(NOW - DAY).toISOString() } } }
  const session = createSession()
  for (let i = 0; i < 10; i++) assert.equal(nextItem({ cards: cards(1), progress, settings: settings(), session, now: NOW }).card.id, 'c0')
})

test('nothing to show → null', () => {
  assert.equal(nextItem({ cards: [], progress: {}, settings: settings(), session: createSession(), now: NOW }), null)
})

test('priority: error-prone, low level, overdue, last wrong rank higher; level 0 uses 10-min floor', () => {
  const base = { answered: 4, wrong: 0, level: 5, lastResult: 'correct', nextReviewAt: new Date(NOW).toISOString() }
  const p = x => priority({ ...base, ...x }, NOW)
  assert.ok(p({ wrong: 3 }) > p({}))
  assert.ok(p({ level: 1 }) > p({}))
  assert.ok(p({ lastResult: 'wrong' }) > p({}))
  assert.ok(p({ nextReviewAt: new Date(NOW - 10 * DAY).toISOString() }) > p({}))
  const lvl0 = p({ level: 0, nextReviewAt: new Date(NOW - 5 * MIN).toISOString() })
  assert.equal(lvl0, 1 + 1.5 + 0.5 * 1.5)
})
