// "Не знаю" (spec §25a, §29, §32, §36) — the 14 cases from the 2026-10-03 change request.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSession, markShown, markUnknown, answer, priority } from '../js/scheduler.js'
import { isFirstInteraction, recordInteraction } from '../js/stats.js'
import { answerClass, feedback } from '../js/question.js'
import { MAX_LEVEL, FAILURE_LEVEL_STEP, RETRY_MIN, PRIORITY } from '../js/config.js'

const NOW = Date.parse('2026-10-03T12:00:00Z')

function pressUnknown(progress = {}, level = MAX_LEVEL) {
  const session = createSession()
  progress.c0 ??= { 'sr-ru': { shown: 1, answered: 4, correct: 3, wrong: 1, level, streak: 2, nextReviewAt: 'x' } }
  const item = markUnknown({ progress, session, cardId: 'c0', direction: 'sr-ru', now: NOW, random: () => 0 })
  return { item, session, progress }
}

test('1–5: answered/correct/wrong/shown unchanged, unknown +1', () => {
  const { item } = pressUnknown()
  assert.equal(item.answered, 4)
  assert.equal(item.correct, 3)
  assert.equal(item.wrong, 1)
  assert.equal(item.unknown, 1)
  assert.equal(item.shown, 1)
})

test('6–7: lastResult unknown, failure level rule, streak 0, due now', () => {
  const { item } = pressUnknown()
  assert.equal(item.lastResult, 'unknown')
  assert.equal(item.level, Math.max(0, MAX_LEVEL - FAILURE_LEVEL_STEP))
  assert.equal(item.streak, 0)
  assert.equal(Date.parse(item.nextReviewAt), NOW)
  assert.equal(pressUnknown({}, 0).item.level, 0)
})

test('8: item goes to the session retry queue (RETRY_MIN..RETRY_MAX)', () => {
  const { session } = pressUnknown()
  assert.deepEqual(session.retry, [{ cardId: 'c0', direction: 'sr-ru', at: RETRY_MIN }])
})

const q = {
  card: { word: 'prodavnica', translation: 'магазин', pronunciation: 'прода́вница' },
  example: { sr: 'Idem u prodavnicu.', ru: 'Я иду в магазин.' },
  correctIndex: 2,
}

test('9–10: correct answer revealed, no answer gets Wrong state', () => {
  const classes = [0, 1, 2, 3].map(i => answerClass(i, q, 'unknown', null))
  assert.deepEqual(classes, ['', '', 'is-correct', ''])
})

test('feedback after Не знаю: no Верно/Ошибка; SR→RU example only; RU→SR reveals word + pronunciation', () => {
  assert.deepEqual(feedback({ ...q, direction: 'sr-ru' }, 'unknown'),
    { title: '', titleClass: 'is-correct', line: '', example: 'Я иду в магазин.' })
  assert.deepEqual(feedback({ ...q, direction: 'ru-sr' }, 'unknown'),
    { title: '', titleClass: 'is-correct', line: 'prodavnica · прода́вница', example: 'Idem u prodavnicu.' })
  assert.equal(feedback({ ...q, direction: 'ru-sr' }, 'wrong').line, 'Правильно: prodavnica · прода́вница')
  assert.equal(feedback({ ...q, direction: 'sr-ru' }, 'correct').title, 'Верно')
})

test('12–13: newWords +1 on first Не знаю for a new card, not again', () => {
  const progress = {}, stats = {}, session = createSession()
  markShown(progress, 'c0', 'sr-ru', NOW)
  for (let i = 0; i < 2; i++) {
    const first = isFirstInteraction(progress.c0)
    markUnknown({ progress, session, cardId: 'c0', direction: 'sr-ru', now: NOW })
    recordInteraction(stats, new Date(NOW), 'unknown', first)
  }
  const day = Object.values(stats)[0]
  assert.equal(day.newWords, 1)
  assert.equal(day.unknown, 2)
  assert.equal(day.answered, 0)
})

test('14: unknown gets the same priority failure bonus as wrong', () => {
  const base = { answered: 2, wrong: 0, level: 2, nextReviewAt: new Date(NOW).toISOString() }
  const p = lastResult => priority({ ...base, lastResult }, NOW)
  assert.equal(p('unknown'), p('wrong'))
  assert.equal(p('unknown') - p('correct'), PRIORITY.lastFailureBonus)
})

test('wrong answer and Не знаю apply the same scheduling', () => {
  const init = () => ({ c0: { 'sr-ru': { level: 4, streak: 3, nextReviewAt: 'x' } } })
  const a = init(), b = init()
  const w = answer({ progress: a, session: createSession(), cardId: 'c0', direction: 'sr-ru', correct: false, now: NOW, random: () => 0 })
  const u = markUnknown({ progress: b, session: createSession(), cardId: 'c0', direction: 'sr-ru', now: NOW, random: () => 0 })
  for (const f of ['level', 'streak', 'nextReviewAt']) assert.equal(u[f], w[f], f)
  assert.equal(b.c0['ru-sr'], undefined) // no reverse unlock
})
