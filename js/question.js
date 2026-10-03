// Question display state after an action (spec §23–25a). Pure, Node-testable.
// result: null (question) | 'correct' | 'wrong' | 'unknown' ("Не знаю").

export function answerClass(i, { correctIndex }, result, selected) {
  if (!result) return ''
  if (i === correctIndex) return 'is-correct'
  return result === 'wrong' && i === selected ? 'is-wrong' : ''
}

// { title, titleClass, line, example } for the feedback area; null before any action.
export function feedback({ card, direction, example }, result) {
  if (!result) return null
  const wrong = result === 'wrong'
  const prefix = wrong ? 'Правильно: ' : ''
  return {
    title: { correct: 'Верно', wrong: 'Ошибка', unknown: '' }[result],
    titleClass: wrong ? 'is-wrong' : 'is-correct',
    // RU→SR always reveals word + pronunciation; SR→RU repeats the answer only when wrong.
    line: direction === 'ru-sr' ? `${prefix}${card.word} · ${card.pronunciation}`
      : wrong ? `${prefix}${card.translation}` : '',
    example: direction === 'sr-ru' ? example.ru : example.sr,
  }
}
