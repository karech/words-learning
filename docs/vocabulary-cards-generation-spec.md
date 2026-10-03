# Vocabulary Cards Dataset — Generation Specification

## 1. Goal

Generate and maintain `data/cards.json` for a Serbian ↔ Russian vocabulary-learning application.

The authoritative source for **what should be learned** is a curated Markdown vocabulary source. It contains one row per semantic entry and separates different meanings of the same Serbian word before this generator runs.

The cards dataset must be optimized for:

- beginner / lower-intermediate everyday Serbian;
- Serbian ↔ Russian multiple-choice learning;
- both `SR → RU` and `RU → SR`;
- clear semantic distinctions;
- natural Serbian usage;
- reliable automatic distractor generation.

Serbian text must use **Latin script**.

This generator is responsible for **how each approved semantic entry is represented as a card**. It must not independently expand the vocabulary source with additional meanings.

---

## 2. Input

The primary input is a curated Markdown vocabulary source with tables in this form:

```md
| Srpski | Значение | Card |
|---|---|---|
| vreme | время | sr_00411 |
| vreme | погода | |
| sad | сейчас, разговорная форма | skip: variant sada |
```

The generator may also receive:

1. the current `data/cards.json`;
2. archived published datasets from `data/history/`;
3. the project validator and runtime distractor implementation.

### Source-row semantics

Each source row is one of three states.

#### Pending semantic entry

```md
| vreme | погода | |
```

An empty `Card` field means this semantic entry has been approved for learning but does not yet have a generated card.

The generator must create exactly one card for it and assign a new stable ID.

#### Existing semantic entry

```md
| vreme | время | sr_00411 |
```

An `sr_XXXXX` value means this row is already linked to that exact card.

The source ID is authoritative and must be preserved.

#### Skipped entry

```md
| sad | сейчас, разговорная форма | skip: variant sada |
```

Rows whose `Card` field begins with `skip:` do not generate cards.

### Core mapping rule

For normal generation:

```text
one non-skip source row = exactly one card
```

The generator must not independently split one source row into multiple cards or create extra cards for meanings that are not represented by source rows.

---

## 3. Output

The primary generated artifact is:

```text
data/cards.json
```

Its top-level structure is:

```json
{
  "cards": []
}
```

The dataset has no `version` field: the release version is stamped at deploy time by the application/deployment workflow.

When a pending source row receives a newly assigned card ID, the generator must also update **only the `Card` field of that source row**:

```md
| vreme | погода | |
```

becomes:

```md
| vreme | погода | sr_00412 |
```

Do not otherwise rewrite, reorder, normalize, or editorially improve the vocabulary source as part of card generation.

The JSON file itself must contain only valid JSON: no Markdown, comments, explanations, or notes.

---

## 4. Card Schema

Each card must have this structure:

```json
{
  "id": "sr_00123",

  "word": "račun",
  "sense": "bill",

  "translation": "счёт",
  "pronunciation": "ра́чун",

  "partOfSpeech": "noun",
  "difficulty": 1,

  "groups": [
    "restaurant",
    "shopping"
  ],

  "distractors": {
    "ru": [
      "сдача",
      "цена",
      "деньги"
    ],
    "sr": [
      "kusur",
      "cena",
      "novac"
    ]
  },

  "examples": [
    {
      "sr": "Molim vas, račun.",
      "ru": "Счёт, пожалуйста."
    }
  ]
}
```

All fields are required unless explicitly stated otherwise in this specification.

---

## 5. Fundamental Rule: One Source Meaning = One Card

A card represents one approved semantic entry:

```text
source Srpski + source Значение
        ↓
word + semantic sense
```

The vocabulary source has already decided which meanings deserve separate cards.

Example source:

```md
| vreme | время | |
| vreme | погода | |
```

must produce two separate cards with the same Serbian `word` and different semantic `sense` values, for example:

```text
vreme / time
vreme / weather
```

Likewise:

