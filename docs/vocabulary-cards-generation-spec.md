# Vocabulary Cards Dataset — Generation Specification

## 1. Goal

Generate `data/cards.json` for a Serbian ↔ Russian vocabulary-learning application.

The source is primarily a list of common Serbian words useful in everyday life.

The dataset must be optimized for:

- beginner / lower-intermediate everyday Serbian;
- Serbian ↔ Russian multiple-choice learning;
- both `SR → RU` and `RU → SR`;
- clear semantic distinctions;
- natural Serbian usage;
- reliable automatic distractor generation.

Serbian text must use **Latin script**.

---

## 2. Input

The generator may receive:

1. a source list of Serbian words;
2. optionally an existing/previous `cards.json`;
3. optionally frequency/order information.

Example source:

```text
prodavnica
račun
kuća
raditi
dobar
...
```

The source word list is not necessarily identical to the final card count.

A single Serbian word may produce multiple cards if it has several materially different meanings.

---

## 3. Output

Output one valid JSON document:

```json
{
  "cards": []
}
```

Do not output explanations, Markdown, comments, or notes inside the JSON.

The dataset has no `version` field: the release version is stamped at deploy time (app spec §3).

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

## 5. Fundamental Rule: One Card = One Meaning

A card represents:

```text
word + semantic sense
```

not merely a spelling.

Example:

```text
račun
```

may reasonably produce:

```text
račun / bill
račun / calculation
račun / account
```

if these meanings are sufficiently common and useful to learn independently.

Do **not** create separate cards for tiny contextual variations or near-synonyms of the same meaning.

Bad:

```text
račun / restaurant-bill
račun / cafe-bill
račun / shop-bill
```

These are normally one sense:

```text
račun / bill
```

---

## 6. Selecting Senses

For every source word:

1. identify its common modern Serbian meanings;
2. select only meanings useful enough for everyday vocabulary learning;
3. create one card for each materially distinct selected meaning.

Prefer:

- common everyday meanings;
- meanings likely encountered in Serbia;
- meanings useful for conversation, shopping, restaurants, housing, transport, work, services, etc.

Avoid:

- archaic meanings;
- highly technical meanings;
- extremely rare figurative meanings;
- dictionary completeness for its own sake.

The goal is a useful learning dataset, not a complete dictionary.

---

## 7. `sense`

`sense` is a technical semantic identifier.

Rules:

- English;
- lowercase;
- short;
- preferably one noun;
- use kebab-case for multiple words;
- describe the actual meaning;
- do not merely transliterate the Russian translation.

Examples:

