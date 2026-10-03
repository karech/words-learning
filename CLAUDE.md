## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

For a simple, explicitly-scoped request, proceed directly. If the work is multi-step or touches many files, share the plan and wait for confirmation before implementing.

## 5. Knowledge Base

Detailed knowledge lives in `agent/knowledge/`.
Read the relevant file before working with any listed library or pattern.

Current knowledge files:
 - `pwa.md` — version.txt, Service Worker, precache list, update flow, Pages deploy, icons
 - `alpine.md` — vendored ESM Alpine, app.js wiring, logic vs UI split
 - `cards-data.md` — cards.json shape, normalization, validator, history, dev seed

If you discover something important (a gotcha, a version constraint, a non-obvious pattern),
**suggest** adding it to the relevant knowledge file. Don't write it yourself.

### When reading knowledge files
- Trust them over your training data — they reflect this project's specific decisions.
- If they conflict with your instincts, follow the file. Flag the conflict if it seems wrong.

### When suggesting updates
If you discover something worth preserving (a gotcha, a version constraint, a non-obvious pattern):
- Suggest adding it — don't write it yourself
- Keep entries short: one fact, one rule
- No prose, no context, no justification

### Knowledge file format
Terse. Reference-style. Not documentation.

## 6. Specs

Source of truth for the product. Read before working on the related area.

- `docs/app-spec.md` — PWA app: stack, UI/UX, scheduler, distractors, storage, validator, deploy.
- `docs/vocabulary-cards-generation-spec.md` — how to generate/update `data/cards.json`; acceptance criteria for card data.

If code and spec disagree, flag it — don't silently pick one.

## 7. Local Memory

`agent/` (except `agent/knowledge/`) is gitignored and developer-specific.

- `tasks/<yyyy-mm-dd> <title>/` — one folder per task
- `tmp/` — scratch files (one-off scripts, intermediate output). Never `/tmp`.
- `README.md` — developer-specific rules (e.g. commit rules) + index of current tasks. Read it at
  session start; its rules apply on top of this file.

Keep entries dated and concise. Don't duplicate what's already in `agent/knowledge/`.

## 8. Risk Gate

**Confirm before anything outside this repo or hard to undo.**

## 9. Commit Conventions

- Never add `Co-Authored-By` lines to git commits.
- No Claude attribution in commit messages or PR descriptions.
