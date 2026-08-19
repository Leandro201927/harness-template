# AGENTS.md

This repository is a harness-template designed for long-running coding-agent work.
The goal is not to maximize raw code output. The goal is to leave the repo in a
state where the next session can continue without guessing.

> **IMPORTANT — READ THIS FIRST:**
> This file is an **instruction routing map** and a holder for shared,
> role-independent rules and semantics. It does **NOT** contain operational
> implementation workflows, feature-planning workflows, **nor bootstrap/scaffolding
> workflows**. Those live in dedicated skills.
>
> - To start a brand-new project via official CLIs (scaffolding inside `./src`) → see the `bootstraper` skill.
> - For the planning/specification workflow on an existing project → see the `feature-planner` skill.
> - For the Startup→Implementation→Handoff workflow on an approved feature → see the `implementor` skill.
>
> Reading this file for operational implementation
> (Startup / Definition of Done / End of Session) is WRONG for every role.
> Those live in the `implementor` skill.

## 1. Instruction Routing Map

```
User Request ──┐
               │
               │ Contains keyword "bootstrap"?
               │
               ├── YES ────────────────────────────────────────────┐
               │                                                    ▼
               │                                  ┌──────────────────────────────────────────┐
               │                                  │  bootstraper SKILL                        │ IF: new project, keyword "bootstrap" present,
               │                                  │  [bootstraper/SKILL.md]                   │     user confirms ./src overwrite if needed.
               │                                  └──────────────────┬────────────────────────┘ PRODUCES: scaffolded empty baseline under ./src
               │                                                     │                           + writes/updates agent/docs/security.md
               │                                                     │  FINAL STATE: ./src ready, this pass ENDS HERE.
               │                                                     │  Do NOT continue into feature work in the same pass.
               │                                                     │
               ▼  NO "bootstrap" keyword (standard harness path)
   ┌──────────────────────────────────────────┐
   │  feature-planner SKILL                   │  IF: new implementation request,
   │  [feature-planner/SKILL.md]              │      no existing feature matches.
   └──────────────────┬───────────────────────┘  PRODUCES: feature-XXX.md +
                      │                          feature_list.json entry
                      │                          FINAL STATE: status = not_started
                      │
                      ▼  HUMAN APPROVAL  (REQUIRED — explicit approval to proceed)
   ┌──────────────────────────────────────────┐
   │  implementor SKILL                       │  IF: feature approved,
   │  [implementor/SKILL.md]                  │      status = in_progress
   └──────────────────┬───────────────────────┘  EXECUTES: Ralph loop v0.1
                      │                          (Baseline → Implementation → Handoff)
                      │                          FINAL STATE: status = passing
                      │
                      ▼
            Baseline Verifications
            (agent/verification/init.sh
             → check-architecture.sh
             → e2e-check.sh)
```

## 2. Instruction Routing Table (Explicit)

| Operation                                                       | Role        | Routing Path                                                                                                                             |
| --------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Bootstrap a brand new project via OFFICIAL framework CLIs (empty scaffolding) inside `./src`** | Bootstraper | [.trae/skills/bootstraper/SKILL.md](./.trae/skills/bootstraper/SKILL.md)                                                                 |
| Plan a new feature, write the spec, write the task plan         | Planner     | [.trae/skills/feature-planner/SKILL.md](./.trae/skills/feature-planner/SKILL.md)                                                         |
| Execute the Ralph loop: Startup → Implementation → Handoff      | Implementor | [.trae/skills/implementor/SKILL.md](./.trae/skills/implementor/SKILL.md)                                                                 |
| Define artifact semantics, shared rules, structure requirements | All roles   | This file — AGENTS.md (sections below)                                                                                                   |
| Validate repository health via scripts                          | All roles   | `agent/verification/init.sh`                                                                                                             |

## 3. Transversal Working Rules (Shared by All Roles)

These rules apply equally to the bootstraper, the planner, and the implementor.

- Work on **one feature at a time** at the repository level.
- Respect the structure (do **not** add or delete sections) of each required `.md` artifact if you will update it. Fill within the existing templates.
- Do **not** change any file coming from the [templates](./agent/templates) directory.
- Feature task plans live **ONLY** in `./agent/docs/features/feature-XXX.md` under the `## Implementation Tasks (Dynamic)` section. Never inside `feature_list.json`.
- Every feature must have a task plan before implementation begins.