```md
| račun | счёт, который нужно оплатить | |
| račun | банковский счёт | |
| račun | вычисление, расчёт | |
```

represents three cards.

Do **not** merge separate non-skip source rows into one card.

Do **not** create additional cards for unlisted dictionary meanings.

---

## 6. Source Semantic Authority

The vocabulary source is authoritative for **which lexical meanings exist in the learning dataset**.

For every non-skip source row:

1. treat `Srpski` as the intended Serbian lexical item;
2. treat `Значение` as the semantic intent of that row;
3. generate exactly one card representing that intent.

The generator must **not**:

- discover and add extra meanings on its own;
- split one source meaning into several cards;
- merge several source meanings into one card;
- silently drop a non-skip source row because it seems uncommon;
- silently reinterpret an imported row as a different meaning.

If the generator notices a useful additional meaning that is absent from the source, it may report it as a suggestion, but it must not add the card until the vocabulary source is updated upstream.

If a source row is malformed, ambiguous, duplicated, or semantically inconsistent enough that a reliable card cannot be generated, treat it as a **source-data issue**. Do not guess and do not silently repair the semantic intent.

---

## 7. `sense`

`sense` is the stable technical semantic identifier derived from the approved source meaning.

Rules:

- English;
- lowercase;
- short;
- preferably one noun;
- use kebab-case for multiple words;
- describe the actual meaning;
- do not merely transliterate the Russian source hint or final translation.

Examples:

```text
store
bill
calculation
bank-account
time
weather
house
work
good-quality
```

Avoid generic values:

```text
default
meaning-1
meaning-2
variant
```

### New pending rows

For a pending source row, derive a concise English `sense` from the source `Значение`.

Example:

```md
| vreme | погода | |
```

may generate:

```json
{
  "word": "vreme",
  "sense": "weather"
}
```

### Existing rows

Once published, `sense` is part of the permanent identity of the card.

For an existing source row with an `sr_XXXXX` ID, preserve the existing card's `sense`.

Do not rename an existing `sense` simply to improve wording.

If the current source meaning and the existing card `sense` appear to represent different semantics, treat that as a migration/source-data issue rather than silently changing identity.

---

## 8. IDs

Card IDs use:

```text
sr_XXXXX
```

Examples:

```text
sr_00001
sr_00002
sr_00123
```

### Existing source rows

If the source `Card` field contains:

```text
sr_00123
```

that ID is authoritative for the row.

The corresponding card must keep that ID.

The generator must verify that the existing or historical mapping is compatible with the same lexical identity.

### Pending source rows

If `Card` is empty, allocate a new unused ID.

Prefer monotonically increasing IDs based on the highest ID ever used in:

- the current dataset;
- archived datasets in `data/history/`;
- already assigned source rows.

After the new card passes validation, write the assigned ID back to that source row's `Card` field.

### Identity stability

Never change an existing ID because:

- translation changed;
- example changed;
- pronunciation was corrected;
- difficulty changed;
- groups changed;
- distractors changed.

Never reuse the ID of a deleted card.

Every published dataset is archived in `data/history/`. The validator checks history and must fail if a previously used ID is later reused for a different lexical identity.

---

## 9. `word`

`word` is the Serbian lexical form being learned.

For every generated card, `word` must match the `Srpski` value of its source row.

Use Serbian **Latin script**.

Examples:

```text
prodavnica
račun
kuća
raditi
dobar
vreme
```

The vocabulary-source workflow is responsible for canonical lemma selection and for filtering ordinary inflected/variant forms.

The cards generator must not silently replace the source `Srpski` value with a different lemma.

If a non-skip source row appears to use an invalid or inappropriate lexical form, report a source-data issue instead of inventing a replacement.

---

## 10. Russian `translation`

`translation` is the primary Russian answer shown in multiple choice.

The source column `Значение` is a **semantic hint**, not necessarily the literal final `translation`.

