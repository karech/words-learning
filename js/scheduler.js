// Level-based SRS + next-item selection (spec §11, §30–37). No DOM/Alpine.
// `now` is epoch ms; `random` is injectable for tests. Dates are stored as ISO strings.
//
// An item (card + direction) is "scheduled" once it has nextReviewAt.
// Pools: New = allowed but not scheduled; Review = due; Fresh = scheduled, not due.

import { INTERVALS, MAX_LEVEL, POOL_WEIGHTS, RETRY_MIN, RETRY_MAX, RECENT_EXCLUSION, PRIORITY } from './config.js'

const DIRS = { 'mixed': ['sr-ru', 'ru-sr'], 'sr-ru': ['sr-ru'], 'ru-sr': ['ru-sr'] }

const NEW_ITEM = {
  shown: 0, answered: 0, correct: 0, wrong: 0, unknown: 0, streak: 0, level: 0,
  lastShownAt: null, lastAnsweredAt: null, nextReviewAt: null, lastResult: null,
}

export const createSession = () => ({ count: 0, recent: [], retry: [] })

// Merged with defaults so missing/old/partial stored items are safe.
const getItem = (progress, cardId, dir) => ({ ...NEW_ITEM, ...progress[cardId]?.[dir] })

function update(progress, cardId, dir, changes) {
  const item = { ...getItem(progress, cardId, dir), ...changes }
  progress[cardId] = { ...progress[cardId], [dir]: item }
  return item
}

const iso = ms => new Date(ms).toISOString()

export function priority(item, now) {
  const P = PRIORITY
  const errorRate = item.wrong / Math.max(1, item.answered)
  const due = item.nextReviewAt ? Date.parse(item.nextReviewAt) : now
  const interval = Math.max(INTERVALS[item.level], P.intervalFloor)
  const overdue = Math.min(Math.max((now - due) / interval, 0), P.overdueMax)
  return P.base
    + errorRate * P.errorRate
    + ((MAX_LEVEL - item.level) / MAX_LEVEL) * P.lowLevel
    + overdue * P.overdue
    + (FAILURES.includes(item.lastResult) ? P.lastFailureBonus : 0)
}

// Wrong and "Не знаю" both mean "repeat soon" (§25a, §32).
const FAILURES = ['wrong', 'unknown']

function weightedPick(entries, weightOf, random) {
  const weights = entries.map(weightOf)
  let r = random() * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < entries.length; i++) if ((r -= weights[i]) < 0) return entries[i]
  return entries.at(-1)
}

function buildPools(cards, progress, mode, now, skip) {
  const pools = { review: [], new: [], fresh: [] }
  for (const card of cards) {
    if (skip(card.id)) continue
    for (const dir of DIRS[mode]) {
      const item = getItem(progress, card.id, dir)
      if (!item.nextReviewAt) {
        // Mixed: a new card is exposed SR→RU first; RU→SR appears once scheduled (§11).
        if (!(mode === 'mixed' && dir === 'ru-sr')) pools.new.push({ card, dir, item })
      } else {
        pools[Date.parse(item.nextReviewAt) <= now ? 'review' : 'fresh'].push({ card, dir, item })
      }
    }
  }
  return pools
}

// Returns { card, direction } or null if nothing is available. Mutates session.
export function nextItem({ cards, progress, settings, session, now, random = Math.random }) {
  const dirs = DIRS[settings.direction]
  const pick = choose()
  if (!pick) return null
  session.count++
  session.recent = [...session.recent, pick.card.id].slice(-RECENT_EXCLUSION)
  return { card: pick.card, direction: pick.dir }

  function takeRetry(ready) {
    const ri = session.retry.findIndex(r => dirs.includes(r.direction) && ready(r))
    if (ri < 0) return null
    const [r] = session.retry.splice(ri, 1)
    const card = cards.find(c => c.id === r.cardId)
    return card ? { card, dir: r.direction } : null
  }

  function choose() {
    // Session retry has priority and ignores recent exclusion (§32, §37).
    const due = takeRetry(r => r.at <= session.count)
    if (due) return due

    const queued = new Set(session.retry.map(r => r.cardId))
    const recent = new Set(session.recent)
    let pools = buildPools(cards, progress, settings.direction, now, id => queued.has(id) || recent.has(id))
    let available = Object.keys(pools).filter(p => pools[p].length)
    if (!available.length) {
      // "Where possible" (§37): fall back to ignoring recent exclusion.
      pools = buildPools(cards, progress, settings.direction, now, id => queued.has(id))
      available = Object.keys(pools).filter(p => pools[p].length)
    }
    // Only queued retries left (tiny dataset): take the earliest one now.
    if (!available.length) return takeRetry(() => true)

    // Empty pools' weight is redistributed proportionally (§35).
    const weights = POOL_WEIGHTS[settings.newWords]
    const pool = weightedPick(available, p => weights[p], random)
    return weightedPick(pools[pool], e => priority(e.item, now), random)
  }
}

export function markShown(progress, cardId, dir, now) {
  const item = getItem(progress, cardId, dir)
  return update(progress, cardId, dir, { shown: item.shown + 1, lastShownAt: iso(now) })
}

// Failure rule shared by wrong answer and "Не знаю": level −2, due now, session retry in 5–10.
function fail({ progress, session, cardId, direction, now, random }, changes) {
  const item = getItem(progress, cardId, direction)
  const k = RETRY_MIN + Math.floor(random() * (RETRY_MAX - RETRY_MIN + 1))
  session.retry = session.retry.filter(r => !(r.cardId === cardId && r.direction === direction))
  session.retry.push({ cardId, direction, at: session.count + k })
  return update(progress, cardId, direction, {
    streak: 0, level: Math.max(0, item.level - 2), nextReviewAt: iso(now), ...changes(item),
  })
}

export function answer({ progress, session, cardId, direction, correct, now, random = Math.random }) {
  const item = getItem(progress, cardId, direction)
  const base = { answered: item.answered + 1, lastAnsweredAt: iso(now) }

  if (!correct) {
    return fail({ progress, session, cardId, direction, now, random },
      item => ({ ...base, wrong: item.wrong + 1, lastResult: 'wrong' }))
  }

  const level = Math.min(MAX_LEVEL, item.level + 1)
  const result = update(progress, cardId, direction, {
    ...base, correct: item.correct + 1, streak: item.streak + 1, lastResult: 'correct',
    level, nextReviewAt: iso(now + INTERVALS[level]),
  })
  // First correct SR→RU unlocks RU→SR: level 0, due now (§11).
  if (direction === 'sr-ru' && !getItem(progress, cardId, 'ru-sr').nextReviewAt) {
    update(progress, cardId, 'ru-sr', { level: 0, nextReviewAt: iso(now) })
  }
  return result
}

// "Уже знаю" (§33): this direction only; answered/shown untouched.
export const markKnown = ({ progress, cardId, direction, now }) =>
  update(progress, cardId, direction, { level: MAX_LEVEL, nextReviewAt: iso(now + INTERVALS[MAX_LEVEL]), lastResult: 'known' })

// "Не знаю" (§25a, §32): failure rule, but not an answer — answered/correct/wrong/shown untouched.
export const markUnknown = ({ progress, session, cardId, direction, now, random = Math.random }) =>
  fail({ progress, session, cardId, direction, now, random },
    item => ({ unknown: item.unknown + 1, lastResult: 'unknown' }))

// Direction change (§30): drop queued retries the new mode doesn't allow.
export function filterRetry(session, mode) {
  session.retry = session.retry.filter(r => DIRS[mode].includes(r.direction))
}