```text
store
bill
calculation
bank-account
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

### Stability

Once published, `sense` is part of the permanent identity of the card.

Do not rename an existing `sense` simply to improve wording.

---

## 8. IDs

Card IDs use:

```text
sr_XXXXX
```

Example:

```text
sr_00001
sr_00002
sr_00123
```

### When creating the first dataset

Allocate IDs sequentially.

### When updating an existing dataset

The pair:

```text
word + sense
```

must keep its existing `id`.

Never change an existing ID because:

- translation changed;
- example changed;
- pronunciation was corrected;
- difficulty changed;
- groups changed;
- distractors changed.

For a new `word + sense`, assign a new unused ID.

Never reuse the ID of a deleted card.

Every published dataset is archived in `data/history/`. The validator checks all history files and fails if a previously used ID now maps to a different `word + sense`.

Prefer monotonically increasing IDs based on the highest existing numeric ID.

---

## 9. `word`

`word` is the Serbian lexical form being learned.

Use Serbian **Latin script**.

Examples:

```text
prodavnica
račun
kuća
raditi
dobar
```

Use the dictionary/base form appropriate for the part of speech.

Example:

```text
raditi
```

rather than an inflected form such as:

```text
radim
```

unless the source itself represents a fixed expression.

---

## 10. Russian `translation`

`translation` is the primary Russian answer shown in multiple choice.

It must be:

- concise;
- natural Russian;
- semantically appropriate for the selected `sense`;
- useful as a standalone answer.

Prefer one canonical translation.

Example:

```json
{
  "word": "prodavnica",
  "translation": "магазин"
}
```

Avoid unnecessarily verbose definitions:

```text
место, где продаются различные товары
```

unless no concise translation exists.

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

Each card must contain:

```text
1–3 examples
```

Every example has this structure:

```json
{
  "sr": "...",
  "ru": "..."
}
```

### Serbian examples

Must be:

- natural modern Serbian;
- grammatically correct;
- realistic everyday usage;
- reasonably short;
- understandable for a learner.

Prefer roughly:

```text
3–10 words
```

Longer examples are acceptable only when useful.

### Russian examples

Must be a natural translation of the Serbian sentence.

Do not translate word-for-word when that produces unnatural Russian.

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

## 24. Dataset Quality over Mechanical Completeness

Do not mechanically generate a card merely because a word occurs in the source list.

When the source contains:

- malformed text;
- duplicate entries;
- non-Serbian material;
- obvious proper names;
- irrelevant tokens;

skip or normalize them where appropriate.

Do not invent dubious semantic data simply to preserve source-row count.

---

## 25. Source Duplicates

If the source list contains the same Serbian word more than once:

- process the lexical item once;
- generate appropriate semantic senses once.

Do not create duplicate cards due to duplicate source rows.

---

## 26. Existing Dataset Updates

When a previous `cards.json` is provided, treat it as authoritative for identity.

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

when correcting or improving quality.

### Must not change casually

```text
id
word
sense
```

If an existing card is fundamentally semantically incorrect and would require changing `word` or `sense`, flag this as a migration issue rather than silently reusing the old ID for a new meaning.

---

## 27. Removing Cards

Do not delete an existing card merely because it is inconvenient.

Removal is appropriate when the card is:

- incorrect;
- duplicated;
- unusably obscure;
- based on bad source data.

When updating a dataset, removed IDs must not be reused.

---

## 28. Sorting

Prefer stable output order.

Recommended order:

1. source/frequency order;
2. cards representing different senses of the same word stay adjacent.

Example:

```text
sr_00120 račun / bill
sr_00121 račun / calculation
sr_00122 račun / bank-account
```

Exact ID order does not need to equal sort order when updating an existing dataset.

---

## 29. Quality Checklist per Card

Before emitting each card, verify:

- Does the Serbian word exist and look correct?
- Is the selected sense materially distinct?
- Is `sense` concise and stable?
- Is the Russian translation natural?
- Would the Russian prompt work in reverse?
- Is pronunciation plausible and stressed?
- Is part of speech correct?
- Is difficulty reasonable?
- Are groups useful for distractor selection?
- Does every example represent exactly this sense?
- Are examples natural?
- Are both language versions semantically equivalent?
- Are all fallback distractors incorrect but plausible?
- Are any distractors actually synonyms/correct answers?

---

## 30. Dataset-Level Checklist

Before finishing, verify:

- every `id` is unique;
- every `(word, sense)` is unique;
- no accidental duplicate cards;
- IDs of existing cards were preserved;
- new IDs were not reused;
- every card has 1–3 examples;
- all cards have both RU and SR distractors;
- only allowed `partOfSpeech` values are used;
- difficulty is only 1–3;
- semantic groups remain reasonably consistent;
- output is valid JSON.

---

## 31. Recommended Generation Workflow

Do **not** generate thousands of cards blindly in one large pass.

For quality, process the source in batches of roughly:

```text
50–100 source words
```

For each batch:

1. inspect words and detect duplicates;
2. determine useful senses;
3. generate cards;
4. merge with the existing dataset;
5. run the project validator;
6. fix validator failures and semantic ambiguities;
7. continue with the next batch.

After all batches:

1. run validation over the complete dataset;
2. simulate distractor generation in both directions;
3. review duplicate Russian translations;
4. review unusually high numbers of senses for one word.

This is safer than asking a model to produce 1,000–2,000 cards in a single pass.

---

## 32. Guidance for Polysemy

Do not try to represent every dictionary sense.

As a rough guideline:

```text
most words → 1 card
some words → 2 cards
a small number → 3+ cards
```

If a common word unexpectedly produces 5–10 cards, reconsider whether the senses are being over-split.

The validator warns when one `word` has more than 3 cards.

Prioritize what a person living in Serbia is realistically likely to encounter.

---

## 33. Canonical Example

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
    }
  ]
}
```

---

## 34. Final Instruction to the Generator

For every Serbian source word:

> Identify only materially distinct, common, useful meanings worth learning independently. Create one card per selected meaning. Use a short stable English `sense`, one concise canonical Russian translation, a Russian phonetic pronunciation with stress, simple semantic metadata, 1–3 natural bilingual examples, and plausible fallback distractors for both Serbian and Russian. Optimize for a beginner learning Serbian for everyday life rather than dictionary completeness.

Preserve existing `(word, sense) → id` mappings when updating an existing dataset.

Output only valid data matching the schema and ensure it passes the project card validator.

---

## 35. Operational Recommendation

Use this document both as:

- the generation prompt;
- acceptance criteria for generated card data.

Recommended workflow:

```text
Generate batch
→ merge into cards.json
→ run validator
→ fix validator and semantic issues
→ continue
```

Do not consider a batch complete until the validator passes.
