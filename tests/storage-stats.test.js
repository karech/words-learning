import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadProgress, loadSettings, saveSettings, loadStats, resetProgress, DEFAULT_SETTINGS } from '../js/storage.js'
import { dayKey, isFirstInteraction, recordInteraction, summary } from '../js/stats.js'

const memStore = (init = {}) => {
  const m = new Map(Object.entries(init))
  return {
    getItem: k => m.has(k) ? m.get(k) : null,
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: k => m.delete(k),
    keys: () => [...m.keys()],
  }
}

test('storage: missing / invalid JSON / wrong shape → defaults', () => {
  assert.deepEqual(loadProgress(memStore()), {})
  assert.deepEqual(loadProgress(memStore({ 'vocab.progress.v1': '{oops' })), {})
  assert.deepEqual(loadStats(memStore({ 'vocab.stats.v1': '[1,2]' })), {})
  assert.deepEqual(loadSettings(memStore({ 'vocab.settings.v1': 'null' })), DEFAULT_SETTINGS)
})

test('storage: partial/unknown settings fields fall back per field', () => {
  const s = loadSettings(memStore({ 'vocab.settings.v1': '{"direction":"ru-sr","newWords":"lots"}' }))
  assert.deepEqual(s, { direction: 'ru-sr', newWords: 'normal' })
})

test('storage: save round-trip, reset keeps settings', () => {
  const store = memStore({ 'vocab.progress.v1': '{}', 'vocab.stats.v1': '{}' })
  saveSettings({ direction: 'sr-ru', newWords: 'more' }, store)
  resetProgress(store)
  assert.deepEqual(store.keys(), ['vocab.settings.v1'])
  assert.deepEqual(loadSettings(store), { direction: 'sr-ru', newWords: 'more' })
})

test('stats: local-day boundary', () => {
  const stats = {}
  recordInteraction(stats, new Date(2026, 9, 3, 23, 59), 'correct', false)
  recordInteraction(stats, new Date(2026, 9, 4, 0, 1), 'wrong', false)
  assert.equal(stats['2026-10-03'].correct, 1)
  assert.equal(stats['2026-10-04'].wrong, 1)
  assert.equal(stats['2026-10-04'].answered, 1)
})

test('stats: known counts alreadyKnown, not answered', () => {
  const stats = {}
  recordInteraction(stats, new Date(2026, 9, 3), 'known', true)
  assert.deepEqual(stats['2026-10-03'], { answered: 0, correct: 0, wrong: 0, unknown: 0, newWords: 1, alreadyKnown: 1 })
})

test('stats: newWords once per card, any direction', () => {
  const shownOnly = { 'sr-ru': { shown: 1 } }
  assert.equal(isFirstInteraction(undefined), true)
  assert.equal(isFirstInteraction(shownOnly), true)
  assert.equal(isFirstInteraction({ 'sr-ru': { lastResult: 'correct' } }), false)
  assert.equal(isFirstInteraction({ 'ru-sr': { lastResult: 'known' } }), false)
})

test('stats: prune keeps exactly 30 local days', () => {
  const now = new Date(2026, 9, 31, 12)
  const stats = { '2026-10-01': { answered: 1 }, '2026-10-02': { answered: 2 }, '2026-09-15': { answered: 3 } }
  recordInteraction(stats, now, 'correct', false)
  assert.deepEqual(Object.keys(stats).sort(), ['2026-10-02', '2026-10-31'])
})

test('stats: summary has 30 days, today last, partial entries filled', () => {
  const now = new Date(2026, 9, 3, 10)
  const s = summary({ '2026-10-03': { answered: 5 }, '2026-10-02': { answered: 3, correct: 2 } }, now)
  assert.equal(s.days.length, 30)
  assert.equal(s.today.date, dayKey(now))
  assert.equal(s.today.correct, 0)
  assert.equal(s.yesterday.answered, 3)
  assert.equal(s.days[0].date, '2026-09-04')
})
