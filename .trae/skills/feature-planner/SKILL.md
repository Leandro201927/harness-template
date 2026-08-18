---
name: "feature-planner"
description: "Transforms a user's natural-language request into a structured harness feature with dynamic implementation tasks. Invoke at session start when user asks to implement/build/add something and no feature spec exists yet."
---

# Feature Planner

## Purpose

Transform a user's natural-language implementation request into a fully-structured harness feature plus an initial dynamic task plan. This skill is **specification-only**:

- Every plan draft this skill produces is persisted as a file under agent/docs/plans/ — never presented only as inline chat text.
- The new feature is created with `status: not_started`.
- A human must explicitly approve the plan before any status transition to `in_progress`.
- **This skill touches ONLY files inside `/agent`** (docs + state). It does NOT install dependencies, run the app, or touch `/src`. The "Startup → Implementation → Handoff" loop lives in the `implementor` skill at [implementor/SKILL.md](./.trae/skills/implementor/SKILL.md), not in AGENTS.md and not in this planning skill. After planning is complete and the human approves, the implementing agent (via the `implementor` skill) will pick up the approved feature and execute that workflow.


## Trigger Conditions

Invoke this skill when **all** of the following are true:

1. The session is starting (or no active feature is being implemented).
2. The user asks to implement / build / add / create something in natural language.
3. No existing feature in `agent/state/feature_list.json` matches the request exactly.
4. No `agent/docs/features/feature-XXX.md` document already describes this work.

Do NOT invoke this skill if:

- A feature already covers the request (re-open/re-prioritize the existing one instead).
- The user explicitly wants direct coding without any specification step (then jump straight to implementation — but warn once).
- The request is a bugfix inside an already-passing feature (use the session log + existing feature doc, not a new feature).

## Pre-flight: Required Context Gathering

Before writing any file, read ALL of the following artifacts **in this order** to minimize drift. Do not skip any of them. If any is empty or missing, explicitly record that gap in the generated feature doc under **Task Rationale**.

1. `AGENTS.md` — shared rules only: routing map, artifact semantics, required structure, global anti-drifting guards. Ignore the skill routing table for your role; you are the planner.
2. `agent/docs/architecture.md` — layers, services, data flow, storage. If empty, mark "stack unknown" and add a task #1 to confirm it.
3. `agent/docs/product.md` — feature areas, constraints, UI hints. Use this to infer the `area` field. If empty, `area = "unknown"`.
4. `agent/docs/reliability.md` — golden journeys, restart rules. The verification steps you propose must align with (or explicitly reference) these.
5. `agent/state/feature_list.json` — existing IDs + priorities + the `single_active_feature` rule. Source for the next numeric ID.
6. `agent/state/session-handoff.md` — whether the prior session left a known broken state that the new feature must not worsen.
7. `agent/state/progress.md` — last verified state; avoid regressing the listed passing features.
8. `agent/docs/plans/` — check for an existing plan-feature-XXX.md matching an unresolved request from a prior session (e.g. one still awaiting clarification answers or human APPROVE). If found, resume/update that file instead of starting a fresh one.

If `architecture.md` + `product.md` are both empty or near-empty, add a **mandatory task #1** to confirm the tech stack / context before any coding. Never assume a stack.

## Working Rules

Before Execution Workflow, strictly follow these rules:

- Read AGENTS.md for shared rules, artifact semantics, routing map, and required structure only. AGENTS.md no longer contains implementation workflows.
- This skill touches ONLY files inside `/agent` (docs + state). It does NOT install dependencies, run the app, or touch `/src`. The implementation workflow lives in the `implementor` skill, not in this one.
- Do not modify any files outside `/agent`.
- If user's request is ambiguous or unclear, ask for clarification before proceeding using the Clarification Protocol section.
- This includes `agent/docs/plans/` as a valid write target — it is not implementation code, it is planning documentation.

## Clarification Protocol (mandatory when ambiguity is detected)

If, at any point during Pre-flight or Steps 1-3, a required input is missing,
contradictory, or admits more than one reasonable interpretation, STOP at that
point. Do not proceed to write `feature_list.json` or `feature-XXX.md` on an
assumption.

Every clarification must be raised as a structured question:
- A short, explicit `question` string.
- Predefined, mutually exclusive `options` when the answer space is enumerable.
- An `Other (specify)` free-text option, always present.

Rules:
- One open item per structured question. If multiple things are unclear,
  ask them as multiple structured questions in the same turn — never folded
  into a single free-text paragraph.
- Never combine a clarifying question with a "here's what I already drafted"
  recap. If a one-sentence recap is useful, keep it to one sentence, then end
  the turn with the structured question(s) — the turn must not read as a
  finished plan.
- Do not proceed to Step 4 (plan presentation) while any clarification raised
  under this protocol remains unanswered. "Open Questions Before
  Implementation" in the feature doc is reserved for genuine unknowns that
  don't block planning (e.g. "confirm in task 1") — not for ambiguity that
  should have stopped the SOP earlier.