The generator may choose a shorter or more natural canonical Russian answer as long as it preserves exactly the semantic intent of the source row.

It must be:

- concise;
- natural Russian;
- semantically appropriate for the selected `sense`;
- useful as a standalone answer.

Prefer one canonical translation.

Example source:

```md
| račun | счёт, который нужно оплатить | |
```

may reasonably generate:

```json
{
  "word": "račun",
  "sense": "bill",
  "translation": "счёт"
}
```

Avoid unnecessarily verbose definitions:

```text
место, где продаются различные товары
```

unless no concise natural translation exists.

Do not broaden or narrow the meaning in a way that changes the semantic identity defined by the source row.

---

## 11. Translation Ambiguity

Remember that `translation` is used as the prompt in `RU → SR`.

Therefore avoid selecting overly broad translations when a more precise Russian equivalent exists.

For example, if two Serbian cards would both have:

```text
translation = "дом"
```

consider whether:

- they genuinely represent synonyms;
- one translation can be made more precise;
- the semantic senses are clearly distinguished by the example.

Do not distort Russian solely to force uniqueness.

Duplicate Russian translations are allowed when linguistically correct, but they should be treated carefully because they create potential reverse-direction ambiguity.

The validator emits a warning (not a failure) for every duplicated normalized translation. Review each one.

---

## 12. `pronunciation`

Provide a Russian phonetic hint for the Serbian word.

Requirements:

- use Cyrillic;
- represent Serbian pronunciation rather than Russian spelling conventions;
- mark the stressed vowel using an acute accent;
- do not include brackets or IPA.

Example:

```json
{
  "word": "prodavnica",
  "pronunciation": "прода́вница"
}
```

Another example:

```json
{
  "word": "račun",
  "pronunciation": "ра́чун"
}
```

Only the Serbian **word** requires pronunciation.

Do not create phonetic transcriptions for complete example sentences.

---

## 13. Part of Speech

Allowed values only:

```text
noun
verb
adjective
adverb
pronoun
preposition
conjunction
other
```

Choose the value corresponding to the selected sense.

Do not invent additional enum values.

---

## 14. Difficulty

Allowed values:

```text
1
2
3
```

This represents learning difficulty, not frequency rank.

Suggested interpretation:

### 1 — Easy

- basic everyday concept;
- direct Russian equivalent;
- common/simple word;
- easy to distinguish.

### 2 — Medium

- less obvious translation;
- multiple meanings;
- some contextual nuance;
- moderately harder vocabulary.

### 3 — Hard

- abstract or nuanced meaning;
- easily confused with similar words;
- harder semantic distinction;
- less transparent usage.

Most beginner/common vocabulary should be `1` or `2`.

Do not overuse `3`.

---

## 15. Semantic Groups

`groups` are flat tags used primarily to find plausible distractors.

Use 1–3 meaningful groups per card. The validator fails on 0 or more than 3.

Prefer a controlled vocabulary such as:

```text
food
drink
restaurant
shopping
money
place
home
transport
people
family
time
work
communication
movement
health
body
clothing
weather
quantity
description
emotion
action
service
travel
education
technology
```

Add a new group only when necessary.

Do not create unnecessarily specific tags such as:

```text
small-grocery-store
weekday-evening-shopping
restaurant-payment-object
```

Groups describe semantic neighborhood, not the entire meaning.

---

## 16. Examples

Each card must contain **exactly 3 examples**.

The validator must fail if a card contains fewer or more than 3 examples.

Every example has this structure:

```json
{
  "sr": "...",
  "ru": "..."
}
```

### Serbian examples

All three Serbian examples must be:

- natural modern Serbian;
- grammatically correct;
- realistic everyday usage;
- reasonably short;
- understandable for a learner;
- representative of the card's exact semantic sense.

Prefer roughly:

```text
3–10 words
```

Longer examples are acceptable only when useful.

The three examples should provide some contextual variety rather than being trivial paraphrases of the same sentence.

### Russian examples

