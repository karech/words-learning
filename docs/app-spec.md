# Vocabulary Learning PWA — Technical Specification

## 1. Goal

Build a small personal web/PWA application for learning foreign-language vocabulary using multiple-choice questions and lightweight spaced repetition.

Primary usage loop:

> Open the app → answer several cards → close the app.

The application is not intended to be a public product.

Primary priorities:

- simplicity;
- fast startup;
- offline-first behavior;
- no backend;
- minimal dependencies and infrastructure;
- comfortable use on iPhone in portrait mode.

Initial language pair:

**Serbian ↔ Russian**

---

## 2. Technology Stack

Use a minimal static stack:

- HTML5;
- plain CSS;
- JavaScript;
- Alpine.js 3.x;
- native ES modules;
- `localStorage`;
- Service Worker + Cache API;
- PWA manifest;
- GitHub Pages.

### Do not use

- React;
- Vue;
- TypeScript;
- Tailwind;
- npm runtime dependencies;
- bundlers;
- Vite;
- Webpack;
- Rollup;
- client-side router;
- backend;
- database.

### Alpine.js

Alpine is used only as a thin UI/reactivity layer.

Core business logic must live in regular JavaScript modules and must not depend on Alpine.

Suggested structure:

```text
/
  index.html

  css/
    app.css

  js/
    app.js
    cards.js
    scheduler.js
    distractors.js
    question.js
    storage.js
    stats.js
    pwa.js
    config.js

  data/
    cards.json
    history/
      2026-10-03T00-00-00Z.cards.json

  vendor/
    alpine.esm.min.js
    README.md

  fonts/
    inter-*.woff2
    LICENSE.txt

  icons/
    icon.svg
    icon-192.png
    icon-512.png
    icon-maskable-512.png
    apple-touch-icon.png

  scripts/
    validate-cards.js

  tests/
    *.test.js

  docs/
    app-spec.md
    vocabulary-cards-generation-spec.md
    design/
      learn-question.png
      learn-correct.png
      learn-wrong.png
      learn-dont-know.png
      learn-progress.png

  .github/workflows/
    pages.yml

  package.json
  manifest.webmanifest
  service-worker.js
  version.txt
```

Alpine is vendored as the ESM build (`dist/module.esm.min.js` from the `alpinejs` package, pinned version) at `vendor/alpine.esm.min.js`. `vendor/README.md` records version, source URL and license (MIT). Upgrade = replace the file and update the README.

`js/app.js` imports it and starts it explicitly:

```js
import Alpine from '../vendor/alpine.esm.min.js'
Alpine.data('app', () => ({ /* ... */ }))
Alpine.start()
```

`index.html` loads only `<script type="module" src="js/app.js">`.

The application must not depend on a CDN.

There is no application build step: no transpiling, no bundling. The same `.js` files run in the browser and in Node.

### `package.json`

A minimal `package.json` exists only so that Node treats `.js` files as ES modules:

```json
{
  "type": "module"
}
```

It must not declare dependencies. No `npm install` is ever required.

This allows:

```bash
node --test
node scripts/validate-cards.js
```

to import the same modules as the browser.

### Tests

Use the built-in Node test runner (`node --test`). No test framework, no npm packages.

Required coverage:

- scheduler;
- distractors;
- precache list matches the runtime files; `version.txt` is empty in the repo;
- validator rules;
- `Не знаю` (§25a, §32): does not change `answered` / `correct` / `wrong` / `shown`; increments `unknown`; sets `lastResult = unknown`; applies the failure level rule; queues a retry; gets the same priority bonus as `wrong`; reveals the correct answer with no Wrong state and enables `Дальше`; counts `newWords` exactly once for a new card (not again on a repeated `Не знаю`).

---

## 3. Deployment

The application is deployed to GitHub Pages.

All URLs must work when the repository is hosted under a subpath, for example:

```text
https://user.github.io/repository/
```

Do not assume deployment at `/`.

Use relative URLs or otherwise correctly account for the GitHub Pages base path.

### Deploy

A GitHub Actions workflow (`.github/workflows/pages.yml`) publishes on push to `main` (repo setting: Pages → Source = GitHub Actions). It only builds and publishes — no tests, no validation:

1. copy runtime files (`index.html`, `manifest.webmanifest`, `service-worker.js`, `css/`, `js/`, `vendor/`, `fonts/`, `icons/`, `data/cards.json`);
2. write the current UTC datetime (e.g. `2026-10-03T14:20:00Z`) into `version.txt`;
3. publish to Pages.

Not published: `data/history/`, `scripts/`, `tests/`, `docs/`, `agent/`, `package.json`.

