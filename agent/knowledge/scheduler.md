# Scheduler and config

- All tunables in `js/config.js`, each with a "controls → effect" comment. No magic numbers elsewhere (incl. `TAP_GUARD_MS`).
- `PRIORITY` in config = in-pool selection weight (spec §36), NOT card `priority` (tier).
- Tiers (spec §35a) live in `scheduler.js`, not a separate module (new runtime file → SW precache + pages.yml).
- Active tier never stored; recomputed on every `nextItem`. No cache, nothing to invalidate.
- Introduced = any direction has `lastResult` (reuses `stats.isFirstInteraction`). Shown-only ≠ introduced.
- Mastered = Σ`correct` ≥ 5 or `known` > 0. Only monotonic counters → tiers never reopen on failures. `lastResult` alone is not enough (overwritten).
- New gating: unseen card only if `priority == activeTier` and tier unmastered < `MAX_ACTIVE_LEARNING[newWords]`. Introduced cards' unscheduled direction bypasses gating (direction switch).
- Tests: `random: () => 0` → first available pool (review, new, fresh order), first item. Card fixtures need `priority`.
- Every completed interaction goes through `stats.interact` (progress + daily stats). `Добавить в обучение` (`words.addToLearning`) = `interact` + `markUnknown` on SR→RU — never a separate transition.
- Tests import tunables from `js/config.js`; never hardcode their values (config gets retuned).