Each Russian sentence must be a natural translation of its Serbian counterpart.

Do not translate word-for-word when that produces unnatural Russian.

All three bilingual example pairs must preserve the same intended card sense.

---

## 17. Examples Must Disambiguate the Sense

For polysemous words, examples should help identify the intended meaning.

For:

```text
račun / bill
```

good:

```json
{
  "sr": "Molim vas, račun.",
  "ru": "Счёт, пожалуйста."
}
```

For:

```text
račun / bank-account
```

use an example clearly involving a bank account.

Do not use a vague example that fits several senses.

---

## 18. Examples Are Not Answer Hints

The application shows the example **before** the user selects an answer.

Therefore avoid sentences where the surrounding words make the answer completely trivial because they directly repeat an obvious translation or synonym.

The example should provide useful context without reducing the question to a giveaway.

This is a preference, not an absolute rule.

Natural Serbian remains more important.

---

## 19. Fallback Distractors

Each card contains fallback distractors for both answer languages:

```json
{
  "distractors": {
    "ru": ["...", "...", "..."],
    "sr": ["...", "...", "..."]
  }
}
```

Provide **exactly 3 candidates per language**. The validator fails otherwise.

These are fallback values only.

The runtime normally attempts to select distractors dynamically from other cards first.

---

## 20. Russian Distractors

`distractors.ru` are alternative Russian answer options for:

```text
SR → RU
```

They should be:

- plausible;
- same broad grammatical/semantic type where possible;
- clearly incorrect for the selected sense;
- not synonyms of the correct answer.

Example:

```text
prodavnica → магазин
```

Reasonable fallback distractors:

```text
рынок
аптека
ресторан
```

Avoid absurd combinations such as:

```text
магазин
вчера
синий
бежать
```

for a noun meaning a place.

---

## 21. Serbian Distractors

`distractors.sr` are alternative Serbian answer options for:

```text
RU → SR
```

They must be Serbian Latin words.

They should:

- be plausible alternatives;
- preferably have the same part of speech;
- preferably belong to related semantic groups;
- not be synonyms that could also reasonably answer the Russian prompt.

For:

```text
магазин → prodavnica
```

reasonable alternatives could include other everyday place nouns.

---

## 22. Distractor Safety

Never include:

- the correct answer;
- duplicate values;
- spelling variants of the correct answer;
- obvious synonyms accepted as the same correct meaning;
- another sense of exactly the same Serbian word.

All distractor comparisons should conceptually be done after:

```text
trim
lowercase
ё → е
```

So `счет` and `счёт` count as the same value. Use `ё` in the data where it is correct Russian.

---

## 23. Bidirectional Ambiguity

Special attention is required for `RU → SR`.

Before choosing Serbian distractors, consider whether another Serbian word is also a valid translation of the Russian prompt.

Example:

```text
дом
```

may have multiple Serbian equivalents depending on meaning.

Do not use another genuinely correct equivalent as a distractor.

If the Russian prompt is inherently ambiguous, ensure the example strongly identifies the desired sense.

---

## 24. Source Rows Are Authoritative

The vocabulary source is curated upstream.

For normal generation, every non-skip source row must correspond to exactly one card.

Do not silently skip or normalize an approved row merely because the generator disagrees with it.

If a non-skip source row contains:

- malformed Serbian text;
- an apparent semantic duplicate;
- non-Serbian material;
- a proper name that should probably be skipped;
- an inflected/variant form that should probably be skipped;
- an unclear or contradictory meaning;

report it as a **source-data issue** and require the source to be corrected by the vocabulary-source workflow.

The only rows intentionally excluded from card generation are rows explicitly marked with `skip:` in the `Card` column.

Do not invent dubious semantic data merely to force a source row through generation.

---

## 25. Source Consistency and Duplicates

The same Serbian `Srpski` value may legitimately appear in several non-skip rows when the rows represent different meanings.

Valid:

```md
| vreme | время | sr_00411 |
| vreme | погода | |
```

