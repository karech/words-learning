// Daily aggregates by local calendar day (spec §29, §50). No DOM/Alpine.

import { STATS_RETENTION_DAYS } from './config.js'

const ZERO = { answered: 0, correct: 0, wrong: 0, unknown: 0, newWords: 0, alreadyKnown: 0 }

const pad = n => String(n).padStart(2, '0')
export const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Local midnight arithmetic, DST-safe.
const daysAgo = (now, n) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - n)

export const getDay = (stats, key) => ({ ...ZERO, ...stats[key] })

// True if no direction of this card has ever had a completed interaction.
// Call with the card's progress *before* applying the current interaction.
export const isFirstInteraction = cardProgress =>
  !Object.values(cardProgress ?? {}).some(item => item?.lastResult)

// result: 'correct' | 'wrong' | 'unknown' | 'known'. Mutates and returns stats.
// Only correct/wrong are answers; accuracy = correct / answered (§29).
export function recordInteraction(stats, now, result, firstForCard) {
  const key = dayKey(now)
  const d = getDay(stats, key)
  if (result === 'known') d.alreadyKnown++
  else if (result === 'unknown') d.unknown++
  else { d.answered++; d[result]++ }
  if (firstForCard) d.newWords++
  stats[key] = d
  return prune(stats, now)
}

export function prune(stats, now) {
  const oldest = dayKey(daysAgo(now, STATS_RETENTION_DAYS - 1))
  for (const key of Object.keys(stats)) if (key < oldest) delete stats[key]
  return stats
}

// For the progress screen: today, yesterday, and 30 days oldest → newest.
export function summary(stats, now) {
  const days = []
  for (let i = STATS_RETENTION_DAYS - 1; i >= 0; i--) {
    const date = dayKey(daysAgo(now, i))
    days.push({ date, ...getDay(stats, date) })
  }
  return { today: days.at(-1), yesterday: days.at(-2), days }
}
