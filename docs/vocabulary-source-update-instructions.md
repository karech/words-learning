# Vocabulary Source Update Instructions

This document defines the rules for an agent whose responsibility is to **extend and maintain the curated vocabulary source** used to generate `data/cards.json`.

The source file should remain thin and human-readable.

It defines:

```text
WHAT should be learned
+
WHEN that meaning should enter the learning progression
```

It does not define the full card representation.

The vocabulary-source agent does **not** generate pronunciation, examples, distractors, part-of-speech metadata, difficulty, runtime semantic groups, or other generated card fields.

---

## 1. Role of the Vocabulary Source

The vocabulary source is authoritative for:

- which Serbian lexical items should be learned;
- which distinct semantic meanings should be learned;
- the learning priority of each exact semantic meaning;
- the processing state of each row:
  - pending;
  - imported into `cards.json`;
  - intentionally skipped.

The cards generator later derives:

- `id`;
- `sense`;
- final Russian `translation`;
- `pronunciation`;
- `partOfSpeech`;
- `difficulty`;
- semantic runtime `groups`;
- exactly 3 examples;
- distractors;
- other generated card metadata.

The vocabulary-source agent decides:

```text
WHAT should be learned
+
WHEN it should enter the beginner learning progression
```

The cards generator decides:

```text
HOW that approved meaning is represented in the application
```

---

## 2. Table Format

Use:

```md
| Srpski | Meaning | Priority | Card |
|---|---|---:|---|
```

Example:

```md
| vreme | время | 1 | sr_00411 |
| vreme | погода | 2 | |
| sad | сейчас, разговорная форма | | skip: variant sada |
```

### `Srpski`

Canonical Serbian lexical form.

### `Meaning`

Short Russian semantic description identifying exactly what should be learned. Always Russian: this is a Serbian–Russian app.

It is semantic source metadata, not necessarily the final Russian UI translation.

### `Priority`

Learning-order tier for this exact semantic meaning.

Allowed values:

```text
1–10
```

Skip rows leave this field empty.

### `Card`

Allowed values:

```text
(empty)
sr_00123
skip: ...
```

---

## 3. One Non-Skip Row = One Meaning

Each non-skip row represents exactly one future semantic card.

If one Serbian word has several materially different everyday meanings, create separate rows.

Correct:

```md
| vreme | время | 1 | |
| vreme | погода | 2 | |
```

Incorrect:

```md
| vreme | время; погода | 1 | |
```

Another example:

```md
| račun | счёт, который нужно оплатить | 1 | |
| račun | банковский счёт | 2 | |
| račun | расчёт, вычисление | 7 | |
```

---

## 4. Do Not Over-Split Meanings

Do not create separate rows for:

- near-synonymous translations of one meaning;
- tiny contextual nuances;
- the same meaning used in different situations.

For example:

```text
samo → only / merely
```

is normally one semantic entry.

Likewise, do not split:

```text
račun → bill to be paid
```

into separate meanings for restaurants, cafes, and bars.

---

## 5. Priority Scale

Priority is an **internal learning-order tier**.

It is not linguistic difficulty and not a strict official CEFR label.

Use:

```text
1  — Core ~100: the most essential beginner meanings
2  — Next ~200: the next most useful everyday meanings
3  — Next ~500: broader basic vocabulary
4  — A1, higher-priority remainder
5  — A1, lower-priority / more situational
6  — A2, higher-priority
7  — A2, lower-priority / more specific
8  — B1
9  — B2
10 — C1+
```

The approximate sizes of tiers `1–3` are targets, not hard limits.

Semantic usefulness is more important than hitting an exact count.

---

## 6. Priority Is Per Semantic Meaning

Priority belongs to a row/meaning, not merely to the Serbian spelling.

Different meanings of the same word may have different priorities.

Example:

```md
| račun | счёт, который нужно оплатить | 1 | |
| račun | банковский счёт | 2 | |
| račun | расчёт, вычисление | 7 | |
```

Do not automatically copy one priority to every sense of a word.

---

## 7. Priority Assignment Guidance

### Priority 1 — Core ~100

The meanings a complete beginner needs first.

Typical categories:

- yes/no;
- pronouns;
- question words;
- essential conjunctions/prepositions;
- basic location/time words;
- essential verbs;
- essential shopping/food/service vocabulary;
- core numeric building blocks;
- extremely common daily nouns and adjectives.