Invalid source state:

```md
| vreme | погода | |
| vreme | погода | |
```

or two differently worded rows that clearly represent the same semantic meaning.

Do not silently deduplicate these rows during generation.

Treat semantic duplicates as a source-data issue so the source file remains the single authoritative list of learning meanings.

Rows marked `skip:` are not cards and do not participate in the one-row-to-one-card mapping.

---

## 26. Existing Dataset Updates

When a current or previous `cards.json` is provided, use it together with the source `Card` IDs and `data/history/` as authoritative identity information.

For existing cards:

### May change

```text
translation
pronunciation
partOfSpeech
difficulty
groups
distractors
examples
```

when correcting or improving quality, provided the card still represents the same source semantic entry.

### Must remain stable

```text
id
word
sense
```

For an existing source row with an `sr_XXXXX` ID:

- preserve that ID;
- preserve the corresponding `word`;
- preserve the published `sense`;
- verify that the source meaning is still semantically compatible.

If an existing card is fundamentally semantically incorrect and fixing it would require changing `word` or `sense`, report a migration issue rather than silently reusing the old ID for a different meaning.

---

## 27. Removing Cards

Normal generation must not automatically delete existing cards.

If an existing published card is no longer represented by a compatible non-skip source row, treat this as a migration/source-consistency issue.

Card removal must be an explicit maintenance decision outside the normal pending-row generation flow.

When a card is explicitly removed:

- its ID must never be reused;
- historical identity must remain detectable through `data/history/`.

---

## 28. Sorting

The generated card order should follow the order of non-skip semantic rows in the vocabulary source.

This makes the source order the stable human-readable ordering for the dataset.

Different senses of the same Serbian word should remain adjacent when they are adjacent in the source.

Existing IDs do not need to be numerically sorted.

Do not reorder the vocabulary source as part of card generation.

---

## 29. Quality Checklist per Card

Before emitting each card, verify:

- Does the card correspond to exactly one non-skip source row?
- Does `word` exactly match the source `Srpski` value?
- Does the card preserve the semantic intent of source `Значение`?
- Is `sense` concise and stable?
- For an existing ID, was the published `sense` preserved?
- Is the Russian translation natural?
- Would the Russian prompt work in reverse?
- Is pronunciation plausible and stressed?
- Is part of speech correct?
- Is difficulty reasonable?
- Are groups useful for distractor selection?
- Are there exactly 3 bilingual examples?
- Does every example represent exactly this sense?
- Are the examples natural and contextually varied?
- Are both language versions semantically equivalent?
- Are all fallback distractors incorrect but plausible?
- Are any distractors actually synonyms/correct answers?

---

## 30. Dataset-Level Checklist

Before finishing, verify:

- every non-skip source row maps to exactly one card;
- every generated/current card maps back to a compatible source row;
- every `skip:` source row maps to no card;
- every imported source `Card` ID matches the generated card ID;
- every newly assigned ID has been written back to the source row;
- every `id` is unique;
- every `(word, sense)` is unique;
- no accidental semantic duplicate cards exist;
- IDs of existing cards were preserved;
- new IDs were not reused from history;
- every card has exactly 3 examples;
- all cards have exactly 3 RU and exactly 3 SR fallback distractors;
- only allowed `partOfSpeech` values are used;
- difficulty is only 1–3;
- semantic groups remain reasonably consistent;
- output is valid JSON.

---

## 31. Recommended Generation Workflow

Do **not** regenerate a large dataset blindly in one model pass.

Work from the curated source in batches of roughly:

```text
50–100 pending semantic rows
```

For each batch:

1. load the full vocabulary source;
2. load the current `cards.json`;
3. load/check historical IDs from `data/history/`;
4. identify pending non-skip rows whose `Card` field is empty;
5. verify there are no source-data conflicts for those rows;
6. assign new monotonic IDs;
7. generate card metadata for exactly those approved semantic entries;
8. merge the cards into the existing dataset in source order;
9. run the project validator, including runtime distractor simulation;
10. fix generation-quality failures;
11. write the assigned IDs back into the corresponding source `Card` fields;
12. continue with the next batch.