- If the ambiguity surfaces late (e.g. mid-Step 3, while drafting tasks),
  treat it exactly the same way: stop, ask, don't keep drafting around it.


## Execution Workflow (SOP — 6 steps)

Run these steps in order. Do not commit changes. At the end, present the plan to the human for approval.

### Step 1 — Assign the next feature ID

Parse `agent/state/feature_list.json` to find every feature ID matching pattern `feature-NNN`. Extract the numeric part. Compute `max_numeric + 1`. Pad with leading zeros to 3 digits. The new ID is `feature-XXX`.

- Never assume the last array index is the max numeric ID (features might be reordered by priority). Always compute numeric max.
- If `feature_list.json` has zero features, start at `feature-001`.

### Step 2 — Append an entry to `agent/state/feature_list.json`

Add a new object to the `features` array. Fields:

| Field | Value rule |
|---|---|
| `id` | `feature-XXX` from Step 1. |
| `priority` | If `single_active_feature == true` and any feature has status `in_progress` → `priority = (max existing priority) + 1`. Otherwise `1`. |
| `area` | Infer from `product.md` (Core Features sections). If ambiguous → `"unknown"`. |
| `title` | 5-10 words, title-case, no trailing dot. |
| `user_visible_behavior` | One sentence starting with `"A user can ..."` — describes only what the end user experiences, no internals. |
| `status` | **Hard-wire to `"not_started"`**. Never `"in_progress"` here; that requires human approval. |
| `verification` | 3–5 human-executable steps, phrased as imperative commands, ending with a `"Verify ..."` assertion. Align with `reliability.md` golden journeys if any exist. These are the Definition-of-Done checks, NOT the implementation tasks. |
| `session_ids` | Array with the current session ID (`yyyy-MM-dd-hhmmss`). |

Also update the top-level `last_updated` field to today's date (`YYYY-MM-DD`).

**NON-NEGOTIABLE:** Do NOT add a `tasks` key, `task_plan` key, or any other task-related key to this JSON entry. The task plan lives exclusively in `agent/docs/features/feature-XXX.md`.

### Step 3 — Create `agent/docs/features/feature-XXX.md`

Use the **structure from the existing template** exactly. Write the five required sections first:

```markdown
# feature-XXX: [Title]

## Objective

[1-2 sentences. What this feature enables. Not how.]

## Expected Behavior

[Bulleted list. User-visible behavior + any internal side effects the caller must rely on (e.g., event emitted, record persisted). Avoid stack assumptions.]

## Out of Scope

[Bulleted list. What the feature explicitly does NOT cover. Important to prevent scope drift during implementation.]

## Acceptance Criteria

[Numbered list. Each line is a testable statement, e.g. "1. Clicking Save stores the document and returns a success toast." These feed directly into the `verification[]` steps in feature_list.json.]

## Minimum Expected Evidence

[What proof is required to mark this feature passing: e.g., screenshots, test pass output, command output. Be specific and short.]
```

**Immediately after `## Minimum Expected Evidence`** (preserving the five original sections intact and in order), append the following new sections. Do NOT place them before or between the required sections.

```markdown
## Implementation Tasks (Dynamic)

| # | Task | Status | Depends On | Estimated Files | Notes |
|---|------|--------|------------|-----------------|-------|
| 1 | [Imperative verb phrase] | pending | - | [file paths or module names, or "TBD" if unknown] | [optional] |
| 2 | [Imperative verb phrase] | pending | 1 | [file paths or module names, or "TBD" if unknown] | [optional] |
| ... | ... | ... | ... | ... | ... |

### Task Rationale

- Why the tasks above were chosen this way (e.g., "The task split follows the architecture.md layers: services first, then renderer.").
- Architectural assumptions that, if wrong, would invalidate the split (e.g., "Assumes the auth module already exists under services/auth; if not, Task 1 will add it and 1-2 tasks will be appended.").
- Gaps detected in the pre-flight docs (architecture.md empty, product.md empty, etc.). If any were empty, explicitly state here that a post-approval refinement pass is expected.

### Complexity Flags (auto-assigned)

- [ ] Low — scope is closed. Initial task list (1–4 tasks) is likely complete. Unlikely to grow.
- [x] Medium — initial task list (5–8 tasks) is likely close. Expect 1–2 extra subtasks uncovered during implementation.
- [ ] High — initial list is tentative. Task #1 is "Explore and refine the task plan", and 3+ additional tasks are expected after it.

Rules for auto-assigning complexity:

- Low = ≤4 tasks AND architecture.md + product.md are both non-empty AND the request maps cleanly onto existing product areas.
- High = request crosses 2+ unrelated areas OR either architecture/product is empty OR request implies new unknown third-party integration.
- Everything else = Medium.

### Open Questions Before Implementation

- [ ] [One open question per line. Only real unknowns; no placeholder lines.]
```

Task rules:

