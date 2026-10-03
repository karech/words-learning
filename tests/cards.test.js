import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pickExample } from '../js/cards.js'

test('pickExample covers first and last example', () => {
  const card = { examples: [{ sr: 'a', ru: 'а' }, { sr: 'b', ru: 'б' }] }
  assert.equal(pickExample(card, () => 0).sr, 'a')
  assert.equal(pickExample(card, () => 0.999).sr, 'b')
})