Do not add unlisted semantic meanings during this workflow.

After all batches:

1. run validation over the complete dataset;
2. verify full source ↔ card mapping consistency;
3. simulate distractor generation in both directions;
4. review duplicate Russian translations;
5. review any source-data warnings or migration issues.

This is safer than asking a model to regenerate 1,000–2,000 cards in a single pass.

---

## 32. Polysemy

Polysemy selection is handled by the vocabulary-source workflow, not by this generator.

If the source contains:

```md
| vreme | время | |
| vreme | погода | |
```

generate two cards.

If the source contains only:

```md
| vreme | время | |
```

generate only the `time` card. Do not independently add `weather`, even if it is a common meaning.

The generator's responsibility is to:

- derive an appropriate stable English `sense` for pending rows;
- ensure translation and examples represent that exact source meaning;
- make examples especially clear when the same Serbian spelling has several source meanings.

If a useful missing sense is noticed, report it as a suggestion for the vocabulary-source workflow instead of adding it directly.

---

## 33. Canonical Example

Source row:

```md
| prodavnica | магазин | sr_00123 |
```

Generated card:

```json
{
  "id": "sr_00123",
  "word": "prodavnica",
  "sense": "store",
  "translation": "магазин",
  "pronunciation": "прода́вница",
  "partOfSpeech": "noun",
  "difficulty": 1,
  "groups": [
    "shopping",
    "place"
  ],
  "distractors": {
    "ru": [
      "рынок",
      "аптека",
      "ресторан"
    ],
    "sr": [
      "pijaca",
      "apoteka",
      "restoran"
    ]
  },
  "examples": [
    {
      "sr": "Idem u prodavnicu.",
      "ru": "Я иду в магазин."
    },
    {
      "sr": "Prodavnica je još otvorena.",
      "ru": "Магазин ещё открыт."
    },
    {
      "sr": "Ova prodavnica radi nedeljom.",
      "ru": "Этот магазин работает по воскресеньям."
    }
  ]
}
```

---

## 34. Final Instruction to the Generator

For every **non-skip semantic entry already approved in the vocabulary source**, generate exactly one card representing that entry.

For a pending row:

> Preserve the source Serbian lexical form and semantic intent. Assign a new stable monotonic `sr_XXXXX` ID, derive a short stable English `sense`, choose one concise canonical Russian translation, provide a Russian phonetic pronunciation with stress, assign simple semantic metadata, create exactly 3 natural bilingual examples, and provide exactly 3 plausible fallback distractors for both Serbian and Russian.

For an existing row:

> Preserve its source-linked ID and published lexical identity (`id`, `word`, `sense`). Improve mutable metadata only when useful and without changing the represented source meaning.

Never independently add, split, merge, or remove semantic meanings.

If the source itself appears wrong, duplicated, ambiguous, or inconsistent, report a source-data/migration issue rather than silently changing semantic intent.

After successfully creating a pending card and passing validation, backfill the assigned ID into that source row's `Card` field.

Ensure the final dataset passes the project card validator.

---

## 35. Operational Recommendation

Use this document both as:

- the generation prompt;
- acceptance criteria for generated card data;
- the contract between the curated vocabulary source and `data/cards.json`.

Recommended workflow:

```text
Curated source semantic rows
→ select pending rows
→ generate exactly one card per row
→ assign stable IDs
→ merge into cards.json
→ run validator
→ fix generated-card quality issues
→ backfill IDs into source
→ continue
```

Do not consider a batch complete until:

- the validator passes;
- all newly generated cards map 1:1 to their source rows;
- all newly assigned IDs have been written back to the source file.

Semantic source problems should be fixed in the vocabulary-source workflow, not silently compensated for by the cards generator.

---
