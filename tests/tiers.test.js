// Priority tiers (spec §35a) — the cases from the 2026-10-03 change request.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createSession, nextItem, markShown, answer, markKnown, markUnknown,
  isCardIntroduced, isCardMastered, getTierStats, calculateActiveTier,
} from '../js/scheduler.js'
import {
  MAX_ACTIVE_LEARNING, POOL_WEIGHTS, MAX_LEVEL, FAILURE_LEVEL_STEP, TIER_MASTERY_CORRECT as M, TIER_MAX_UNMASTERED as U,
} from '../js/config.js'

const DAY = 24 * 60 * 60_000
const NOW = Date.parse('2026-10-03T12:00:00Z')
const LATER = new Date(NOW + DAY).toISOString()   // fresh, not due
const EARLIER = new Date(NOW - DAY).toISOString() // due → review

const tier = (priority, n) => Array.from({ length: n }, (_, i) => ({ id: `p${priority}_${i}`, priority }))
const mastered = (nextReviewAt = LATER) => ({ 'sr-ru': { correct: M, level: MAX_LEVEL, lastResult: 'correct', nextReviewAt } })
const weak = () => ({ 'sr-ru': { correct: 0, wrong: 1, level: 0, lastResult: 'wrong', nextReviewAt: LATER } })
const fill = (progress, cards, state) => { for (const c of cards) progress[c.id] = state(); return progress }

const s = (newWords = 'normal', direction = 'sr-ru') => ({ direction, newWords })
// random 0 → first available pool (review, new, fresh order), first item in it.
const first = (cards, progress, settings = s()) =>
  nextItem({ cards, progress, settings, session: createSession(), now: NOW, random: () => 0 })

const args = (progress, extra) => ({ progress, session: createSession(), cardId: 'c', direction: 'sr-ru', now: NOW, ...extra })

test('introduced: shown-only no; correct, wrong, Не знаю, Уже знаю yes', () => {
  const shown = {}
  markShown(shown, 'c', 'sr-ru', NOW)
  assert.equal(isCardIntroduced('c', shown), false)

  const acts = [
    p => answer(args(p, { correct: true })),
    p => answer(args(p, { correct: false })),
    p => markUnknown(args(p)),
    p => markKnown(args(p)),
  ]
  for (const act of acts) {
    const p = {}
    act(p)
    assert.equal(isCardIntroduced('c', p), true)
  }
})

test('mastered: TIER_MASTERY_CORRECT summed across directions, or Уже знаю; failures add nothing', () => {
  assert.equal(isCardMastered('c', { c: { 'sr-ru': { correct: M - 1 } } }), false)
  assert.equal(isCardMastered('c', { c: { 'sr-ru': { correct: M } } }), true)
  assert.equal(isCardMastered('c', { c: { 'sr-ru': { correct: M - 1 }, 'ru-sr': { correct: 1 } } }), true)

  const known = {}
  markKnown(args(known))
  assert.equal(isCardMastered('c', known), true)

  const p = { c: { 'sr-ru': { correct: M - 1, level: MAX_LEVEL, nextReviewAt: LATER } } }
  answer(args(p, { correct: false }))
  markUnknown(args(p))
  assert.equal(isCardMastered('c', p), false)
})

test('Уже знаю stays mastered after a later wrong answer', () => {
  const p = {}
  markKnown(args(p))
  answer(args(p, { correct: false }))
  assert.equal(isCardMastered('c', p), true)
})

test('tier completion: unseen blocks, more than TIER_MAX_UNMASTERED blocks, exactly that many is fine', () => {
  const t1 = tier(1, U + 1), t2 = tier(2, 3), cards = [...t1, ...t2]

  const oneUnseen = fill({}, t1.slice(1), mastered)
  assert.deepEqual(getTierStats(1, cards, oneUnseen), { unseen: 1, unmastered: 0 })
  assert.equal(calculateActiveTier(cards, oneUnseen), 1)

  assert.equal(calculateActiveTier(cards, fill({}, t1, weak)), 1) // U + 1 unmastered
  const maxWeak = fill(fill({}, t1, mastered), t1.slice(1), weak)
  assert.deepEqual(getTierStats(1, cards, maxWeak), { unseen: 0, unmastered: U })
  assert.equal(calculateActiveTier(cards, maxWeak), 2)

  assert.equal(calculateActiveTier(cards, fill({}, t1, mastered)), 2)
})

test('completed tier is not reopened by later failures; all complete → highest tier', () => {
  const t1 = tier(1, 3), cards = [...t1, ...tier(2, 1)]
  const p = fill({}, t1, mastered)
  for (const c of t1) answer({ ...args(p, { correct: false }), cardId: c.id })
  assert.equal(p[t1[0].id]['sr-ru'].level, Math.max(0, MAX_LEVEL - FAILURE_LEVEL_STEP))
  assert.equal(calculateActiveTier(cards, p), 2)

  assert.equal(calculateActiveTier(cards, fill(p, cards, mastered)), 2)
})

test('New: future-tier cards excluded', () => {
  const cards = [...tier(1, 2), ...tier(2, 5)]
  for (let i = 0; i < 50; i++) {
    const r = nextItem({ cards, progress: {}, settings: s(), session: createSession(), now: NOW })
    assert.equal(r.card.priority, 1)
  }
})

test('New: only the active tier once earlier tiers are complete', () => {
  const t1 = tier(1, 2), cards = [...t1, ...tier(2, 2), ...tier(3, 2)]
  const r = first(cards, fill({}, t1, mastered))
  assert.equal(r.card.priority, 2)
})

test('New: available below the setting cap, unavailable at it (MAX_ACTIVE_LEARNING)', () => {
  assert.deepEqual(Object.keys(MAX_ACTIVE_LEARNING), Object.keys(POOL_WEIGHTS))

  const pick = (open, newWords) => {
    const cards = tier(1, open + 1) // `open` weak introduced cards + 1 unseen
    const progress = fill({}, cards.slice(0, open), weak)
    return first(cards, progress, s(newWords)).card.id === cards[open].id // true = New was available
  }
  for (const [newWords, cap] of Object.entries(MAX_ACTIVE_LEARNING)) {
    assert.equal(pick(cap - 1, newWords), true, `${newWords} below cap`)
    assert.equal(pick(cap, newWords), false, `${newWords} at cap`)
  }
})

test('Review and Fresh are not restricted to the active tier', () => {
  const t1 = tier(1, 1), t2 = tier(2, 1), cards = [...t1, ...t2]
  // due tier-1 card wins the review pool while tier 2 is active
  assert.equal(first(cards, fill({}, t1, () => mastered(EARLIER))).card.id, t1[0].id)
  // fresh tier-1 card: r = .99 lands in the last pool (fresh)
  const fresh = nextItem({ cards, progress: fill({}, t1, mastered), settings: s(), session: createSession(), now: NOW, random: () => 0.99 })
  assert.equal(fresh.card.id, t1[0].id)
})

test('direction switch: unscheduled direction of an introduced card stays New outside the active tier', () => {
  const [a] = tier(1, 1), [b] = tier(2, 1)
  const progress = { [a.id]: weak() } // introduced via SR→RU only; tier 1 complete → tier 2 active
  const r = first([a, b], progress, s('normal', 'ru-sr'))
  assert.deepEqual([r.card.id, r.direction], [a.id, 'ru-sr'])
})
