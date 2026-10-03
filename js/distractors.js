// Answer options: 1 correct + 3 distractors (spec §38–40). No DOM/Alpine.
// Shared with scripts/validate-cards.js — do not reimplement there.

export const normalize = s => s.trim().toLowerCase().replaceAll('ё', 'е')

// Translation without qualifiers: "заказать (в кафе)" → "заказать". Synonyms share it (§40).
const baseTranslation = s => normalize(s.replace(/\(.*?\)/g, ''))

// 'sr-ru' → answers are Russian translations; 'ru-sr' → answers are Serbian words.
const answerOf = (card, direction) => direction === 'sr-ru' ? card.translation : card.word

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
  const translation = baseTranslation(card.translation)

  const add = values => {
    for (const v of values) {
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
    // Same translation up to qualifiers = synonym: a second correct answer in RU→SR, a near-copy in SR→RU
    baseTranslation(c.translation) !== translation)

  // Random order, then nearer priority first (stable sort keeps the shuffle within equal distance).
  const distance = c => Math.abs(c.priority - card.priority)
  const answers = list => shuffle(list, random)
    .sort((a, b) => distance(a) - distance(b))
    .map(c => answerOf(c, direction))

  // Same POS + group, then the card.distractors fallback, then same POS only (§39).
  const samePos = candidates.filter(c => c.partOfSpeech === card.partOfSpeech)
  add(answers(samePos.filter(c => c.groups.some(g => card.groups.includes(g)))))
  add(shuffle(card.distractors[direction === 'sr-ru' ? 'ru' : 'sr'], random))
  add(answers(samePos))

  if (picked.length < 3) return null

  const correctIndex = Math.floor(random() * 4)
  picked.splice(correctIndex, 0, correct)
  return { options: picked, correctIndex }
}
