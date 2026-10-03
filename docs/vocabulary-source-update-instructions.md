# Vocabulary Source Update Instructions

This document defines the rules for an agent whose only responsibility is to **extend and maintain the curated vocabulary source** used later to generate `data/cards.json`.

The purpose of this source file is to keep a minimal, stable list of **what should be learned**.

This agent does **not** generate cards, does not assign card IDs, and does not produce pronunciation, examples, distractors, part-of-speech metadata, difficulty, semantic groups, or other generated card fields.

---

## 1. Role of the Vocabulary Source

The vocabulary source is the source of truth for:

- which Serbian lexical items should be learned;
- which distinct semantic meanings of each word should be learned;
- the processing state of each source row:
  - pending;
  - imported into `cards.json`;
  - intentionally skipped.

All derived card data is generated later by the cards generator:

- `id`;
- `sense`;
- final `translation`;
- `pronunciation`;
- `partOfSpeech`;
- `difficulty`;
- semantic `groups`;
- examples;
- distractors;
- other card metadata.

The vocabulary-source agent decides **WHAT to learn**.

The cards generator decides **HOW to represent it in the application**.

---

## 2. Table Format

Use this table format:

```md
| Srpski | Meaning | Card |
|---|---|---|
```

Example:

```md
| vreme | time | sr_00411 |
| vreme | weather | |
| sad | now, colloquial form | skip: variant sada |
```

### Columns

#### `Srpski`

The canonical Serbian lexical form.

#### `Meaning`

A short English semantic description that makes it clear **which exact meaning should be learned**.

This is a semantic hint for the cards generator. It does not have to be the final Russian translation shown in the application.

#### `Card`

Allowed values:

```text
(empty)
sr_00123
skip: ...
```

---

## 3. Fundamental Rule: One Row = One Meaning

Each non-skip row represents one future semantic card.

If one Serbian word has several materially different everyday meanings, create one row per meaning.

Correct:

```md
| vreme | time | |
| vreme | weather | |
```

Incorrect:

```md
| vreme | time; weather | |
```

Another example:

```md
| račun | bill to be paid | |
| račun | bank account | |
| račun | calculation | |
```

Different meanings must not be merged into one row.

---

## 4. Do Not Over-Split One Meaning

Do not create separate rows for:

- near-synonymous translations of the same meaning;
- tiny contextual nuances;
- the same meaning used in different situations.

For example, this is normally one semantic entry:

```text
samo → only / merely
```

not two separate rows.

Likewise:

```text
račun → bill to be paid
```

should normally remain one meaning rather than being split into:

```text
restaurant bill
cafe bill
bar bill
```

The source should capture materially different semantic meanings, not every usage context.

---