## 4. Global Anti-Drifting Guards

These are constraints that every agent (bootstraper, planner, or implementor) must self-enforce. If a guard cannot be satisfied, surface the problem explicitly rather than silently guessing.

1. **Planners do NOT invent implementation content.**
   If you are the planner role, do NOT invent implementation execution, write code, install dependencies, or run the app. That is the implementor's responsibility.
2. **Implementors do NOT invent specs.**
   If you are the implementor role, do NOT invent a new feature spec, re-scope, or rewrite the Acceptance Criteria of the active feature. The planner and the human are the authorities on scope.
3. **Bootstrappers do NOT implement business features.**
   If you are the bootstraper role, do NOT implement business logic, custom endpoints, or feature views beyond the empty framework scaffold. After the bootstrap report, END THE PASS and route any follow-up feature work through `feature-planner → implementor`.
4. **Single source of truth for status.**
   `agent/state/feature_list.json` is the only source of truth for feature status and priority. Do not change status without the corresponding trigger (human approval for not_started → in_progress, Definition of Done passing for in_progress → passing).
5. **Templates remain untouched.**
   Read `agent/templates/*` for structure only. Never write into the `agent/templates/` directory.
6. **Only bootstraper and implementor may touch `agent/docs/security.md`.**
   `feature-planner` never writes to the security artifact. It is the single source of truth for applied controls, written during scaffolding and updated when security-relevant implementation changes occur.
7. **Only bootstraper and implementor may touch `agent/docs/design.md`.**
   `feature-planner` never writes to the design artifact. It is the single source of truth for applied design system decisions, written during scaffolding and updated when design-relevant implementation changes occur.

## 5. Required Artifacts

These artifacts define the system of record. All roles must know them, update them as required, and never bypass them.

- `./agent/docs/architecture.md`: documentation for the system architecture
- `./agent/docs/product.md`: documentation for the system product
- `./agent/docs/reliability.md`: documentation for how the system proves it is healthy and restartable
- `./agent/docs/security.md`: documentation for all security controls, minimum bar, and decisions. Updated ONLY by the `bootstraper` and `implementor` skills.
- `./agent/docs/design.md`: documentation for all design system decisions, tokens, component libraries, folder conventions, theming, typography, colors, and accessibility standards. Updated ONLY by the `bootstraper` and `implementor` skills.
- Feature docs under `./agent/docs/features/` include a runtime-editable `Implementation Tasks (Dynamic)` table; this is the only authoritative task list for the feature.
- `./agent/state/logs/session-log-${id}.md`: session log with critical decisions, verification run, evidence captured, commits, files or artifacts updated, known risk or unresolved issue
- `./agent/state/clean-state-checklist.md`: checklist for cleaning the repository state after a session ends
- `./agent/state/feature_list.json`: source of truth for feature state and priority
- `./agent/state/progress.md`: last verified state and next step to take
- `./agent/state/session-handoff.md`: compact handoff for letting the agent continue from where it left off if last session were not completed
- `./agent/verification/init.sh`: standard startup and verification path
- `./agent/verification/check-architecture.sh`: check the system architecture (runnable from init.sh)
- `./agent/verification/e2e-check.sh`: check the end-to-end functionality (runnable from init.sh)

## 6. Semantics Of State Artifacts

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

## 7. Must-to-be Structure of Required Artifacts

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
- [architecture](./agent/docs/architecture.md)
  - Template: [architecture.md](./agent/templates/docs/architecture.md)
- [product](./agent/docs/product.md)
  - Template: [product.md](./agent/templates/docs/product.md)
- [reliability](./agent/docs/reliability.md)
  - Template: [reliability.md](./agent/templates/docs/reliability.md)
- [security](./agent/docs/security.md)
  - Template: [security.md](./agent/templates/docs/security.md)
  - Updated **ONLY** by `bootstraper` and `implementor`. The `feature-planner` skill must not write to this artifact.
- [design](./agent/docs/design.md)
  - Template: [design.md](./agent/templates/docs/design.md)
  - Updated during bootstrap (by `bootstraper`) when the project contains a frontend. The `feature-planner` skill must not write to this artifact. Updated by `implementor` only when design-relevant implementation changes occur.

