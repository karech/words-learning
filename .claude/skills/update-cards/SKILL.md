---
name: update-cards
description: Update data/cards.json from docs/serbian-words.md in batches. `new` creates cards for pending rows (empty Card) and backfills ids; `refresh` re-applies changed generation rules to existing cards without touching id/word/sense. Use when asked to generate, update or refresh cards, or sync cards with the word list.
argument-hint: "new [N] | refresh \"<what changed>\" [N] [from sr_XXXXX]"
---

# Update data/cards.json

Args: $ARGUMENTS

Rules live in `docs/vocabulary-cards-generation-spec.md` — read it first and follow it. Also read `agent/knowledge/cards-data.md`. This file adds the procedure and decisions already made.

## Modes

- `new [N]` (default) — next N pending rows (non-skip, empty `Card`) in source order → new cards, ids backfilled into the source.
- `refresh "<what changed>" [N] [from sr_XXXXX]` — next N existing cards → re-apply the changed rule. The spec must already describe the rule; if it doesn't, stop and ask.

N defaults to 100. One run = one batch, then stop and report. Next batch = next run.

## Hard rules (both modes)

- Edit tool only for `data/cards.json` and `docs/serbian-words.md`. No scripts (node, python, jq, sed, awk, heredoc) that write, generate, merge or reformat cards or rows. Never Write the whole `cards.json`. Bash = read-only checks.
- Before the first change of a run: `data/cards.json` must equal HEAD (`git diff --quiet data/cards.json`), then archive it unless the latest history file is identical — `cmp -s data/cards.json "$(ls data/history/*.cards.json | tail -1)" || cp data/cards.json "data/history/$(date -u +%Y-%m-%dT%H-%M-%SZ).cards.json"`. The validator compares against the latest archive; without it, id/word/sense checks are skipped.
- Batch feels too big to do by hand → make it smaller, don't script.
- Never change an existing card's `id`, `word`, `sense`, card order, or a row's `Srpski`/`Meaning`/`Priority`. A fix needs that → report a migration/source-data issue instead.
- `priority` = source row `Priority`, copied exactly, placed right after `partOfSpeech`. No `difficulty` field (removed; validator error).
- `cards.json` format: one card per line, 4-space indent, compact JSON, last card without trailing comma. Card k is on line k+2 — Read only the batch's lines (offset/limit).

## Decisions (don't re-ask)

- Every card: exactly 3 examples (spec §16); the validator enforces it.
- Source-data issue (spec §24–25): leave the row pending, list it in the report.
- Missing meanings noticed: report as suggestions only.
- `groups`: reuse existing tags (see checks); new tag only if nothing fits.
- Refresh changes only the fields the rule concerns (spec §26 mutable fields, plus any field the spec newly adds). Other problems spotted → list in the report, don't fix.
- Tightening the validator for a new rule happens after the last refresh batch, outside this skill.

## Procedure — new

1. Run checks — must be clean. next id = max id + 1.
2. Batch = first N pending rows in source order. Read those groups' existing cards — reuse style and groups, pick distractor neighbors, avoid synonyms as distractors.
3. Check each row for source-data issues. Issue → leave pending, note it.
4. Write the cards, ids monotonic in source order. Spec §29 checklist per card.
5. Insert with Edit, source order kept: a run of pending rows goes right before the card line of the next linked row (anchor `    {"id":"sr_XXXXX",`); at end of file anchor on the last card's tail and `  ]`.
6. Run checks; fix until clean. Review every new `same translation` warning (spec §11, §23).
7. Backfill ids into `Card` with Edit (one Edit per contiguous run). Rerun checks — mapping must be clean.

## Procedure — refresh

1. Run checks — must be clean.
2. Pick the batch:
   - rule checkable from data (field missing, fewer than 3 examples, …) → read-only filter listing non-compliant ids in file order, take first N. Rerun resumes by itself.
   - otherwise → N cards in file order from `from` (default first card).
3. Per card: read its line and its source row, rewrite the affected fields per the spec, Edit the line (old_string = full current line). Adjacent cards may share one Edit.
4. Run checks; fix until clean.

## Report (both modes)

Cards before → after (or refreshed count), id range, source-data/migration issues, suggested meanings, new groups, new warnings, and the exact command for the next batch (with `from <next id>` for non-filter refresh). Commit only on request; when committing a dataset to publish, archive it too: `cp data/cards.json "data/history/$(date -u +%Y-%m-%dT%H-%M-%SZ).cards.json"`.

## Checks (read-only)

```bash
node scripts/validate-cards.js
node --test
# max id ever used (cards, history, source)
grep -rohE 'sr_[0-9]{5}' data docs/serbian-words.md | sort | tail -1
# existing groups with counts
node -e 'const g={};for(const c of JSON.parse(require("fs").readFileSync("data/cards.json","utf8")).cards)for(const x of c.groups)g[x]=(g[x]||0)+1;console.log(Object.entries(g).sort((a,b)=>b[1]-a[1]).map(e=>e.join(":")).join(" "))'
# refresh filter, example rule "3 examples" — adapt the condition
node -e 'for(const c of JSON.parse(require("fs").readFileSync("data/cards.json","utf8")).cards)if(c.examples.length!==3)console.log(c.id)' | head -100
# source ↔ cards: same order/id/word for linked rows (priority match is checked by the validator too)
node -e '
const fs = require("fs")
const rows = fs.readFileSync("docs/serbian-words.md", "utf8").split("\n")
  .filter(l => l.startsWith("| ") && !l.startsWith("| Srpski"))
  .map(l => l.split("|").map(s => s.trim()))
  .filter(r => !r[4].startsWith("skip"))
const cards = JSON.parse(fs.readFileSync("data/cards.json", "utf8")).cards
const linked = rows.filter(r => r[4]).map(r => r[4] + " " + r[1])
const got = cards.map(c => c.id + " " + c.word)
console.log(`pending ${rows.length - linked.length}, linked ${linked.length}, cards ${cards.length}`)
const n = Math.max(linked.length, got.length)
let i = 0
while (i < n && linked[i] === got[i]) i++
if (i < n) console.log(`order/id/word mismatch at #${i}: source ${linked[i]} | cards ${got[i]}`)
const prio = new Map(rows.filter(r => r[4]).map(r => [r[4], Number(r[3])]))
const badPrio = cards.filter(c => c.priority !== prio.get(c.id)).map(c => c.id)
if (badPrio.length) console.log(`priority mismatch ${badPrio.length}: ${badPrio.slice(0, 10).join(" ")}`)
'
```

In `new`, between steps 5 and 7 the mapping check reports a mismatch (cards inserted, ids not yet backfilled) — expected; it must be clean after step 7.