Run tests and the validator locally before pushing.

The app must run unmodified from the repository root via any local static server.

### Version

There is **one version** for the whole release, app code and cards together: the deploy UTC datetime in `version.txt`. The file contains that single line and nothing else.

In the repository `version.txt` is **empty**. Empty means local development: the app does not register the Service Worker (and unregisters any old one), so files are always loaded fresh. Offline behavior is therefore tested on the deployed site.

---

## 4. PWA and Offline Behavior

The application must:

- be installable as a PWA;
- open in standalone mode;
- work without network access after the first successful load;
- not require a network request on normal startup;
- include a valid PWA manifest;
- include required PWA icons;
- be designed primarily for portrait mode.

### Icons

The app icon is original project artwork: a book with a big **W** on the cover, in light blue colors. Source: `icons/icon.svg` (full-bleed background, artwork inside the maskable safe zone — circle of radius 40% around the center), so one design serves both regular and maskable icons. Being original, it needs no third-party license file.

Any third-party icon added later must come from an open-source set with a free license permitting redistribution and modification (e.g. MIT, ISC, Apache-2.0), with its license in `icons/LICENSE.txt`.

Required PNG sizes rendered from the SVG: 192×192, 512×512, 512×512 maskable, and 180×180 `apple-touch-icon`.

Recommended manifest settings:

```json
{
  "display": "standalone",
  "orientation": "portrait-primary"
}
```

The Service Worker must cache the application shell, including `vendor/alpine.esm.min.js`, the self-hosted Inter font files, and icons.

The card dataset must also remain available offline.

---

## 5. Cards Dataset

Cards are stored in:

```text
/data/cards.json
```

Top-level structure:

```json
{
  "cards": []
}
```

The dataset has no version of its own; it ships with the release version (§3).

### Dataset history

Every published dataset is archived in git:

```text
data/history/<UTC datetime>.cards.json
```

The name is the UTC datetime of archiving with `:` replaced by `-` (for filesystem safety), e.g. `2026-10-03T00-00-00Z.cards.json`. Names sort chronologically.

The validator uses the latest history file as the default "previous" dataset (see §45).

---

## 6. Card Model

**One card represents one word in one specific semantic sense.**

Example:

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

---

## 7. Card ID and `sense`

### Stable ID

`id` is a stable technical identifier.

It must not be derived from the word itself.

After a card has been published, the relationship:

```text
id → word + sense
```

must remain stable.

For example:

```text
sr_00123 → račun / bill
```

must never later become:

```text
sr_00123 → prodavnica / store
```

### `sense`

`sense` is a stable technical identifier for the semantic meaning of the word.

Rules:

- English;
- lowercase;
- kebab-case;
- short noun or short semantic phrase;
- describes the meaning, not the Russian translation text;
- stable after publication.

Examples:

```text
račun / bill
račun / calculation
račun / account
```

Closely related translations of the same meaning should not create separate cards.

Distinct semantic meanings should create separate cards.

The same `word` may therefore appear in several cards.

The pair:

```text
word + sense
```

must be unique.

---

## 8. Pronunciation

`pronunciation` is stored directly in the dataset.

For Serbian, use a Russian phonetic hint with stress:

```text
prodavnica
прода́вница
```

Do not generate pronunciation at runtime.

---

## 9. Examples

Each card contains between **1 and 3 examples**.

Every example contains both language variants:

```json
{
  "sr": "Idem u prodavnicu.",
  "ru": "Я иду в магазин."
}
```

Each time a card is presented, select one example randomly.

Do not track which example was previously shown.

It is acceptable for the same example to appear again later.

---

## 10. Learning Directions

Support three direction modes:

```text
Смешанный
SR → RU
RU → SR
```

Default:

```text
Смешанный
```

All UI text is in Russian. `SR → RU` / `RU → SR` remain as direction labels. In this spec, "Mixed" means the `Смешанный` mode.

### SR → RU

Before answering, show:

```text
prodavnica
прода́вница

Idem u prodavnicu posle posla.
```

The four answer choices are Russian translations.

After answering, show the Russian translation of the example sentence.

### RU → SR

Before answering, show:

```text
магазин

Я иду в магазин после работы.
```

The four answer choices are Serbian words.

Do **not** show Serbian pronunciation before the answer because it may reveal the correct choice.

After answering (both correct and wrong), show:

```text
prodavnica · прода́вница

Idem u prodavnicu posle posla.
```

---

## 11. Mixed Mode

Mixed mode must not use a fixed alternating pattern.

Do not implement sequences such as:

```text
SR → RU
SR → RU
RU → SR
...
```

Each:

```text
card + direction
```

is an independent learning item.

