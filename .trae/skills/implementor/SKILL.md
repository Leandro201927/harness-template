---
name: "implementor"
description: "Takes an approved feature (status:in_progress) through the Startup → Implementation → Handoff (Ralph loop v0.1). Invoked ONLY after feature-planner has spec'd the work and a human has approved the plan."
---

# Implementor Skill

## Purpose

This skill is the **implementing agent**. It executes the "Ralph loop v0.1":

```
Baseline (context retrieval) → Implementation (coding/testing) → Handoff (evaluation/commit)
```

It does **NOT** plan features, invent specs, or create new feature entries. That is the exclusive responsibility of the `feature-planner` skill at [feature-planner/SKILL.md](./.trae/skills/feature-planner/SKILL.md). This skill consumes the output produced by `feature-planner` (a feature-XXX.md document with an `Implementation Tasks (Dynamic)` table) and brings it to `passing` status.

## Trigger Conditions

Invoke this skill when **ALL** of the following are true:

1. A feature in `agent/state/feature_list.json` has `status: "in_progress"`, OR a human has just approved a `not_started` feature and explicitly ordered implementation to begin.
2. The feature document at `agent/docs/features/feature-XXX.md` exists and contains a populated `## Implementation Tasks (Dynamic)` table (produced by feature-planner).
3. The user is **NOT** asking to plan/specify a new feature (that would be a feature-planner trigger instead).
4. No conflicting implementation session is active (unless `agent/state/session-handoff.md` explicitly indicates a continuation from a prior incomplete session).

Do **NOT** invoke this skill if:

- The user request is to plan, spec, or design a new feature or improvement (use `feature-planner` instead).
- No feature in `feature_list.json` is marked `in_progress` AND no human has given explicit implementation approval for a `not_started` one.
- The matching `feature-XXX.md` does not exist or its task table is missing/empty (go back to feature-planner first).

## Pre-flight: Required Context Gathering

Before writing any code, read **ALL** of the following artifacts in this order. If any artifact is empty or missing, record the gap in the session log and — if it blocks safe implementation — surface it as a blocker instead of guessing.

1. `agent/state/session-handoff.md` — continuation context, known broken state, or prior unfinished work.
2. `agent/state/progress.md` — last verified state, avoid regressing listed passing features.
3. `agent/state/feature_list.json` — confirm the `in_progress` feature ID, its priority, the `single_active_feature` setting, and the `verification` field.
4. Review recent commits with `git log --oneline -5`.
5. `agent/docs/architecture.md` — layers, services, data flow, storage. If empty, you must treat missing architectural pieces as blockers rather than inventing them.
6. `agent/docs/product.md` — feature areas, constraints, UI hints.
7. `agent/docs/reliability.md` — golden journeys, restart rules. The verification you perform must align with (or explicitly reference) these.
8. `agent/docs/design.md` — design system rules to respect when building UI components: token usage, folder convention for new components, theming strategy, accessibility baselines, base component library usage patterns. If empty or missing, fall back to default framework conventions and record the gap in the session log; do not invent design-system rules.
9. The active feature document: `agent/docs/features/feature-XXX.md` — especially the `Objective`, `Expected Behavior`, `Out of Scope`, `Acceptance Criteria`, `Minimum Expected Evidence`, and the full `Implementation Tasks (Dynamic)` table.
10. Any additional document referenced inside the `verification` array of the active feature's `feature_list.json` entry.

## Startup Workflow (Ralph Loop Phase 1 — Baseline)

Run these steps **before** any coding. Do not skip them, even if you "already know" the repo.

1. Confirm the working directory with `pwd`.
2. Read [session-handoff](./agent/state/session-handoff.md). If it indicates a prior session ended without completion, start from the continuation context it provides. Otherwise treat it as an empty/no-handoff marker.
3. Read [progress](./agent/state/progress.md) for the latest verified state and next step.
4. Read [feature_list](./agent/state/feature_list.json) and choose the highest-priority unfinished feature that is `in_progress` (or the one the human just approved).
5. Review recent commits with `git log --oneline -5`.
6. Run `./agent/verification/init.sh`.

**HARD RULE:** If baseline verification (`init.sh`) is already failing, fix that first. Do **not** stack new feature work on top of a broken starting state. If the baseline is broken and you cannot safely repair it within a reasonable scope, surface it as a blocker.

## Working Rules

Follow these during the Implementation phase. They are scope and quality guards, not suggestions.

