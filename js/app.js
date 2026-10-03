// UI glue only: calls cards/scheduler/distractors/stats/storage/question (spec §55).

import Alpine from '../vendor/alpine.esm.min.js'
import { loadCards, pickExample } from './cards.js'
import { buildOptions } from './distractors.js'
import * as pwa from './pwa.js'
import * as question from './question.js'
import * as scheduler from './scheduler.js'
import { isFirstInteraction, recordInteraction, summary } from './stats.js'
import * as storage from './storage.js'

Alpine.data('app', () => ({
  view: 'learn',
  error: '',
  dataset: null,
  progress: storage.loadProgress(),
  stats: storage.loadStats(),
  settings: storage.loadSettings(),
  session: scheduler.createSession(),

  // Current question: { card, direction, prompt, example, options, correctIndex }
  q: null,
  result: null,   // null | 'correct' | 'wrong' | 'unknown'
  selected: null, // chosen option index (regular answer only)

  get locked() { return this.result !== null }, // answers, Уже знаю / Не знаю disabled; Дальше enabled
  get fb() { return question.feedback(this.q, this.result) },
  answerClass(i) { return question.answerClass(i, this.q, this.result, this.selected) },

  async init() {
    pwa.localVersion()
      .then(v => { this.version = v; return pwa.setup(v) })
      .catch(e => console.warn('version', e))
    try {
      this.dataset = await loadCards()
    } catch (e) {
      this.error = 'Не удалось загрузить карточки.'
      console.error(e)
      return
    }
    this.next()
  },

  next() {
    const { cards } = this.dataset
    const pick = scheduler.nextItem({
      cards, progress: this.progress, settings: this.settings, session: this.session, now: Date.now(),
    })
    // Validator guarantees options can be built for valid data (§49).
    const built = pick && buildOptions(pick.card, cards, pick.direction)
    if (!built) {
      this.q = null
      this.error = 'Нет карточек для показа.'
      return
    }

    scheduler.markShown(this.progress, pick.card.id, pick.direction, Date.now())
    storage.saveProgress(this.progress)
    this.result = null
    this.selected = null
    this.q = {
      ...pick,
      ...built,
      prompt: pick.direction === 'sr-ru' ? pick.card.word : pick.card.translation,
      example: pickExample(pick.card),
    }
  },

  // Shared bookkeeping for every completed interaction: progress + daily stats (§29).
  act(result, updateProgress) {
    const { card, direction } = this.q
    const first = isFirstInteraction(this.progress[card.id])
    updateProgress({ progress: this.progress, session: this.session, cardId: card.id, direction, now: Date.now() })
    recordInteraction(this.stats, new Date(), result, first)
    storage.saveProgress(this.progress)
    storage.saveStats(this.stats)
  },

  choose(i) {
    if (this.locked) return
    const correct = i === this.q.correctIndex
    this.act(correct ? 'correct' : 'wrong', args => scheduler.answer({ ...args, correct }))
    this.selected = i
    this.result = correct ? 'correct' : 'wrong'
  },

  // "Не знаю" (§25a): reveal the answer, no Верно/Ошибка.
  markUnknown() {
    if (this.locked) return
    this.act('unknown', scheduler.markUnknown)
    this.result = 'unknown'
  },

  // "Уже знаю" (§33): no feedback state, go straight to the next card.
  markKnown() {
    if (this.locked) return
    this.act('known', scheduler.markKnown)
    this.next()
  },

  // --- Progress + settings (§28–30). Settings apply from the next card. ---

  updating: false,
  updateMessage: '',
  version: '', // deploy UTC datetime from version.txt; '' = local dev

  get summary() { return summary(this.stats, new Date()) },
  get maxDay() { return Math.max(1, ...this.summary.days.map(d => d.answered)) },

  setDirection(direction) {
    this.settings.direction = direction
    scheduler.filterRetry(this.session, direction)
    storage.saveSettings(this.settings)
  },

  setNewWords(newWords) {
    this.settings.newWords = newWords
    storage.saveSettings(this.settings)
  },

  // §43: one version for app + cards. Different on the server → reinstall everything.
  async update() {
    this.updating = true
    this.updateMessage = ''
    try {
      if ((await pwa.remoteVersion()) === this.version) {
        this.updateMessage = 'Уже актуально.'
      } else {
        this.updateMessage = 'Обновляю, перезапуск…'
        await pwa.reinstall()
        return
      }
    } catch (e) {
      console.error(e)
      this.updateMessage = 'Не удалось проверить обновление.'
    }
    this.updating = false
  },

  // §51: progress + stats only; cards and settings stay.
  reset() {
    if (!confirm('Сбросить весь прогресс и статистику? Это нельзя отменить.')) return
    storage.resetProgress()
    this.progress = {}
    this.stats = {}
    this.session = scheduler.createSession()
    this.next()
  },
}))

Alpine.start()