Each direction has separate:

- level;
- correct count;
- wrong count;
- streak;
- last result;
- next review time.

### New cards in Mixed mode

For a completely new card, the first exposure must be:

```text
SR → RU
```

After the first correct SR → RU answer, the RU → SR learning item is created with:

```text
level = 0
nextReviewAt = now
pool = Review
```

Recent-card exclusion (§37) still applies, so it must not appear as the very next question.

After that, both directions are scheduled independently.

### RU → SR unlock is mode-independent

The RU → SR unlock state is global and independent of the currently selected mode.

The first correct SR → RU answer for a card unlocks its RU → SR learning item permanently, regardless of whether that answer happened in `Смешанный` or `SR → RU` mode. The item is created as above (`level = 0`, `nextReviewAt = now`, eligible for the Review pool).

This matters when the user later switches to `Смешанный`: cards already answered correctly in `SR → RU` must not need to be unlocked again.

### New cards in single-direction modes

The SR-first rule applies only to Mixed mode.

In explicit `RU → SR` mode, new cards may still be introduced directly in RU → SR; explicit single-direction mode bypasses the SR-first gating rule.

This allows:

```text
prodavnica → магазин
```

to be well learned while:

```text
магазин → prodavnica
```

is still weak.

The scheduler should naturally show the weaker direction more often.

---

# UI / UX Specification

## 12. Design Reference

Figma reference:

**Serbian Vocabulary PWA — Concept B**

https://www.figma.com/design/EiV0UQ4gWFqW9MnQ3hfHOq

Use **Concept B**.

Ignore Concept A.

Figma is an additional visual reference. The implementation must not depend on the coding agent being able to inspect or correctly interpret the Figma file.

Reference screenshots are stored in the repository (see §53 for the list and which ones are current):

```text
docs/design/
```

---

## 13. Reference Viewport

Primary reference viewport:

```text
390 × 844 px
```

This roughly targets modern iPhones such as iPhone 14–16.

The UI must adapt to nearby mobile viewport sizes.

---

## 14. Design Tokens

Font:

```text
Inter
```

Inter is self-hosted (`fonts/*.woff2`, SIL OFL 1.1 license in `fonts/LICENSE.txt`) and cached by the Service Worker. Include Latin, Latin Extended (Serbian diacritics: č ć š ž đ) and Cyrillic subsets. No Google Fonts or other CDN.

Primary colors:

```text
background        #F7F8FA
surface           #FFFFFF

text-primary      #161A22
text-secondary    #6B7380

border            #DFE3E9

primary           #4D6BF7
primary-soft      #ECF0FF

success           #1F9454
success-soft      #EBF9F0

error             #D12E33
error-soft        #FEEDED

disabled-bg       #E8EBF0
disabled-text     #999EA8
```

Main horizontal screen padding:

```text
20px
```

---

## 15. Learn Screen Structure

The screen is conceptually divided into three vertical areas:

```text
HEADER + WORD AREA

RESERVED FEEDBACK AREA

PINNED ANSWERS + NEXT
```

Critical UX requirement:

> Selecting an answer must not move the major UI elements.

There must be no meaningful layout shift between:

```text
Question
Correct
Wrong
```

---

## 16. Header

Reference geometry at `390 × 844`:

```text
x: 20
y: 14
width: 350
height: 48
```

Left side:

```text
Слова
```

Right side:

```text
Прогресс
```

`Прогресс` must be an explicit labeled button with a comfortable touch target.

Do not use an ambiguous icon-only control.

---

## 17. Word Area

Reference geometry:

```text
x: 20
y: ~74
width: 350
height: ~218
```

Content is center-aligned.

Order:

```text
word
pronunciation
example
[ Уже знаю ] [ Не знаю ]
```

### Word

```text
font-size: 36px
font-weight: 600
```

### Pronunciation

```text
font-size: 15px
font-weight: normal
color: text-secondary
```

In RU → SR mode, pronunciation must not be shown before answering.

### Example

The example sentence must not look like a button or card.

It is simply another line of text below pronunciation:

```text
font-size: 15px
font-style: italic
color: text-secondary
text-align: center
```

The text may wrap onto multiple lines.

---

## 18. `Уже знаю` / `Не знаю`

The word area shows two secondary buttons side by side:

```text
[ Уже знаю ] [ Не знаю ]
```

`Не знаю` exists so the user never has to guess when they don't know the word.

Each button:

```text
width: ~138px
height: ≥ 44px
border-radius: 12px
```

- a proper button with a full touch area, not a small text link;
- visually secondary relative to the answer buttons;
- easy to tap on a phone.

Both actions apply only to the current:

