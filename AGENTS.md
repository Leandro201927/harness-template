# AGENTS.md

This repository is designed for long-running coding-agent work. The goal is not
to maximize raw code output. The goal is to leave the repo in a state where the
next session can continue without guessing.

## Startup Workflow

Before writing code:

1. Confirm the working directory with `pwd`.
2. Read [session-handoff](./agent/state/session-handoff.md) if it indicates a prior session ended without completion, start from the continuation context it provides, otherwise treat it as an empty or no-handoff marker.
3. Read [progress](./agent/state/progress.md) for the latest verified state and next step.
4. Read [feature_list](./agent/state/feature_list.json) and choose the highest-priority unfinished feature.
5. Review recent commits with `git log --oneline -5`.
6. Run `./agent/verification/init.sh`.

If baseline verification is already failing, fix that first. Do not stack new feature work on top of a broken starting state.


## Working Rules

- Work on one feature at a time.
- Do not mark a feature complete just because code was added.
- Keep changes within the selected feature scope unless a blocker forces a
  narrow supporting fix.
- Do not silently change verification rules during implementation.
- Before implementing, at minimum read: architecture, product, reliability, the active feature doc (if one exists under ./agent/docs/features/* ), and any other doc referenced by the active feature's verification field.
- Respect the structure (do not add/delete sections) of each required `.md` artifact if will be updated.
- Do not change any file coming from the [templates](./agent/templates) directory.
- Feature task plans live ONLY in `./agent/docs/features/feature-XXX.md` under the `## Implementation Tasks (Dynamic)` section. Never inside `feature_list.json`.
- Every feature must have a task plan, the task plan must be followed when implementing.
- Do not delete any task plan under the `## Implementation Tasks (Dynamic)` section coming from `./agent/docs/features/`.


## Required Artifacts

- `./agent/docs/architecture.md`: documentation for the system architecture
- `./agent/docs/product.md`: documentation for the system product
- `./agent/docs/reliability.md`: documentation for how the system proves it is healthy and restartable
- Feature docs under `./agent/docs/features/` include a runtime-editable `Implementation Tasks (Dynamic)` table; this is the only authoritative task list for the feature.
- `./agent/state/logs/session-log-${id}.md`: session log with critical decisions, verification run, evidence captured, commits, files or artifacts updated, known risk or unresolved issue
- `./agent/state/clean-state-checklist.md`: checklist for cleaning the repository state after a session ends
- `./agent/state/feature_list.json`: source of truth for feature state and priority
- `./agent/state/progress.md`: last verified state and next step to take
- `./agent/state/session-handoff.md`: compact handoff for letting the agent continue from where it left off if last session were not completed
- `./agent/verification/init.sh`: standard startup and verification path
- `./agent/verification/check-architecture.sh`: check the system architecture (runnable from init.sh)
- `./agent/verification/e2e-check.sh`: check the end-to-end functionality (runnable from init.sh)


## Semantics Of State Artifacts

- [feature_list](./agent/state/feature_list.json) is the source of truth for feature status and priority.
   - [features](./agent/docs/features/*) directory contains the feature docs, each one per feature.
   - [feature-XXX.md](./agent/docs/features/feature-XXX.md) is the feature doc for feature `XXX`. It contains a `## Implementation Tasks (Dynamic)` section.
- [progress](./agent/state/progress.md) is a short startup snapshot and a rolling index of the last 5 sessions only.
  It must not duplicate the full feature list, and it must not contain the full text of session logs.
  When the 5-session window is exceeded, remove the oldest entry from the index in [progress](./agent/state/progress.md);
  the corresponding [logs/session-log-*.md](./agent/state/logs/session-log-*.md) file remains in place as durable history.
- [logs/session-log-${id}.md](./agent/state/logs/session-log-${id}.md) belongs to a session (one file per session), not to a feature.
  A single session may touch multiple features (for example baseline repair + current feature),
  and that work is recorded together in that session's log.
- When a feature is marked done:
  - update [feature_list](./agent/state/feature_list.json) with status, evidence summary and session ids involved;
  - update [progress](./agent/state/progress.md) with the new priority snapshot, verified state and blocker;
  - if applicable, update the feature narrative in [docs](./agent/docs/features/*) (or create it);
  - do not delete or move existing session logs because a feature completed.
- [init.sh](./agent/verification/init.sh) is the standard startup and verification path. Baseline is considered broken if and only if `init.sh` exits non-zero. `init.sh` must run:
  - check-architecture.sh: check the system architecture
  - e2e-check.sh: check the end-to-end functionality
  and propagate their failures: any of them failing must make `init.sh` fail.


## Must-to-be Structure of Required Artifacts

The following Required Artifacts should follow the structure template. Use it as a reference to create new artifacts.

- [clean-state-checklist](./agent/state/clean-state-checklist.md)
   - Template: [clean-state-checklist.md](./agent/templates/state/clean-state-checklist.md)
- [feature_list](./agent/state/feature_list.json)
   - Template: [feature_list.json](./agent/templates/state/feature_list.json)
   - Each feature should have `id`, `priority`, `area`, `title`, `user_visible_behavior`, `status`, `verification`, and `session_ids` fields.
   - `status` field should be one of:
      - not_started: Work has not begun
      - in_progress: The feature is the current active task
      - blocked: Work cannot continue until a documented blocker is resolved
      - passing: Required verification has passed and evidence is recorded
   - `session_ids` field should be an array of strings, each string is a session ID (`yyyy-MM-dd-hhmmss`).
      - `logs/session-log-${id}.md` template: [session-log-${id}.md](./agent/templates/state/logs/session-log-${id}.md)
- [progress](./agent/state/progress.md)
   - Template: [progress.md](./agent/templates/state/progress.md)
- [session-handoff](./agent/state/session-handoff.md)
   - Template: [session-handoff.md](./agent/templates/state/session-handoff.md)


## Definition Of Done

A feature is considered done when its status in [feature_list](./agent/state/feature_list.json) is passing and all Definition of Done bullets are true:

- the target behavior is implemented
- the required verification actually ran
- after implementing the feature, run init.sh to verify the baseline. If not passing, the feature is not done.
- evidence is recorded in [feature_list](./agent/state/feature_list.json) and [progress](./agent/state/progress.md)
- the repository remains restartable from the standard startup path (`./agent/verification/init.sh`)
- critical decisions are recorded in the [session log](./agent/state/logs/session-log-${id}.md). If the session ends without completing the task, the same critical decisions plus next steps and blockers must also be surfaced in [session-handoff.md](./agent/state/session-handoff.md).


## End Of Session

Before ending a session:

1. Write the session log in [logs](./agent/state/logs) directory.
2. Update [feature_list](./agent/state/feature_list.json).
   - Make sure to append the session ID to the `session_ids` field of the feature.
3. Update [session-handoff](./agent/state/session-handoff.md) as follows:
   - if the session ended without completing the active task, write a compact continuation context (critical decisions, next steps, blockers, known broken state) and mark the handoff as active;
   - if the session completed safely and there is no continuation context, reset session-handoff.md to the empty/no-handoff marker defined in its template.
4. Update [progress](./agent/state/progress.md).
5. Review [clean-state-checklist](./agent/state/clean-state-checklist.md).
6. Record any unresolved risk or blocker.
7. Ensure the repo is restartable from [init.sh](./agent/verification/init.sh); if a public root wrapper is provided by this repo, ensure it also works and its path is documented either here or in [reliability.md](./agent/docs/reliability.md).
8. Commit only after [progress](./agent/state/progress.md) and [feature_list](./agent/state/feature_list.json) are updated, the baseline is passing (if applicable), and the clean-state checklist is reviewed.
