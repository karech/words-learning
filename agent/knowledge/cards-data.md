# Cards data

- `data/cards.json` = `{ "cards": [...] }`, no `version` field.
- Normalization (trim, lowercase, ё→е) lives in `js/distractors.js` `normalize`; validator imports it. Never reimplement.
- Validator: `node scripts/validate-cards.js`; previous = latest `data/history/*.cards.json`; all history files scanned for id reuse.
- History files named by archive UTC datetime, `:` → `-`.
- `data/cards.json` generated from `docs/serbian-words.md` (one row = one meaning = one card; `ID` column links rows to cards; `skip: …` = considered, no card).
- Expected validator warnings: same translation `сказать` (reći/kazati), `заказать` (poručiti/naručiti).
- Tests read the live `data/cards.json` — never assert specific words/ids from it.
- Distractor simulation (§49) can't fail with valid data today (3 fallbacks always suffice) — regression guard only.