```text
card + direction
```

Neither modifies the other direction.

After any action — a regular answer, `Уже знаю` or `Не знаю` — both buttons become disabled until the next card, and stay in place (no layout shift).

`Уже знаю` moves straight to the next card (no feedback state). `Не знаю` reveals the answer (§25a).

---

## 19. Reserved Feedback Area

There is a dedicated reserved area between the word block and the answer panel.

Reference:

```text
x: 20
y: ~300
width: 350
height: ~184
```

Before an answer, this area is visually empty.

Its primary purpose is to avoid layout shift when feedback appears.

After answering, result content is rendered inside this reserved space.

---

## 20. Bottom Answer Panel

The answers and Next button form a bottom panel visually anchored to the bottom of the usable viewport.

Reference:

```text
top: ~500px
bottom: 0
width: 390px
```

Background:

```text
surface
```

Top border:

```text
1px border
```

Horizontal padding:

```text
20px
```

Structure:

```text
Answer 1
Answer 2
Answer 3
Answer 4

Next
```

Answers must always be vertical.

Do not use a 2×2 grid.

The implementation does not have to use CSS `position: fixed`.

The requirement is visual behavior:

> the answer panel remains anchored to the bottom of the usable viewport.

Use responsive layout mechanisms such as flex/grid/`100dvh` rather than hard-coded absolute positioning where practical.

---

## 21. Answer Button

Reference:

```text
width: 350px
height: 52px
border-radius: 14px
```

Text:

```text
font-size: 16px
font-weight: 500
```

### Default

```text
background: surface
border: border
text: text-primary
```

### Correct

```text
background: success-soft
border: success
text: success
right icon: ✓
```

### Wrong

```text
background: error-soft
border: error
text: error
right icon: ×
```

Do not indicate answer status using color alone.

---

## 22. Next Button

Reference height:

```text
52px
```

Before answering:

- disabled;
- gray background;
- gray text;
- not clickable.

After answering:

- primary background;
- white text;
- clickable.

Label:

```text
Дальше
```

The button must always remain in the same visual position.

---

## 23. Question State

Before an answer:

- all four answer buttons are neutral;
- feedback area is empty;
- `Дальше` is disabled;
- `Уже знаю` and `Не знаю` are available.

After one answer is selected (or `Не знаю` is pressed), the answer cannot be changed: all four answer buttons become non-interactive.

---

## 24. Correct State

On a correct answer:

- selected answer enters Correct state;
- feedback displays:

```text
Верно
```

- display the translated example;
- enable `Дальше`.

---

## 25. Wrong State

On a wrong answer:

- selected answer enters Wrong state;
- correct answer enters Correct state;
- feedback displays:

```text
Ошибка
```

- display the correct answer;
- display the translated/other-language version of the example;
- enable `Дальше`.

For RU → SR, after answering it is valid to display:

```text
prodavnica · прода́вница
```

followed by the Serbian example sentence.

---

## 25a. Unknown State (`Не знаю`)

`Не знаю` means the user explicitly does not know the answer and chooses not to guess. It is not a correct answer and not a wrong answer: no option was selected.

After pressing `Не знаю`:

- the correct answer button enters Correct state (✓);
- no answer button enters Wrong state;
- all four answer buttons become non-interactive;
- the feedback area shows the correct answer and the same extra content as after a regular answer;
- `Верно` / `Ошибка` are **not** shown;
- `Уже знаю` and `Не знаю` are disabled;
- `Дальше` is enabled.

SR → RU feedback:

```text
Я иду в магазин.
```

(The correct Russian answer is already marked ✓ in the answer list.)

RU → SR feedback (pronunciation is revealed, as after a regular answer):

```text
prodavnica · прода́вница

Idem u prodavnicu.
```

The model distinguishes three situations:

```text
Wrong      = the user tried to answer and was wrong
Unknown    = the user doesn't know and deliberately doesn't guess
Shown only = the card was displayed, the user did nothing
```

For learning, Wrong and Unknown both mean "repeat soon" (§32). For statistics they are separate events (§29).

---

## 26. Card Transition

Do not implement:

- swipe navigation;
- horizontal slide transitions;
- carousel behavior;
- automatic next.

The next card appears only after pressing:

```text
Дальше
```

A very short simple fade is allowed.

No animation is also acceptable.

Avoid unnecessary visual noise.

---

## 27. Responsive Behavior

On mobile:

```text
content width = viewport width - 40px
```

Primary target:

```text
390px
```

The UI should work comfortably up to approximately:

```text
430px
```

On wider viewports, the app may be shown inside a centered mobile-width container.

Use modern viewport units such as:

