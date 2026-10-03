// localStorage read/write (spec §41). Corrupt or missing values fall back to defaults.
// `store` is injectable for Node tests.

const KEYS = {
  progress: 'vocab.progress.v1',
  stats: 'vocab.stats.v1',
  settings: 'vocab.settings.v1',
}

const DIRECTIONS = ['mixed', 'sr-ru', 'ru-sr']
const NEW_WORDS = ['less', 'normal', 'more']
export const DEFAULT_SETTINGS = { direction: 'mixed', newWords: 'normal' }

function read(key, store) {
  try {
    const v = JSON.parse(store.getItem(key))
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {}
  } catch {
    return {}
  }
}

function write(key, value, store) {
  try {
    store.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn(`storage: ${key} not saved`, e) // quota / private mode
  }
}

export const loadProgress = (store = localStorage) => read(KEYS.progress, store)
export const saveProgress = (progress, store = localStorage) => write(KEYS.progress, progress, store)

export const loadStats = (store = localStorage) => read(KEYS.stats, store)
export const saveStats = (stats, store = localStorage) => write(KEYS.stats, stats, store)

export function loadSettings(store = localStorage) {
  const s = read(KEYS.settings, store)
  return {
    direction: DIRECTIONS.includes(s.direction) ? s.direction : DEFAULT_SETTINGS.direction,
    newWords: NEW_WORDS.includes(s.newWords) ? s.newWords : DEFAULT_SETTINGS.newWords,
  }
}
export const saveSettings = (settings, store = localStorage) => write(KEYS.settings, settings, store)

// Reset (spec §51): progress + stats only; settings and cards stay.
export function resetProgress(store = localStorage) {
  store.removeItem(KEYS.progress)
  store.removeItem(KEYS.stats)
}
