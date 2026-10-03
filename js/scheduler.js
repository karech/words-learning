// Level-based SRS + next-item selection + priority tiers (spec §11, §30–37, §35a). No DOM/Alpine.
// `now` is epoch ms; `random` is injectable for tests. Dates are stored as ISO strings.
//
// An item (card + direction) is "scheduled" once it has nextReviewAt.
// Pools: New = allowed but not scheduled; Review = due; Fresh = scheduled, not due.

import {
  INTERVALS, MAX_LEVEL, CORRECT_LEVEL_STEP, FAILURE_LEVEL_STEP, POOL_WEIGHTS, RETRY_MIN, RETRY_MAX,
  RECENT_EXCLUSION, PRIORITY, MAX_ACTIVE_LEARNING, TIER_MASTERY_CORRECT, TIER_MAX_UNMASTERED,
} from './config.js'
import { isFirstInteraction } from './stats.js'

const DIRS = { 'mixed': ['sr-ru', 'ru-sr'], 'sr-ru': ['sr-ru'], 'ru-sr': ['ru-sr'] }

const NEW_ITEM = {
  shown: 0, answered: 0, correct: 0, wrong: 0, unknown: 0, known: 0, streak: 0, level: 0,
  lastShownAt: null, lastAnsweredAt: null, nextReviewAt: null, lastResult: null,
}

// --- Priority tiers (§35a): derived from cards + progress, never stored. Card-level, both directions. ---

// Answer, "Не знаю" or "Уже знаю" in any direction. Shown-only is not introduced.
export const isCardIntroduced = (cardId, progress) => !isFirstInteraction(progress[cardId])

// Cumulative correct answers, SR→RU + RU→SR.
export const totalCorrect = (cardId, progress) =>
  Object.values(progress[cardId] ?? {}).reduce((sum, i) => sum + (i?.correct ?? 0), 0)

// Historical counters only (correct, known) — later failures never un-master a card.
export function isCardMastered(cardId, progress) {
  return Object.values(progress[cardId] ?? {}).some(i => i?.known > 0)
    || totalCorrect(cardId, progress) >= TIER_MASTERY_CORRECT
}

// unseen = not introduced; unmastered = introduced but not mastered.
export function getTierStats(priority, cards, progress) {
  const stats = { unseen: 0, unmastered: 0 }
  for (const card of cards) {
    if (card.priority !== priority) continue
    if (!isCardIntroduced(card.id, progress)) stats.unseen++
    else if (!isCardMastered(card.id, progress)) stats.unmastered++
  }
  return stats
}

// First incomplete priority; all complete → the highest one (review-only).
export function calculateActiveTier(cards, progress) {
  const tiers = [...new Set(cards.map(c => c.priority))].sort((a, b) => a - b)
  return tiers.find(p => {
    const { unseen, unmastered } = getTierStats(p, cards, progress)
    return unseen > 0 || unmastered > TIER_MAX_UNMASTERED
  }) ?? tiers.at(-1)
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

function buildPools(cards, progress, mode, now, skip, newAllowed) {
  const pools = { review: [], new: [], fresh: [] }
  for (const card of cards) {
    if (skip(card.id)) continue
    for (const dir of DIRS[mode]) {
      const item = getItem(progress, card.id, dir)
      if (!item.nextReviewAt) {
        // Mixed: a new card is exposed SR→RU first; RU→SR appears once scheduled (§11).
        if (!(mode === 'mixed' && dir === 'ru-sr') && newAllowed(card)) pools.new.push({ card, dir, item })
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

    // New: unseen cards only from the active tier, while its open window is below the cap (§34, §35a).
    // Unscheduled directions of already introduced cards (direction switch) stay New regardless.
    const tier = calculateActiveTier(cards, progress)
    const canIntroduce = getTierStats(tier, cards, progress).unmastered < MAX_ACTIVE_LEARNING[settings.newWords]
    const newAllowed = card => isCardIntroduced(card.id, progress) || (canIntroduce && card.priority === tier)

    const queued = new Set(session.retry.map(r => r.cardId))
    const recent = new Set(session.recent)
    let pools = buildPools(cards, progress, settings.direction, now, id => queued.has(id) || recent.has(id), newAllowed)
    let available = Object.keys(pools).filter(p => pools[p].length)
    if (!available.length) {
      // "Where possible" (§37): fall back to ignoring recent exclusion.
      pools = buildPools(cards, progress, settings.direction, now, id => queued.has(id), newAllowed)
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

// Failure rule shared by wrong answer and "Не знаю": level −FAILURE_LEVEL_STEP, due now, session retry.
function fail({ progress, session, cardId, direction, now, random }, changes) {
  const item = getItem(progress, cardId, direction)
  const k = RETRY_MIN + Math.floor(random() * (RETRY_MAX - RETRY_MIN + 1))
  session.retry = session.retry.filter(r => !(r.cardId === cardId && r.direction === direction))
  session.retry.push({ cardId, direction, at: session.count + k })
  return update(progress, cardId, direction, {
    streak: 0, level: Math.max(0, item.level - FAILURE_LEVEL_STEP), nextReviewAt: iso(now), ...changes(item),
  })
}

export function answer({ progress, session, cardId, direction, correct, now, random = Math.random }) {
  const item = getItem(progress, cardId, direction)
  const base = { answered: item.answered + 1, lastAnsweredAt: iso(now) }

  if (!correct) {
    return fail({ progress, session, cardId, direction, now, random },
      item => ({ ...base, wrong: item.wrong + 1, lastResult: 'wrong' }))
  }

  const level = Math.min(MAX_LEVEL, item.level + CORRECT_LEVEL_STEP)
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

// "Уже знаю" (§33): this direction only; answered/shown untouched. `known` counter = tier mastery (§35a).
export function markKnown({ progress, cardId, direction, now }) {
  const item = getItem(progress, cardId, direction)
  return update(progress, cardId, direction, {
    level: MAX_LEVEL, nextReviewAt: iso(now + INTERVALS[MAX_LEVEL]), lastResult: 'known', known: item.known + 1,
  })
}

// "Не знаю" (§25a, §32): failure rule, but not an answer — answered/correct/wrong/shown untouched.
export const markUnknown = ({ progress, session, cardId, direction, now, random = Math.random }) =>
  fail({ progress, session, cardId, direction, now, random },
    item => ({ unknown: item.unknown + 1, lastResult: 'unknown' }))

// Direction change (§30): drop queued retries the new mode doesn't allow.
export function filterRetry(session, mode) {
  session.retry = session.retry.filter(r => DIRS[mode].includes(r.direction))
}