- Work on **one feature at a time**. The `single_active_feature` setting in `feature_list.json` may additionally enforce this at the data-structure level; respect it either way.
- Do **not** mark a feature complete just because code was added. Completion requires the Definition of Done below.
- Keep changes **within the selected feature scope** unless a blocker forces a narrow supporting fix. If a supporting fix is required, log it in the session log with justification.
- Do **not** silently change verification rules during implementation. If the `verification` steps from `feature_list.json` conflict with reality, surface this and amend them explicitly (append the delta to the session log and to the feature doc's Task Rationale).
- Before implementing, at minimum read: architecture, product, reliability, design, the active feature doc under `./agent/docs/features/*`, and any other doc referenced by the active feature's `verification` field.
- Respect the structure of each required `.md` artifact you update: do **not** add or delete sections. Fill within the existing templates.
- Do **not** change any file coming from the [templates](./agent/templates) directory.
- Feature task plans live **ONLY** in `./agent/docs/features/feature-XXX.md` under the `## Implementation Tasks (Dynamic)` section. Never inside `feature_list.json`.
- Every feature must have a task plan, and the task plan must be followed when implementing. If a task plan turns out to be wrong, amend it using the Dynamic Task Update Rules below; do not abandon it silently.
- Do **not** delete any task plan row under the `## Implementation Tasks (Dynamic)` section, even if the task becomes obsolete — mark it `cancelled` with a reason instead.

## Dynamic Task Execution & Update Rules

You will execute tasks from the `## Implementation Tasks (Dynamic)` table in `agent/docs/features/feature-XXX.md`, respecting `Depends On` ordering. When editing the task table (progress updates, structural changes), follow these rules to keep auditability:

- **Execution order:** Process tasks in dependency order. A task whose `Depends On` is not all `done` (or equivalent) must not be started.
- **To add a task:** Insert a new row with the next integer ID, or if slotting between existing IDs, use decimals (e.g. `3.1`, `3.2`) and set `Depends On` appropriately.
- **To remove a task:** Do NOT delete the row. Set `Status = cancelled` and fill `Notes` with the reason (e.g., "Obsolete after task 2 changed architecture").
- **To split a task:** Set the original row's `Status = split`, add `Notes = "Split into X.Y sub-tasks"`, then add sub-tasks with IDs `[original].1`, `[original].2`, ... and set their `Depends On = [original's prereqs]`.
- **Complete a task:** Set `Status = done` and fill `Notes` with a short evidence pointer (e.g., commit hash, file updated, test output reference).
- After every structural edit, add a one-line timestamped entry under **Task Rationale** summarizing the change. E.g. `[2026-08-15 09:30] Added task 2.1 after discovery that auth service doesn't exist.`.
- When the feature reaches `passing` status, freeze the table: do not edit it further (no rows added / removed). Future work on the same area becomes a new feature.

## Verification & Baseline Rules

- [init.sh](./agent/verification/init.sh) is the standard startup and verification path. Baseline is considered broken if and only if `init.sh` exits non-zero.
- `init.sh` must run and propagate failures from both:
  - `check-architecture.sh` — checks the system architecture.
  - `e2e-check.sh` — checks the end-to-end functionality.
  Any one of them failing must make `init.sh` fail.
- After implementing each task, run the narrowest applicable unit / integration / lint check available. Do not defer all verification to the end of the feature.

## Definition Of Done

A feature is considered done when its status in [feature_list](./agent/state/feature_list.json) is `passing` and **all** of the following bullets are true:

- the target behavior is implemented (maps to the Acceptance Criteria in the feature doc).
- the required verification actually ran — both the feature-specific `verification[]` steps from `feature_list.json` and the standard `init.sh` baseline.
- after implementing the feature, run `init.sh` to verify the baseline. If not passing, the feature is **not** done.
- evidence is recorded in [feature_list](./agent/state/feature_list.json) and [progress](./agent/state/progress.md).
- the repository remains restartable from the standard startup path (`./agent/verification/init.sh`).
- critical decisions are recorded in the [session log](./agent/state/logs) (`session-log-${id}.md`). If the session ends without completing the task, the same critical decisions plus next steps and blockers must also be surfaced in [session-handoff.md](./agent/state/session-handoff.md).

## End Of Session (Ralph Loop Phase 3 — Handoff)

Before ending a session (whether the feature completed or was interrupted), run these 8 steps in order. Commit only after step 8 is satisfied.

1. Write the session log in the [logs](./agent/state/logs) directory. One file per session: `session-log-${id}.md` where `id` is `yyyy-MM-dd-hhmmss`.
2. Update [feature_list](./agent/state/feature_list.json). Make sure to append the session ID to the `session_ids` field of the feature (and any other features touched for baseline repair).
3. Update [session-handoff](./agent/state/session-handoff.md) as follows:
   - if the session ended **without** completing the active task, write a compact continuation context (critical decisions, next steps, blockers, known broken state) and mark the handoff as active.
   - if the session completed safely and there is no continuation context, reset `session-handoff.md` to the empty/no-handoff marker defined in its template.
4. Update [progress](./agent/state/progress.md) with the new priority snapshot, verified state, and blocker (if any).
5. Review [clean-state-checklist](./agent/state/clean-state-checklist.md).
6. Record any unresolved risk or blocker in the session log and, if it outlives the session, also in `session-handoff.md`.
7. Ensure the repo is restartable from [init.sh](./agent/verification/init.sh). If a public root wrapper is provided by this repo, ensure it also works and its path is documented either here or in [reliability.md](./agent/docs/reliability.md).
8. Commit **only after** [progress](./agent/state/progress.md) and [feature_list](./agent/state/feature_list.json) are updated, the baseline is passing (if applicable), and the clean-state checklist is reviewed.