## 5. Serbian Spelling and Canonical Form

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
```

instead of ordinary inflected forms such as:

```text
radim
dobrog
prodavnice
```

unless the form itself is a distinct lexical item that should be learned independently.

---

## 6. Inflected Forms

Ordinary conjugated or declined forms do **not** create separate cards when they are simply grammatical forms of an existing lexical item.

Example:

```md
| biti | to be | sr_00035 |
| sam | first-person singular form of biti | skip: inflection biti |
| si | second-person singular form of biti | skip: inflection biti |
| je | third-person singular form of biti | skip: inflection biti |
```

The agent must distinguish between:

- a new lexical item;
- a new semantic meaning;
- an ordinary grammatical form of an existing item.

---

## 7. Colloquial and Alternative Forms

If a form is a colloquial, spelling, or alternative variant of an existing lexical item and does not need its own card, it may be kept as a `skip` row.

Example:

```md
| sada | now | sr_00015 |
| sad | now, colloquial form | skip: variant sada |
```

Such rows are useful when it is important to record that a variant has already been reviewed.

---

## 8. How to Write `Meaning`

`Meaning` should be:

- short;
- clear;
- specific enough to distinguish semantic senses;
- written in English.

Good examples:

```text
time
weather
bank account
bill to be paid
door key
solution key
```

Bad examples:

```text
meaning 1
another meaning
variant
account
account
```

If one Serbian word has multiple meanings, the descriptions must let the cards generator understand unambiguously which semantic meaning each row represents.

Do not try to optimize `Meaning` for the final UI wording. It is semantic source metadata.

---

## 9. Duplicate Search Is Mandatory

Before adding each new semantic row, search the **entire vocabulary source**, not only the current section.

Determine whether the same:

```text
Srpski + semantic meaning
```

already exists.

Semantic comparison matters more than exact wording.

---

### 9.1 Same Word + Same Meaning

If the same semantic entry already exists, **do not add another row**.

Example: the source already contains:

```md
| vreme | weather | sr_00412 |
```

and the new input again contains:

```text
vreme — weather
```

Result:

```text
do nothing
```

Do not add:

```md
| vreme | weather | skip: duplicate |
```

Direct semantic duplicates should simply not exist in the curated source.

---

### 9.2 Same Word + New Meaning

Add a new row.

Example: the source already contains:

```md
| vreme | time | sr_00411 |
```

and a new useful meaning is discovered:

```text
vreme — weather
```

Add:

```md
| vreme | weather | |
```

Place it next to the other `vreme` meanings whenever practical.

---

### 9.3 Same Meaning but Different Grammatical/Variant Form

If the entry is only an inflected or variant form of an existing lexical item, do not create a new card.

Where useful, record it as:

```text
skip: inflection ...
skip: variant ...
```

---

## 10. `Card` Column

### 10.1 Empty `Card`

An empty `Card` field means:

```text
this semantic entry has been approved in the vocabulary source,
but has not yet been generated into data/cards.json
```

The vocabulary-source agent must always leave `Card` empty for new semantic entries.

It must **never assign `sr_XXXXX` IDs**.

---

### 10.2 Imported Card

Example:

```text
sr_00123
```

means that this semantic row is already linked to a card in `data/cards.json`.

Such an ID must not be:

- changed;
- deleted casually;
- reused;
- moved to another source row;
- manually assigned to a new entry.

An imported source row is considered stable semantic identity.

---

### 10.3 `skip`

`skip` means the entry has been reviewed but should not produce a card.

Use a small standard set of reasons where possible:

```text
skip: duplicate <reference>
skip: variant <reference>
skip: inflection <reference>
skip: proper-name
skip: non-serbian
skip: not-useful
```

Where possible, `<reference>` should be the canonical Serbian lemma:

```text
skip: variant sada
skip: inflection biti
```

If useful and the canonical card already exists, an ID may be referenced:

```text
skip: duplicate sr_00015
```

Avoid long free-form explanations when a standard reason is enough.

---

## 11. What the Vocabulary-Source Agent May Change

The agent's primary job is to add new approved semantic entries.

It may:

- add a completely new Serbian word;
- add a new materially different meaning of an existing word;
- add a useful `skip` row for an inflection or variant;
- create a new human-readable section if no existing section fits;
- improve the wording of a pending row if the semantic intent is still unchanged and the row has no assigned card ID.

---

## 12. What the Agent Must Not Change

The vocabulary-source agent must **not edit imported semantic entries** casually.

If the source contains:

```md
| vreme | time | sr_00411 |
```

do not change it to:

```md
| vreme | period of time | sr_00411 |
```

merely because the new wording seems nicer.

Do not change:

- existing `sr_XXXXX` values;
- the semantic identity of imported rows;
- imported `Srpski` values;
- existing imported `Meaning` values without an explicit migration/correction task;
- skip decisions without a clear reason.

Corrections to already imported semantic identity are a separate maintenance/migration workflow.

---

## 13. Pending Rows

Rows with an empty `Card` field may be clarified before import if that improves semantic precision without changing the intended meaning.

Example:

```md
| račun | bill | |
```

may be clarified to:

```md
| račun | bill to be paid | |
```

if this is necessary to distinguish it from:

```md
| račun | bank account | |
```

Once an `sr_XXXXX` ID has been assigned, the semantic identity should be treated as stable.

---

## 14. Row Ordering

Do not re-sort the whole source file.

Rules:

- keep existing rows where they are unless there is a strong reason to move them;
- place a new meaning next to other meanings of the same Serbian word;
- place a completely new word in the most appropriate existing human-readable section;
- create a new section only when existing sections clearly do not fit.

---

## 15. Sections Are Only for Human Organization

Headings such as:

```md
## Group 1 — basic words and connectors
## Group 2 — pronouns and “to be”
## Group 3 — time
## Group 4 — shopping and money
```

exist only to make the source easier to read and maintain.

They are **not card semantic metadata**.

Do not build a strict taxonomy around source sections.

The cards generator assigns runtime `groups` independently.

---

## 16. Avoid Noise

Do not mechanically add every token found in a source list.

When processing candidate vocabulary, skip or mark entries appropriately if they are:

- malformed tokens;
- direct duplicates;
- non-Serbian material;
- accidental proper names;
- technical noise;
- ordinary inflected forms instead of lemmas;
- extremely rare or practically useless meanings.

The goal is practical Serbian vocabulary for everyday life, not dictionary completeness.

---

## 17. Polysemy

For common words, explicitly check whether there are multiple materially different everyday meanings.

Example:

```md
| vreme | time | |
| vreme | weather | |
```

Both meanings are useful and should become separate cards.

Another example:

```md
| račun | bill to be paid | |
| račun | bank account | |
| račun | calculation | |
```

Do not add rare dictionary senses merely for completeness.

The vocabulary-source workflow is responsible for deciding which meanings exist in the learning dataset.

The cards generator must not discover additional meanings independently.

---

## 18. Source Update Algorithm

For each new input word or candidate entry:

1. Normalize Serbian spelling to a canonical lexical form.
2. Identify materially different everyday meanings worth learning.
3. For each meaning, search the entire vocabulary source.
4. If the same `Srpski + semantic meaning` already exists, add nothing.
5. If the Serbian word exists but this meaning is new, add a new row next to the existing meanings.
6. If the entry is an inflection or variant of an existing lexical item, add a `skip` row only when recording it is useful.
7. If it is a completely new semantic entry, add a row with an empty `Card`.
8. Never create an `sr_XXXXX` ID.
9. Never modify an existing `sr_XXXXX` ID.
10. Do not alter imported semantic identity.
11. Do not create direct semantic duplicate rows.
12. Do not combine multiple distinct meanings in one row.

---

## 19. Example Update

Suppose the incoming data contains:

```text
vreme — time
vreme — weather
sada — now
sad — now
račun — bank account
```

The source already contains:

```md
| vreme | time | sr_00411 |
| sada | now | sr_00015 |
| sad | now, colloquial form | skip: variant sada |
```

Expected result:

```md
| vreme | time | sr_00411 |
| vreme | weather | |
```

Do not add duplicate rows for `sada` or `sad`.

If `račun / bank account` does not already exist, add:

```md
| račun | bank account | |
```

---

## 20. Responsibility Boundary

### Vocabulary-source agent

Responsible for:

```text
WHAT should be learned
```

Specifically:

```text
Srpski
+
semantic meaning
+
source status
```

### Cards generator

Responsible for:

```text
HOW the approved meaning is represented in the application
```

It generates:

```text
id
sense
translation
pronunciation
partOfSpeech
difficulty
groups
exactly 3 examples
distractors
```

Do not mix these responsibilities.

---

## 21. Quality Checklist Before Saving Changes

Before completing a source update, verify:

- every new row is actually useful;
- direct semantic duplicates were not added;
- different meanings of the same word are separate rows;
- multiple distinct meanings were not joined with `;`;
- every new future card has an empty `Card`;
- no `sr_XXXXX` ID was created manually;
- no existing `sr_XXXXX` ID was changed;
- ordinary inflections/variants were not turned into cards without good reason;
- new meanings were placed near existing meanings of the same word;
- imported semantic rows were not rewritten;
- section organization remains readable.

---

## 22. Short Agent Instruction

> Maintain the vocabulary source as the authoritative list of **what should be learned**. One non-skip row represents one materially distinct Serbian lexical meaning. Before adding anything, search the entire source for a semantic duplicate. If the same word already exists with a different useful everyday meaning, add a separate row next to it. Leave `Card` empty for every newly approved meaning. Never assign or modify `sr_XXXXX` IDs. Ordinary grammatical forms and spelling/colloquial variants normally do not become separate cards; use a standard `skip` row when it is useful to record that they were reviewed. Do not casually edit already imported semantic rows.