### Priority 2 — Next ~200

Very common everyday vocabulary needed immediately after the core.

### Priority 3 — Next ~500

Broader foundational vocabulary useful in normal everyday life.

### Priority 4–5 — A1

Remaining A1-range vocabulary:

- `4` = more useful/common;
- `5` = more situational/lower-priority.

### Priority 6–7 — A2

A2-range vocabulary:

- `6` = more useful/common;
- `7` = more specific/lower-priority.

### Priority 8 — B1

Intermediate vocabulary that should not enter early beginner learning.

### Priority 9 — B2

Upper-intermediate vocabulary.

### Priority 10 — C1+

Advanced, abstract, specialized, or otherwise late-stage vocabulary.

---

## 8. CEFR Guidance Is Approximate

Do not treat CEFR as an objectively exact property of an individual word.

For priorities `4–10`, estimate pragmatically using:

- everyday usefulness;
- frequency;
- semantic complexity;
- typical learner stage;
- how likely the meaning is to be needed in daily life.

The purpose is useful learning order, not formal CEFR certification.

---

## 9. Serbian Spelling and Canonical Form

For `Srpski`, use:

- Serbian Latin script;
- canonical spelling;
- lowercase unless capitalization is inherently required;
- dictionary/base form where appropriate.

Prefer:

```text
raditi
dobar
prodavnica
kuća
vreme
taman
```

rather than ordinary inflected forms such as:

```text
radim
dobrog
prodavnice
tamna
tamnu
```

unless the form itself is genuinely a distinct lexical item.

---

## 10. Inflected Forms

Ordinary conjugated or declined forms do **not** become separate vocabulary cards when they are simply grammatical forms of an existing lemma.

Examples:

```md
| biti | быть | 1 | sr_00035 |
| sam | форма biti, 1-е лицо ед. ч. | | skip: inflection biti |
| si | форма biti, 2-е лицо ед. ч. | | skip: inflection biti |
```

For adjectives:

```text
taman
```

can represent the lexical meaning `dark`.

Do not separately add ordinary forms such as:

```text
tamna
tamnu
tamnog
```

These forms should appear naturally in card examples instead.

---

## 11. Colloquial and Alternative Forms

If a form is a colloquial/spelling/alternative variant and does not need its own learning card, it may be recorded as a skip row.

Example:

```md
| sada | сейчас | 1 | sr_00015 |
| sad | сейчас, разговорная форма | | skip: variant sada |
```

Use skip rows only when recording the reviewed variant is useful.

---

## 12. How to Write `Meaning`

`Meaning` should be:

- short;
- clear;
- written in Russian;
- specific enough to distinguish senses.

Good:

```text
время
погода
банковский счёт
счёт, который нужно оплатить
ключ от двери
ключ к решению
```

Bad:

```text
значение 1
другое значение
вариант
счёт
счёт
```

Do not optimize this text for final UI wording. The card generator will choose the canonical Russian translation separately.

---

## 13. Duplicate Search Is Mandatory

Before adding a semantic row, search the **entire source**.

Compare semantic identity, not only exact text.

### Same word + same meaning

If it already exists, add nothing.

Do not create a direct duplicate skip row.

### Same word + new meaning

Add a new row next to the other meanings of the same word.

### Variant/inflection of an existing lexical item

Do not create a normal card row.

When useful, record:

```text
skip: inflection <lemma>
skip: variant <lemma>
```

---

## 14. Number Vocabulary

Treat numbers as a compositional system rather than generating an independent vocabulary card for every numeric value.

Ensure the essential building blocks are represented:

```text
0    nula
1    jedan
2    dva
3    tri
4    četiri
5    pet
6    šest
7    sedam
8    osam
9    devet
10   deset
100  sto
1000 hiljada
```

These are high-priority vocabulary, normally around Priority `1`.

Do not mechanically add arbitrary standalone entries such as:

```text
90
200
300
400
```

or every possible tens/hundreds value merely for numeric coverage.

A future numbers-specific exercise can teach composition more effectively.

---

## 15. `Card` Column

### Pending

An empty `Card` means the semantic meaning is approved but has not yet been generated.

For every new semantic entry, leave `Card` empty.

The vocabulary-source agent never assigns `sr_XXXXX`.

### Imported

```text
sr_00123
```

means the row is already linked to a card.

Do not casually change, reuse, or move that ID.