```css
min-height: 100dvh;
```

Do not hard-code the layout to `844px`.

Reference coordinates describe expected geometry at `390 × 844`, not the mandatory implementation method.

### Vertical-space priority

If the screen is shorter than the reference:

1. preserve touch target sizes;
2. preserve answer control sizes;
3. keep the bottom panel anchored;
4. reduce empty feedback-area whitespace first.

Account for iOS safe areas:

```css
env(safe-area-inset-top)
env(safe-area-inset-bottom)
```

---

# Progress and Settings

## 28. Navigation

The Learn screen contains the explicit button:

```text
Прогресс
```

The secondary screen contains an explicit return control:

```text
К словам
```

Statistics and settings are combined into one secondary screen.

Settings changes apply starting from the next card.

---

## 29. Statistics

Store daily aggregates for the last:

```text
30 days
```

Do not store a full event log.

A calendar day is determined by the user's local time.

Counter definitions:

```text
answered     = regular answers selected
correct      = correct answers
wrong        = wrong answers
unknown      = "Не знаю" uses
alreadyKnown = "Уже знаю" uses
newWords     = unique card.id values whose first-ever completed
               interaction (answer, "Уже знаю" or "Не знаю")
               happened that day; direction does not matter
```

A card is counted in `newWords` once, on its first completed interaction of any kind. A card that was only shown (app closed without interaction) does not count toward `newWords`.

`Не знаю` does not change `answered`, `correct` or `wrong`. Accuracy is computed only from real answers:

```text
accuracy = correct / answered
```

The UI does not have to show `unknown` as a separate metric in v1; storing it is enough.

Example:

```json
{
  "2026-10-03": {
    "answered": 47,
    "correct": 39,
    "wrong": 8,
    "unknown": 5,
    "newWords": 12,
    "alreadyKnown": 2
  }
}
```

The UI must show at least:

```text
Today:
- answered
- accuracy
- new words

Yesterday:
- processed/answered count

Recent activity:
- last 30 days
```

The 30-day activity visualization should be compact and simple.

Do not build a complex analytics dashboard.

---

## 30. Settings

### Direction

Options:

```text
Смешанный
SR → RU
RU → SR
```

Default:

```text
Смешанный
```

After a direction change, the session retry queue keeps only items whose direction is allowed by the new mode. For example, after switching from `Смешанный` to `SR → RU`, queued RU → SR items are dropped from the queue. Their stored progress is unchanged.

### New words

Options:

```text
Меньше
Обычно
Больше
```

Default:

```text
Обычно
```

Explanatory copy:

> Определяет, как часто среди повторений появляются новые слова.

### Update

Section `Обновление`. Show the release version (§3):

```text
Версия   2026-10-03 14:20 UTC
```

or `dev` when `version.txt` is empty.

Provide button:

```text
Обновить приложение и карточки
```

See §43.

### Reset

Provide:

```text
Сбросить прогресс
```

Require confirmation before performing this destructive action. Native `confirm()` is sufficient.

---

# Learning Progress

## 31. Progress Model

Progress is stored separately for every:

```text
card.id + direction
```

Example:

```json
{
  "sr_00123": {
    "sr-ru": {
      "shown": 12,
      "answered": 11,
      "correct": 8,
      "wrong": 3,
      "unknown": 1,
      "streak": 2,
      "level": 3,
      "lastShownAt": "...",
      "lastAnsweredAt": "...",
      "nextReviewAt": "...",
      "lastResult": "correct"
    },

    "ru-sr": {
      "shown": 5,
      "answered": 5,
      "correct": 2,
      "wrong": 3,
      "unknown": 0,
      "streak": 0,
      "level": 1,
      "lastShownAt": "...",
      "lastAnsweredAt": "...",
      "nextReviewAt": "...",
      "lastResult": "wrong"
    }
  }
}
```

Field semantics:

```text
shown      = incremented once each time the item is actually displayed
             (never again by an action on the displayed card)
answered   = regular answers only — one of the 4 options selected
             ("Уже знаю" and "Не знаю" do not count)
unknown    = "Не знаю" presses
lastResult = "correct" | "wrong" | "unknown" | "known"
```

---

## 32. Lightweight Spaced Repetition

Do not implement Anki/FSRS.

Use a simple level-based scheduler.

Intervals:

```text
level 0 → new / now
level 1 → 10 minutes
level 2 → 1 day
level 3 → 3 days
level 4 → 7 days
level 5 → 14 days
level 6 → 30 days
```

All interval values must be centralized in `config.js`.

### Correct answer

```text
level = min(6, level + 1)
streak += 1
lastResult = correct
```

`nextReviewAt` is calculated from the new level.

