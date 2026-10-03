---
name: add-words
description: Grow docs/serbian-words.md with new Serbian words/meanings up to a target count. Use when asked to add words, extend the vocabulary list, or reach N words.
argument-hint: "<target total words, e.g. 2000> [extra source URLs]"
---

# Add words to the vocabulary source

Target: $ARGUMENTS

Rules live in `docs/vocabulary-source-update-instructions.md` — read it first and follow it. This file adds the procedure and decisions already made.

## Decisions (don't re-ask)

- "N words" = N distinct `Srpski` values (case-insensitive) in non-skip rows. Extra meanings of existing words are welcome but don't count.
- `Meaning` in Russian, short. `Priority` 1–10, ranked against existing rows (scale in the instructions). `Card` empty.
- Learner: beginner living in Serbia. Everyday A1→B1 first (shop, flat, transport, documents, health, people, small talk). B2/C1 only if clearly everyday.
- Skip: profanity, crime/war/police-drama words (subtitle noise), rare professions, academic/technical terms, near-synonyms whose Russian translation duplicates an existing card (validator warns) unless both are very common.
- No `skip` rows unless recording a variant is useful.
- Never move or edit imported (`sr_XXXXX`) rows, even if their meanings sit in different sections.

## Sources

Defaults (curl into `agent/tmp/`), plus anything passed in arguments:

- lernen level pages `https://thelernen.org/en/serbian/level/{a1,a2,b1}`. The blog "1000 most common words" page has no list. `#N` on level pages = frequency rank.
- Wiktionary raw: `https://en.wiktionary.org/w/index.php?title=Wiktionary:Frequency_lists/Serbian_wordlist&action=raw`. 10k OpenSubtitles tokens: inflected forms, ijekavian/Croatian variants (vrijeme, dijete, tko, točno), names, profanity. Lemmatize, keep ekavian.

## Procedure

1. Read `docs/serbian-words.md` fully. Run the count check. `need = target − current`.
2. Read sources. Select by hand — no scripts to filter, choose, or generate rows.
3. Plan a per-group budget summing exactly to `need`. Check every candidate against the whole file: same word + meaning → drop; same word, new meaning → row right after the existing one.
4. Add with Edit, anchored on the group's last row (unique via its `sr_` id). New group (`## Группа N — …` + table header) only if nothing fits.
5. Run all checks; fix and repeat until clean.
6. Report: count before → after, new groups, new meanings of existing words, flags. Commit only on request.

## Checks (read-only)

```bash
f=docs/serbian-words.md
# distinct words (non-skip) — must equal target
grep -E '^\| ' $f | grep -v -E '^\| Srpski|^\|---' | awk -F'|' '$5 !~ /skip/ {gsub(/^ +| +$/,"",$2); print tolower($2)}' | sort -u | wc -l
# duplicate word+meaning rows — expect none
grep -E '^\| ' $f | grep -v -E '^\| Srpski|^\|---' | awk -F'|' '{print $2"|"$3}' | sort | uniq -d
# rows without exactly 4 columns — expect none
grep -n '^|' $f | awk -F'|' 'NF!=6'
# new rows with ';', non-empty Card, or Priority not 1–10 — expect none
git diff -U0 $f | grep '^+| ' | grep -v '^+| Srpski' | awk -F'|' '$3 ~ /;/ || $5 !~ /^ *$/ || $4 !~ /^ (10|[1-9]) $/'
# imported rows untouched — 0 deleted lines, sr_ count unchanged
git diff --numstat $f; grep -c 'sr_0' $f
```