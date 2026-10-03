# Cards data

- `data/cards.json` = `{ "cards": [...] }`, no `version` field. One card per line; `priority` right after `partOfSpeech`.
- No `difficulty` field (removed 2026-10-03); validator errors on it in the current dataset. History files may keep it — only id/word/sense read there; never rewrite history.
- Normalization (trim, lowercase, ё→е) lives in `js/distractors.js` `normalize`; validator imports it. Never reimplement.
- Validator: `node scripts/validate-cards.js`; previous = latest `data/history/*.cards.json` (none since 2026-10-03 migration → identity checks skipped); all history files scanned for id reuse.
- Validator also reads `docs/serbian-words.md`: Priority 1–10 on non-skip rows, empty on skip rows, linked row Priority == `card.priority`. Prints priority distribution (never fails).
- Every card: exactly 3 examples (validator error otherwise).
- History files named by archive UTC datetime, `:` → `-`.
- `data/cards.json` generated from `docs/serbian-words.md` (`| Srpski | Meaning | Priority | Card |`; Meaning always Russian; one row = one meaning = one card; `Card` links rows to cards; `skip: …` = considered, no card, Priority empty).
- Source parsing: split row by `|`, trim → `[, srpski, meaning, priority, card]`. Skills/validator depend on this column order.
- Adding rows to `docs/serbian-words.md`: follow `docs/vocabulary-source-update-instructions.md`; new rows get Priority + empty `Card`.
- Growing `docs/serbian-words.md`: `/add-words <target>` skill (`.claude/skills/add-words/`). Cards: `/update-cards` skill.
- Validator has no expected warnings. Synonyms get distinct translations via qualifiers: `kazati` "сказать (= reći)", `poručiti` "заказать (в кафе)", `naručiti` "заказать (доставку, такси)".
- Distractors exclude candidates whose translation matches after stripping `(…)` qualifiers (both directions) → synonyms never option each other. Qualifier must be in parentheses.
- Distractor order: POS+group → card fallback → POS; within a tier shuffled, then nearer `priority` first.
- Tests read the live `data/cards.json` — never assert specific words/ids from it; filter to the errors under test.
- Distractor simulation (§49) can't fail with valid data today (3 fallbacks always suffice) — regression guard only.