### Skip

Use standardized reasons when possible:

```text
skip: duplicate <reference>
skip: variant <reference>
skip: inflection <reference>
skip: proper-name
skip: non-serbian
skip: not-useful
```

Skip rows have empty Priority.

---

## 16. What the Agent May Change

The vocabulary-source agent may:

- add a new Serbian lexical item;
- add a materially different meaning of an existing word;
- assign a Priority `1–10` to a new semantic row;
- add a useful skip row for an inflection/variant;
- create a new human-readable section if needed;
- clarify a pending row before import without changing semantic intent.

---

## 17. What the Agent Must Not Change Casually

Do not casually edit imported semantic identity.

For an imported row, do not change:

- `Srpski`;
- `Meaning`;
- `Card`;
- its semantic identity.

Do not manually invent an `sr_XXXXX`.

Changing Priority later is allowed when intentionally re-ranking learning order, because Priority is scheduling metadata rather than immutable lexical identity.

Identity corrections for imported rows require an explicit maintenance/migration task.

---

## 18. Row Ordering

Do not globally re-sort the source without an explicit migration.

Rules:

- keep existing rows stable where practical;
- put a new meaning near other meanings of the same Serbian word;
- put new words into a sensible human-readable section;
- create a new section only when useful.

Source sections are for readability only and are not runtime semantic groups.

---

## 19. Avoid Noise

Do not mechanically add every token encountered.

Skip or reject:

- malformed tokens;
- direct semantic duplicates;
- non-Serbian material;
- accidental proper names;
- technical noise;
- ordinary inflected forms instead of lemmas;
- extremely rare or practically useless dictionary senses.

Keep useful later-stage vocabulary and assign it a later Priority instead of deleting it merely because beginners do not need it immediately.

---

## 20. Polysemy

For common words, explicitly check for materially different everyday meanings.

Example:

```md
| vreme | время | 1 | |
| vreme | погода | 2 | |
```

Another example:

```md
| račun | счёт, который нужно оплатить | 1 | |
| račun | банковский счёт | 2 | |
| račun | расчёт, вычисление | 7 | |
```

Do not add obscure senses solely for dictionary completeness.

The vocabulary source is authoritative for which meanings exist.

---

## 21. Source Update Algorithm

For each candidate word:

1. Normalize Serbian spelling to the canonical lexical form.
2. Identify materially different everyday meanings worth learning.
3. Search the entire source for each semantic meaning.
4. If the same word + meaning already exists, add nothing.
5. If the word exists but the meaning is new, add a new row near it.
6. If the candidate is only an inflection/variant, use `skip` only when useful.
7. Assign Priority `1–10` based on the complete ranking system.
8. Leave `Card` empty for a new semantic row.
9. Never create an `sr_XXXXX`.
10. Never merge distinct meanings into one row.
11. Do not create arbitrary numeric-composition rows.
12. Do not turn ordinary inflections into vocabulary cards.

---

## 22. Quality Checklist

Before saving:

- each new row is genuinely useful;
- one row represents one semantic meaning;
- direct semantic duplicates do not exist;
- polysemous meanings are split where useful;
- each new non-skip row has Priority `1–10`;
- Priority reflects learning order rather than linguistic difficulty;
- Priority 1 is reserved for truly core vocabulary;
- numbers are represented by useful building blocks rather than arbitrary compositions;
- ordinary inflections are not normal cards;
- new rows have empty `Card`;
- no `sr_XXXXX` was manually created;
- imported semantic identity was not rewritten;
- later-stage useful vocabulary was not removed merely because it is lower priority.

---

## 23. Short Agent Instruction

> Maintain the vocabulary source as the authoritative list of **what should be learned and when it should enter learning**. One non-skip row represents one materially distinct Serbian lexical meaning. Search the entire source before adding a semantic duplicate. Assign every normal row a Priority from `1` to `10`: Core ~100, next ~200, next ~500, remaining A1 across 4–5, A2 across 6–7, B1 at 8, B2 at 9, and C1+ at 10. Priority belongs to the meaning, not only the spelling. Keep canonical lemmas rather than ordinary inflected forms. Treat numbers as compositional: keep essential building blocks such as 0–10, 100, and 1000 rather than arbitrary hundreds/tens. Leave `Card` empty for new rows and never assign or modify `sr_XXXXX` IDs without an explicit migration task.
