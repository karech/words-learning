// Answer options: 1 correct + 3 distractors (spec §38–40). No DOM/Alpine.
// Shared with scripts/validate-cards.js — do not reimplement there.

import { DISTRACTOR_DIFFICULTY_WINDOW } from './config.js'

export const normalize = s => s.trim().toLowerCase().replaceAll('ё', 'е')

// 'sr-ru' → answers are Russian translations; 'ru-sr' → answers are Serbian words.
const answerOf = (card, direction) => direction === 'sr-ru' ? card.translation : card.word

const sameGroup = (a, b) => a.groups.some(g => b.groups.includes(g))

// Dynamic tiers in priority order; card.distractors fallback sits between tier 0 and 1 (§39).
const TIERS = [
  (a, b) => a.partOfSpeech === b.partOfSpeech && a.difficulty === b.difficulty && sameGroup(a, b),
  (a, b) => a.partOfSpeech === b.partOfSpeech && Math.abs(a.difficulty - b.difficulty) <= DISTRACTOR_DIFFICULTY_WINDOW && sameGroup(a, b),
  (a, b) => a.partOfSpeech === b.partOfSpeech && Math.abs(a.difficulty - b.difficulty) <= DISTRACTOR_DIFFICULTY_WINDOW,
  (a, b) => a.partOfSpeech === b.partOfSpeech,
]

function shuffle(arr, random = Math.random) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Returns { options: string[4], correctIndex } or null when 3 distractors can't be found.
export function buildOptions(card, cards, direction, random = Math.random) {
  const correct = answerOf(card, direction)
  const taken = new Set([normalize(correct)])
  const picked = []
  const word = normalize(card.word)
  const translation = normalize(card.translation)

  const add = values => {
    for (const v of shuffle(values, random)) {
      if (picked.length === 3) return
      const n = normalize(v)
      if (taken.has(n)) continue
      taken.add(n)
      picked.push(v)
    }
  }

  const candidates = cards.filter(c =>
    c.id !== card.id &&
    normalize(c.word) !== word &&
    // RU→SR: a card with the same translation would be a second correct answer
    !(direction === 'ru-sr' && normalize(c.translation) === translation))

  const fromTier = tier => candidates.filter(c => tier(card, c)).map(c => answerOf(c, direction))

  add(fromTier(TIERS[0]))
  add(card.distractors[direction === 'sr-ru' ? 'ru' : 'sr'])
  for (const tier of TIERS.slice(1)) add(fromTier(tier))

  if (picked.length < 3) return null

  const correctIndex = Math.floor(random() * 4)
  const options = [...picked]
  options.splice(correctIndex, 0, correct)
  return { options, correctIndex }
}
