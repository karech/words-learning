// "Все слова" screen (spec §30a): a read-only view over cards + progress. No DOM/Alpine.

import { TIER_MASTERY_CORRECT } from './config.js'
import { normalize } from './distractors.js'
import { calculateActiveTier, isCardIntroduced, isCardMastered, markUnknown, totalCorrect } from './scheduler.js'
import { interact } from './stats.js'

const STATUS_LABEL = { mastered: 'Выучено', learning: 'В изучении', new: 'Новое', later: 'Позже' }

const sr = new Intl.Collator('sr-Latn')
const ru = new Intl.Collator('ru')
const byPriorityWord = (a, b) =>
  a.priority - b.priority || sr.compare(a.word, b.word) || ru.compare(a.translation, b.translation)

// Same helpers as tier progression (§35a). Unseen cards: active tier → new, later tiers → later.
export function wordRow(card, progress, activeTier) {
  const correct = totalCorrect(card.id, progress)
  const status = isCardMastered(card.id, progress) ? 'mastered'
    : isCardIntroduced(card.id, progress) ? 'learning'
    : card.priority > activeTier ? 'later' : 'new'
  const mark = { mastered: '✓', learning: `${correct}/${TIER_MASTERY_CORRECT}`, new: '', later: '—' }[status]
  return { card, status, label: STATUS_LABEL[status], mark, canAdd: status === 'new' || status === 'later' }
}

// [{ priority, mastered, total, rows }], priority ascending, Serbian word order inside.
// Counts cover the whole priority; `query` (word or translation, case-insensitive) only filters rows.
export function wordGroups(cards, progress, query = '') {
  const q = normalize(query)
  const activeTier = calculateActiveTier(cards, progress)
  const groups = new Map()
  for (const card of [...cards].sort(byPriorityWord)) {
    const g = groups.get(card.priority) ?? { priority: card.priority, mastered: 0, total: 0, rows: [] }
    groups.set(card.priority, g)
    const row = wordRow(card, progress, activeTier)
    g.total++
    if (row.status === 'mastered') g.mastered++
    if (!q || normalize(card.word).includes(q) || normalize(card.translation).includes(q)) g.rows.push(row)
  }
  return [...groups.values()].filter(g => g.rows.length)
}

// "Добавить в обучение" = "Не знаю" on SR→RU, the canonical introduction direction. No transition of its own.
export const addToLearning = ({ progress, stats, session, cardId, now }) =>
  interact({ progress, stats, session, cardId, direction: 'sr-ru', now, result: 'unknown', update: markUnknown })
