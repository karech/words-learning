// All tunables live here (spec §56). Each comment: what it controls → effect of changing it.

const MINUTE = 60 * 1000
const DAY = 24 * 60 * MINUTE

// Review delay for each scheduler level (index = level), ms (spec §32).
// Larger values → reviews come less often; smaller → more aggressive repetition.
export const INTERVALS = [0, 10 * MINUTE, 1 * DAY, 3 * DAY, 7 * DAY, 14 * DAY, 30 * DAY]

// Highest scheduler level; also the level set by "Уже знаю" (spec §33). Derived from INTERVALS.
export const MAX_LEVEL = INTERVALS.length - 1

// Levels gained after a correct answer.
// Higher → items reach long intervals faster.
export const CORRECT_LEVEL_STEP = 1

// Levels lost after a wrong answer or "Не знаю".
// Higher → failures are more punitive, items return to short intervals.
export const FAILURE_LEVEL_STEP = 2

// Pool probabilities for each "Новые слова" setting (spec §35).
// More `new` weight → unseen cards are introduced faster, fewer reviews per session.
export const POOL_WEIGHTS = {
  less:   { review: 0.75, new: 0.15, fresh: 0.10 },
  normal: { review: 0.65, new: 0.25, fresh: 0.10 },
  more:   { review: 0.55, new: 0.35, fresh: 0.10 },
}

// Max introduced-but-not-tier-mastered cards in the active tier, per "Новые слова" setting (spec §35a).
// Reaching it pauses the New pool. Higher → more new vocabulary open at once.
export const MAX_ACTIVE_LEARNING = {
  less: 20,
  normal: 40,
  more: 60,
}

// Cumulative correct answers (SR→RU + RU→SR) for a card to count as mastered for tier progression (spec §35a).
// Higher → slower tier progression, more repetition before new vocabulary opens.
export const TIER_MASTERY_CORRECT = 10

// Max introduced-but-unmastered cards a tier may keep and still count as complete (spec §35a).
// Smaller → more complete mastery required before the next tier opens.
export const TIER_MAX_UNMASTERED = 10

// A wrong / "Не знаю" item reappears after RETRY_MIN..RETRY_MAX other questions (spec §32).
// Smaller → failed items come back sooner within the session.
export const RETRY_MIN = 5
export const RETRY_MAX = 10

// Recently shown card ids excluded from normal selection (spec §37).
// Higher → fewer immediate repeats and reverse-direction echoes; too high starves small datasets.
export const RECENT_EXCLUSION = 3

// Weighted-random selection inside a pool (spec §36). Higher coefficient → that signal matters more.
export const PRIORITY = {
  base: 1,              // baseline weight every item gets
  errorRate: 2,         // favours items with a high wrong/answered ratio
  lowLevel: 1.5,        // favours items at low scheduler levels
  overdue: 1.5,         // favours items long past their due time
  overdueMax: 2,        // cap on the overdue factor (in multiples of the interval)
  lastFailureBonus: 1,  // extra weight when lastResult is wrong | unknown
  intervalFloor: 10 * MINUTE, // minimum interval used for the overdue factor (avoids /0 at level 0)
}

// After the action slot changes, taps are ignored for this long, ms (spec §22).
// Higher → fewer accidental double taps, but the UI feels slower.
export const TAP_GUARD_MS = 300

// Local calendar days kept in daily statistics (spec §50).
// Higher → longer history on the progress screen, more localStorage used.
export const STATS_RETENTION_DAYS = 30