### Wrong answer

```text
level = max(0, level - 2)
streak = 0
lastResult = wrong
nextReviewAt = now
```

Additionally, add the learning item to a session retry queue.

It should appear again after approximately:

```text
5–10 other questions
```

The exact retry position can be randomized.

If the app is closed before the retry occurs, the item remains due and should have high priority on the next session.

### `Не знаю`

Not counted as a wrong answer in statistics, but for the scheduler it is an explicit "not learned yet" signal. It applies the same failure rule as a wrong answer:

```text
level = max(0, level - 2)
streak = 0
lastResult = unknown
unknown += 1
nextReviewAt = now
```

`answered`, `correct`, `wrong` and `shown` are unchanged.

The item is added to the session retry queue (5–10 other questions), exactly like a wrong answer.

---

## 33. `Уже знаю` Behavior

Pressing:

```text
Уже знаю
```

sets for the current direction:

```text
level = 6
nextReviewAt = now + 30 days
lastResult = known
```

and records `alreadyKnown++` in daily stats.

`shown` is not incremented again (it was already counted when the card was displayed). `answered`, `correct`, `wrong`, `unknown` are not changed.

The opposite direction is not modified.

The app then moves straight to the next card (no feedback state).

---

# Scheduler

## 34. Next-Item Pools

Use three primary pools.

### Review

```text
nextReviewAt <= now
```

### New

Cards that have never been studied.

In Mixed mode, a new card initially exposes only SR → RU.

Showing a card does not move it out of the New pool. A learning item stops being New only after a completed interaction:

- an answer is selected,
- `Уже знаю` is pressed, or
- `Не знаю` is pressed.

If the app is closed while the question is still unanswered, the item remains New. `shown++` and `lastShownAt = now` are updated at display time; `answered`, `correct`, `wrong`, `unknown`, `level` and the `newWords` statistic are not changed.

### Fresh

Learning items that have already been seen but are not yet due.

---

## 35. New-Words Setting

Initial pool weights:

### Less

```text
Review 75%
New    15%
Fresh  10%
```

### Normal

```text
Review 65%
New    25%
Fresh  10%
```

### More

```text
Review 55%
New    35%
Fresh  10%
```

If a selected pool is empty, redistribute its probability among available pools.

---

## 36. Priority Inside Pools

Selection must not be deterministic.

Use weighted random.

Increase priority for learning items that are:

- more error-prone;
- lower level;
- overdue;
- last answered incorrectly, or last marked `Не знаю`.

A reasonable initial formula:

```text
weight =
  1
  + errorRate * 2
  + ((6 - level) / 6) * 1.5
  + overdueFactor * 1.5
  + lastFailureBonus
```

Where:

```text
errorRate = wrong / max(1, answered)

overdueFactor = clamp(
  overdueDuration / currentInterval,
  0,
  2
)

lastFailureBonus =
  1 if lastResult in [wrong, unknown]
  else 0

currentInterval = max(interval(level), 10 minutes)
```

`unknown` is not included in `errorRate` (`wrong / answered`); it is a separate signal, covered by `lastFailureBonus` and the level penalty.

The `10 minutes` floor avoids division by zero at level 0. It is used only for the priority calculation, not for scheduling.

Keep coefficients centralized in `scheduler.js` or `config.js`.

Do not scatter magic constants across the codebase.

---

## 37. Avoid Trivial Repeats

Where possible, do not show the same `card.id` again among approximately the last:

```text
3 cards
```

even if the direction differs.

Exception:

- explicit session retry behavior after a wrong answer.

This avoids patterns such as:

```text
prodavnica → магазин
```

immediately followed by:

```text
магазин → prodavnica
```

---

# Distractors

## 38. Answer Composition

Every question has:

```text
1 correct answer
3 distractors
```

Correct answer position must be randomized.

---

## 39. Dynamic Distractor Selection

Dynamic candidates have priority over hardcoded fallback distractors.

Primary dynamic candidate criteria:

```text
same partOfSpeech
same difficulty
at least one overlapping group
```

Select random candidates from this pool.

### Fallback

If fewer than 3 suitable dynamic candidates are found, randomly fill missing positions from:

```json
card.distractors
```

for the target answer language.

### Further fallback

If there are still not enough options, progressively loosen dynamic criteria:

```text
same partOfSpeech
difficulty ±1
common group
```

then:

```text
same partOfSpeech
difficulty ±1
```

then:

```text
same partOfSpeech
```

Keep the implementation simple.

For datasets of roughly 1,000–5,000 cards, scanning/filtering the full card list is acceptable.

---

## 40. Distractor Exclusions

Always exclude:

