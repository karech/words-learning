// All tunables live here (spec §56).

const MINUTE = 60 * 1000
const DAY = 24 * 60 * MINUTE

// level → interval until next review, ms (spec §32)
export const INTERVALS = [0, 10 * MINUTE, 1 * DAY, 3 * DAY, 7 * DAY, 14 * DAY, 30 * DAY]
export const MAX_LEVEL = INTERVALS.length - 1

// spec §35
export const POOL_WEIGHTS = {
  less:   { review: 0.75, new: 0.15, fresh: 0.10 },
  normal: { review: 0.65, new: 0.25, fresh: 0.10 },
  more:   { review: 0.55, new: 0.35, fresh: 0.10 },
}

// spec §32: wrong answer reappears after this many other questions
export const RETRY_MIN = 5
export const RETRY_MAX = 10

// spec §37
export const RECENT_EXCLUSION = 3

// spec §36
export const PRIORITY = {
  base: 1,
  errorRate: 2,
  lowLevel: 1.5,
  overdue: 1.5,
  overdueMax: 2,
  lastFailureBonus: 1, // lastResult wrong | unknown
  intervalFloor: 10 * MINUTE,
}

// spec §50
export const STATS_RETENTION_DAYS = 30