- Minimum 2 tasks. Maximum 8 initial tasks. If you'd want more than 8 → force **High** complexity, cap at 8, and make Task #1 "Explore X and refine this task plan" with Notes = "This task will append tasks after exploration."
- `Status` on every row = `pending` initially.
- `Depends On`: `-` if independent, otherwise a comma-separated list of task numbers (e.g. `1, 3`).
- `Estimated Files`: list concrete file paths when knowable from architecture.md. Else `"TBD (confirmed in task 1)"`.
- Keep tasks implementation-sized: each should be doable in a focused sub-session (not 10-line trivialities, and not "build everything").

### Step 4 — Write the plan draft to `agent/docs/plans/plan-feature-XXX.md`
Before presenting anything in chat, write the full approval content (everything currently listed as items 1-6 of the old Step 4: header, title/area/user_visible_behavior, Implementation Tasks table, Complexity Flags + reasoning, Open Questions, Out of Scope) into `agent/docs/plans/plan-feature-XXX.md`.
- File naming: `plan-feature-XXX.md`, matching the feature ID from Step 1. One file per feature-in-flight.
- If the plan is revised before approval (e.g. after the Clarification Protocol resolves an open question), **overwrite this same file** — do not create versioned copies (`plan-feature-XXX-v2.md` etc.).
- This file is a draft artifact, distinct from `agent/docs/features/feature-XXX.md` (Step 3): the plans file is the human-facing approval surface; the feature doc is the canonical execution spec `implementor` will read. Keep both in sync in content, but never merge them into one file.

### Step 5 — Present a pointer to the human and stop
Do **not** paste the full plan content inline in chat again — it already lives in the file from Step 4. The chat message must only contain:
1. Header: `Feature Plan Draft for ${id} — see agent/docs/plans/plan-feature-XXX.md — requires human approval before implementation.`
2. A 2-3 line summary (title, area, complexity flag).
3. Whether there are open questions blocking approval (yes/no — details are in the file, don't repeat them here).


## Dynamic Task Update Rules (for the implementing agent, embedded here so they live with the plan)

When editing the task table during implementation, follow these rules to keep auditability:

- **To add a task:** Insert a new row with the next integer ID, or if slotting between existing IDs, use decimals (e.g. `3.1`, `3.2`) and set `Depends On` appropriately.
- **To remove a task:** Do NOT delete the row. Set `Status = cancelled` and fill `Notes` with the reason (e.g., "Obsolete after task 2 changed architecture").
- **To split a task:** Set the original row's `Status = split`, add `Notes = "Split into X.Y sub-tasks"`, then add sub-tasks with IDs `[original].1`, `[original].2`, ... and set their `Depends On = [original's prereqs]`.
- **Complete a task:** Set `Status = done` and fill `Notes` with a short evidence pointer (commit hash, file updated, test output reference).
- After every structural edit, add a one-line timestamped entry under **Task Rationale** summarizing the change. E.g. `[2026-08-14 16:20] Added task 2.1 after discovery that auth service doesn't exist.`.

When the feature reaches `passing` status, freeze the table: do not edit it further (no rows added / removed). Future work on the same area becomes a new feature.

## Anti-drifting Guards

These are constraints you must self-enforce while running this skill. If a guard cannot be satisfied, surface the problem explicitly in the generated plan rather than silently guessing.

1. **No stack invention.** If architecture.md is empty or lacks the needed layer, write `TBD / confirmed in task 1` everywhere instead of inventing a framework name, DB schema, or endpoint URL.
2. **No product invention.** If product.md has no matching area, set `area = "unknown"` and add an Open Question asking the human to confirm the product area. Do not invent product areas.
4. **Single active feature respected.** If `single_active_feature == true` and another feature is already `in_progress`, assign a lower priority and state this explicitly in Step 6's summary. Do not try to "promote" the new one above it.
5. **Templates remain untouched.** You read `agent/templates/*` for structure only. This skill never writes into the `agent/templates/` directory.
6. **Task plan location is non-negotiable.** Tasks live in `agent/docs/features/feature-XXX.md`. Anywhere else is wrong. Correct yourself before writing if you catch yourself about to add tasks to feature_list.json.
7. **Status never auto-promotes.** Only the human's APPROVE triggers the implementing agent to flip status. If the human says nothing, the feature remains `not_started` and the repo state is fully valid.
8. No buried assumptions. Never state an assumption inside a summary or inside the generated feature doc as a substitute for asking. If you catch yourself writing "asumí X, corrígeme si no" anywhere in the output, that is the signal to stop and use the Clarification Protocol instead.
9. Plans are files, not chat output. Never present the full approval prompt only as inline message text — it must exist first as agent/docs/plans/plan-feature-XXX.md. If you catch yourself drafting the full table/reasoning directly into a chat response instead of the file, stop and write the file first.
10. No plan file deletion. Once plan-feature-XXX.md is written, never delete it, even after approval or after the feature reaches passing. It stays as the historical record of what was proposed and approved.