- current card;
- correct answer;
- duplicate answers;
- another sense of the same `word`;
- already selected distractors.

For RU → SR also exclude cards with exactly the same `translation`, because they could produce multiple valid Serbian answers.

Normalize strings before duplicate comparison using at least:

```text
trim
case normalization
ё → е
```

The same normalization is used by the runtime and the validator.

---

# Persistence

## 41. `localStorage`

Use `localStorage` for:

- per-card learning progress;
- daily statistics;
- settings.

Do not store `cards.json` in `localStorage`.

Suggested keys:

```text
vocab.progress.v1
vocab.stats.v1
vocab.settings.v1
```

When reading `localStorage`, handle:

- missing values;
- invalid JSON;
- old or incomplete structures.

A corrupt value must not crash the whole application.

---

# Cards Cache and Update

## 42. Normal Startup

On normal app startup:

- use the currently cached/local card dataset;
- do not automatically check the network for a newer version.

Offline startup must remain fully functional.

---

## 43. Manual App and Card Update

The button:

```text
Обновить приложение и карточки
```

checks the single release version (§3):

1. fetch `version.txt` from the network, bypassing the Service Worker cache (`cache: 'no-store'`);
2. compare it with the running version.

If equal:

```text
Уже актуально.
```

If different: show `Обновляю, перезапуск…`, unregister the Service Worker, delete the caches and reload. Code and cards then load fresh from the network and a new Service Worker re-caches them. A words-only release is handled the same way.

Learning progress lives in `localStorage` and is unaffected. Stable card IDs are the basis for preserving progress across dataset changes.

The Service Worker file itself carries no version and does not change between releases.

If the network is unavailable:

```text
Не удалось проверить обновление.
```

The current app and dataset must continue working.

---

## 44. Removed Cards

If a previously existing card disappears from a newer `cards.json`:

- its old progress may remain in `localStorage`;
- it is simply ignored by the scheduler.

Automatic cleanup of orphaned progress is not required.

---

# Cards Validator

## 45. Validator Script

Create a separate local validator:

```text
scripts/validate-cards.js
```

The runtime application must not depend on it.

Node.js is allowed for this script.

Do not require npm packages.

Example usage:

```bash
node scripts/validate-cards.js \
  data/history/2026-10-03T00-00-00Z.cards.json \
  data/cards.json
```

If no previous file is given, the validator uses the latest file in `data/history/` (by name). If `data/history/` is empty (first dataset), the previous-vs-new checks are skipped.

---

## 46. Validator — Current Dataset

Validate at minimum:

- valid JSON;
- expected top-level structure (`{ "cards": [] }`);
- unique card `id`;
- unique `word + sense`;
- valid `sense` format;
- all required fields exist;
- non-empty `word`;
- non-empty `translation`;
- non-empty `pronunciation`;
- `examples.length` is between 1 and 3;
- every example contains both `sr` and `ru`;
- `partOfSpeech` belongs to an allowed enum;
- `difficulty` is `1`, `2`, or `3`;
- `groups` contains 1–3 entries;
- no duplicate groups;
- `distractors.ru` and `distractors.sr` each contain exactly 3 entries;
- no duplicate fallback distractors;
- fallback distractor does not equal the correct answer.

Duplicate checks use the normalization from §40.

Warnings (do not fail validation):

- several cards share the same normalized `translation` (reverse-direction ambiguity; review manually);
- one `word` has more than 3 cards (possible over-split senses).

Suggested `partOfSpeech` enum:

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

Keep semantic `groups` as a flat tag list rather than a complex taxonomy.

Examples:

```text
food
place
people
time
movement
shopping
home
work
communication
quantity
description
restaurant
```

---

## 47. Validator — Previous vs New Dataset

When a previous dataset is supplied, validate identity stability.

For every existing `id`:

```text
word must not change
sense must not change
```

Additionally, if an existing:

```text
word + sense
```

exists in both versions, its `id` must remain unchanged.

Allowed changes without changing `id`:

- translation;
- pronunciation;
- examples;
- part of speech corrections;
- difficulty;
- groups;
- distractors.

A removed old card should produce a warning.

A new `word + sense` receives a new ID.

### Across all history

The validator also scans every file in `data/history/`. An `id` that ever existed in any history file must, if present in the new dataset, still map to the same `word + sense`. A deleted ID must never be reused for a different card; this fails validation.

---

## 48. Validator — Duplicate Words and Polysemy

The same `word` may appear multiple times only with different `sense` values.

Valid:

```text
račun / bill
račun / calculation
```

Invalid:

```text
račun / bill
račun / bill
```

---

## 49. Validator — Distractor Simulation

