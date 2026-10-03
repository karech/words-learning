// Card dataset: load, example pick (spec §5, §9). No DOM/Alpine.

// Relative to the page, not this module — works under the Pages subpath.
export async function loadCards(url = 'data/cards.json') {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`cards.json: HTTP ${res.status}`)
  return res.json()
}

// Random each time, no history (spec §9).
export function pickExample(card, random = Math.random) {
  return card.examples[Math.floor(random() * card.examples.length)]
}