The validator must simulate distractor selection for:

```text
every card
SR → RU
RU → SR
```

and verify that the algorithm can produce:

```text
1 correct + 3 unique distractors
```

If this cannot be done, validation must fail.

The validator must import the runtime `js/distractors.js` module. It must not reimplement the distractor algorithm.

This is an end-to-end regression check for the actual runtime distractor algorithm. With the current requirement of three valid fallback distractors it is normally expected to pass, but it must remain in place to catch future algorithm or validation-rule changes.

---

# Statistics and Reset

## 50. Statistics Retention

Store daily aggregates only for the latest:

```text
30 calendar days
```

Remove older daily aggregates.

Per-card learning progress does not expire.

---

## 51. Reset Progress

`Сбросить прогресс` removes:

- per-card progress;
- daily statistics.

It does not remove:

- cached cards;
- current card dataset;
- PWA application cache.

After reset, all cards are considered new again.

---

# Explicitly Out of Scope for v1

## 52. Do Not Implement

Do not implement:

- backend;
- registration/login;
- cloud sync;
- IndexedDB;
- export/import;
- audio;
- speech synthesis;
- push notifications;
- daily goals;
- streak gamification;
- achievements;
- text-input answers;
- swipe navigation;
- Serbian Cyrillic/Latin toggle;
- automatic card updates on startup;
- detailed event history;
- Anki scheduler;
- FSRS;
- complex routing;
- complex animation system.

---

# Visual Acceptance Criteria

## 53. Reference Screenshots

Store approved visual references in:

```text
docs/design/
  learn-question.png     Question state (two secondary buttons)
  learn-correct.png      Correct state
  learn-wrong.png        Wrong state — OUTDATED: single `Уже знаю`, header `Words`;
                         use it only for the wrong-answer colors/feedback layout
  learn-dont-know.png    Unknown state (`Не знаю`, §25a), RU → SR
  learn-progress.png     Progress and settings screen
```

`learn-question`, `learn-correct`, `learn-dont-know` and `learn-progress` are reference mockups (not exact 390 × 844 exports): use them for layout, hierarchy, colors and states; exact sizes come from this spec.

Where a reference and this spec disagree on text or behavior, the spec wins (e.g. `Обновить приложение и карточки`, §30; secondary buttons ≥ 44px tall, §18).

The coding agent must compare the implementation against these screenshots.

At:

```text
390 × 844
```

the implementation should visually match the approved references in:

- layout;
- visual hierarchy;
- spacing;
- typography;
- colors;
- control sizes;
- answer states;
- feedback placement;
- bottom-panel placement.

Literal pixel-perfect image-diff equality is not required because browser/font rendering may differ slightly.

Meaningful visual divergence is not acceptable.

---

# Implementation Principles

## 54. Keep the Architecture Small

Prefer simple code over generalized abstractions.

This is a small personal application.

Do not introduce architecture intended for a large SaaS product.

In particular:

- no dependency injection framework;
- no global event bus;
- no custom component framework;
- no state-management library;
- no unnecessary persistence abstraction;
- no generic plugin architecture.

Use small modules with clear responsibilities.

---

## 55. Business Logic Independence

The following modules should remain independent from Alpine/DOM as much as practical:

```text
scheduler.js
distractors.js
storage.js
stats.js
cards.js
```

They should operate on plain JavaScript data.

Alpine/UI code should call them rather than contain the learning algorithm itself.

---

## 56. Configuration

Keep important tunable values centralized, for example in:

```text
js/config.js
```

Including:

- spaced-repetition intervals;
- new/review/fresh pool weights;
- retry range `5–10`;
- recent-card exclusion size;
- scheduler coefficients;
- statistics retention days.

Do not duplicate these constants throughout the codebase.

---

# Definition of Done

## 57. Functional Acceptance

The application is considered complete for v1 when:

1. It runs from GitHub Pages.
2. It can be installed as a PWA.
3. It works offline after initial load.
4. Serbian → Russian works.
5. Russian → Serbian works.
6. Mixed mode works.
7. Progress is independent for both directions.
8. Correct and wrong answers update learning progress.
9. Wrong answers and `Не знаю` are reintroduced later in the session.
10. `Уже знаю` and `Не знаю` work per direction.
11. New/review/fresh weighted scheduling works.
12. Dynamic distractors with fallback work.
13. Progress survives browser restarts.
14. Daily statistics are retained for 30 days.
15. Manual app and card update works.
16. Dataset updates preserve progress by stable ID.
17. Reset progress works.
18. The card validator passes the dataset.
19. The UI matches the approved Concept B references.
20. No network is required for normal usage after the app has been cached.
