---
name: "bootstraper"
description: "Bootstraps a brand new project (web/fullstack/frontend-only/backend-only) inside ./src via OFFICIAL framework CLIs — never writes boilerplate by hand. Executes all CLI commands through the mcp-cli-navigator MCP (PTY-based, turn-based) since most scaffolding CLIs present interactive menus. Also seeds architecture.md, product.md, reliability.md, wires the initial test command into e2e-check.sh, and replaces the feature-001 template placeholder with the bootstrap work itself, documented and handed off exactly like the implementor skill would. Triggers when user message begins with or contains the 'bootstrap' keyword."
---

# Bootstraper Skill

## Purpose

This skill is the **project bootstrapper**. Its responsibility is to lift the initial scaffolding (andamiaje inicial) of a **brand new project** inside `./src`, AND to leave the harness's documentation and state artifacts in a condition indistinguishable from a normal completed feature — so that `feature-planner` never has to guess whether a project already has a real stack, and `implementor` can pick up from a clean, truthful `progress.md`.

Guiding principle: **DO NOT REINVENT BOILERPLATE.**

- Never write by hand the base files of a framework (package.json, bundler config, tsconfig, folder structure, etc.).
- Always execute the **official scaffolding command** documented by the chosen framework or tool, and let that tool generate the files.
- This saves output tokens (no need to regenerate known versioned boilerplate), guarantees the setup matches the framework's current version and conventions, and reduces manual configuration errors.
- Writing or editing files by hand is ONLY allowed for:
  - **(a)** Relocating the scaffolded output to the required location (`./src`).
  - **(b)** Applying questionnaire answers that the official command does not cover (e.g., add a security linter, CI, hardening).
  - **(c)** Integrating pieces that have no official command of their own.
  - **(d)** Writing/updating the harness documentation and state artifacts described in this file (`architecture.md`, `product.md`, `reliability.md`, `security.md`, `e2e-check.sh`, `feature_list.json`, `feature-001.md`, `progress.md`, `session-handoff.md`, session logs). These are documentation/state, not application boilerplate, so the "never hand-write" rule does not apply to them.

This skill **NEVER** implements business features in the same pass. That is the `implementor` skill's job at [implementor/SKILL.md](.trae/skills/implementor/SKILL.md).
This skill **NEVER** plans or specs *new* features beyond the bootstrap task itself. That is the `feature-planner` skill's job at [feature-planner/SKILL.md](.trae/skills/feature-planner/SKILL.md).
This skill **writes and updates** `agent/docs/architecture.md`, `agent/docs/product.md`, `agent/docs/reliability.md`, and `agent/docs/security.md` as the single source of truth for the initial stack, product domain, restart/health story, and applied security controls.

## Path Semantics (non-negotiable)

`./src` is a **project-relative path**, meaning:

- `./src` MUST always resolve to `<repoRoot>/src` (example: `/Users/leandro/Documents/projects/designa/src`)
- `./src` MUST NEVER be interpreted as an absolute path like `/src`
- Temporary scaffolding directories MUST live inside the repo (example: `<repoRoot>/.tmp-bootstrap`), never in `/tmp`

**repoRoot resolution rule (mandatory):**

- Before any path-sensitive step, resolve the repository root using an allowlisted CLI command via `mcp-cli-navigator`:
  - Preferred: `git rev-parse --show-toplevel`
  - Fallback: `node -e "console.log(process.cwd())"` (only if git is unavailable)
- From that point on, treat every path in this skill (`./src`, `./.tmp-bootstrap`, etc.) as **relative to repoRoot**, and when calling `start_cli_session`, pass `cwd` as an **absolute path** derived from repoRoot.

## MCP Requirement — mcp-cli-navigator (mandatory for ALL CLI execution)

**Every** command this skill runs against a terminal — scaffold commands, plugin/testing installs, validation boots, `init.sh` runs, everything in Steps A/C/H — MUST go through the `mcp-cli-navigator` MCP tools, never through a raw shell/bash tool.

Reasoning: the large majority of official scaffold commands (`npm create vite@latest`, `ng new`, `npx create-next-app`, `sam init`, `create-t3-app`, etc.) present interactive prompts (project name, TS vs JS, ESLint, router, etc.). Rather than spending effort classifying "this command is interactive / this one isn't" case by case, this skill treats **all** CLI execution as potentially interactive and always drives it through the PTY-based navigator. A non-interactive command just means the session ends after `start_cli_session` with no `send_key` calls needed — there's no cost to defaulting to the navigator.

Available tools and how to use them in this skill:

- **`start_cli_session({ command, args, cwd })`** — Launches the command. `command` must be one of the officially allowlisted binaries (npm, npx, yarn, pnpm, bun, uv, pip, poetry, cargo, go, git, ng, django-admin, python, composer, symfony, rails, sam, cdk, spring, etc.). `cwd` MUST be an **absolute path**, and MUST be inside the current repository (repoRoot) unless the user explicitly asked otherwise. Returns `{ sessionId, output, exited, exitCode }` — `output` is the terminal screen once it settles.
- **`send_key({ sessionId, keys })`** — Sends one interaction: a named key (`up`, `down`, `enter`, `space`, `tab`, `escape`, `ctrl-c`, `backspace`), a combo (`down+down+enter`), or literal text (e.g. typing a project name), followed by a separate `enter` call. Returns the new `output` since the last read.
- **`read_output({ sessionId, maxWaitMs })`** — Reads more output without sending a key. Use this when a step is expected to take a while (dependency install, git clone) and you need to keep polling until it settles or exits.
- **`close_session({ sessionId })`** — Kills the process and frees the session. Always call this after a session reaches `exited: true`, or if the bootstrap is aborted mid-way.

**Operating loop for every CLI step:**

1. Call `start_cli_session`. Read the returned `output` like a screenshot of the terminal.
2. If `exited: true` already → the command was non-interactive (or failed); read `exitCode` and move on / handle the error. No `send_key` needed.
3. If not exited → the `output` is a prompt. Decide the next key/keys from what's literally on screen (do not assume a fixed script of steps in advance — read, then act, one step at a time).
4. Call `send_key` with that decision. Repeat from step 2 with the new `output`.
5. If a step is clearly a long-running task (installing deps, cloning) rather than a prompt, use `read_output` (optionally with a larger `maxWaitMs`) instead of guessing a key to send.
6. Once `exited: true`, call `close_session` and record the final `exitCode` for the report.

**Hard rules for MCP usage:**

- Never fall back to a raw shell/bash execution tool for anything covered by the Reference Table of official scaffold commands, or for Step C / Step H — the navigator is the only execution path for this skill.
- Never pre-script an entire multi-step interaction sequence and fire it blind. Read the actual `output` after every `start_cli_session`/`send_key` call before deciding the next key — menus vary by CLI version and by earlier answers.
- If `command` would fall outside the navigator's allowlist, treat that as a Block 1/Block 4 answer that needs the "Other (specify)" path — do not attempt to work around the allowlist.
- If a session produces no new output and doesn't exit within the navigator's own timeout, call `read_output` once more; if still stuck, `close_session`, report the stall with the last known screen content, and ask the user how to proceed rather than retrying blindly.
- If `mcp-cli-navigator` is not connected/available at all, do not fall back to a raw shell tool. Stop, tell the user the connector is required, and do not open any session.

## Trigger Conditions

Invoke this skill when **ALL** of the following are true:

1. The user message contains the explicit keyword **`bootstrap`** (at the start or anywhere inside the message).
2. There is no working project already under `./src`, OR the user explicitly asks to reset it AND confirms overwrite.
3. The user is **NOT** asking to implement a feature (that goes to the `implementor` skill) nor to plan/spec one (that goes to the `feature-planner` skill).
4. No feature is currently `status: in_progress` in `agent/state/feature_list.json` (avoid mixing roles inside one session).

Do **NOT** invoke this skill if:

- The user asks to add or change anything on an **already existing, working** project.
- The user asks to plan, spec, or implement a **business feature**.
- The user does **not** use the keyword `bootstrap` (prevents accidental invocation on a repo that already has real code).

## Pre-flight: Anti-Overwrite Guard

Run this as the very first thing. Do not skip it.

1. Resolve `repoRoot` (see Path Semantics), then compute the absolute path `srcDir = <repoRoot>/src`.
2. List the contents of `srcDir` (only if the directory exists). If it does not exist, treat it as empty and continue.
3. If `./src` contains **any files or folders other than** `.gitkeep` or a placeholder `README.md` → **STOP.** Ask the user for explicit confirmation to overwrite, using the same structured question format defined below (yes/no as predefined options):
   ```
   Question: "./src ya contiene archivos. ¿Quieres SOBREESCRIBIR el contenido actual de ./src?"
   Options: ["Sí, sobreescribir", "No, cancelar"]
   Other (specify): free-text field always available
   ```
   Without an explicit "Sí, sobreescribir", do **not** open any `mcp-cli-navigator` session.
4. Basic runtime availability (Node, Python, etc.) can be verified now via `start_cli_session` (e.g. `node --version`) — these are non-interactive and will simply return `exited: true` immediately — or deferred until after the questionnaire narrows the target stack.

## Questionnaire Format Rule — applies to EVERY question this skill ever asks (mandatory, no exceptions)

This is the single most important structural rule in this skill, and it overrides any temptation to "just summarize and ask in prose" once the technical blocks feel done.

- **Every** question this skill asks the user — with zero exceptions — MUST be presented using the same structured question format:
  - A short, explicit `question` string.
  - A set of predefined, mutually exclusive `options` when the answer space is enumerable (even loosely — e.g. "Interno / Público / Ambos").
  - An `Other (specify)` option that opens a free-text field, for anything that doesn't fit the predefined options or that is inherently descriptive (e.g. a one-line project description).
- This applies identically to:
  - Blocks 1–6 (project type, framework, language, package manager, deployment, security, testing) — as already defined below.
  - **Block 0** (project purpose & domain) — every one of its four questions must use this same format (see Block 0 below for the concrete options).
  - **Any ad-hoc or clarifying question** that comes up mid-flow and is NOT explicitly covered by Blocks 0–6 (e.g. confirming folder layout for a combined fullstack setup, disambiguating a framework variant, resolving a conflict between two earlier answers). These are treated as an **implicit Block 0.x / Block 1.x** extension and must still be asked one at a time in this same structured format — never folded into a narrative paragraph.
- **Never** ask a question by embedding it inside a prose "status update" or "summary" message that reads like a final answer to the user (e.g. a paragraph that restates prior decisions and then tacks on new open questions at the end). If the skill still needs information, that turn must end in one or more structured `Question` blocks — not in a paragraph the user has to parse for buried asks.
- **One open item per structured question.** If multiple things are still unknown, ask them as multiple structured questions in the same turn (as Blocks 1–6 already do), not as a bulleted list inside a longer message.
- Only once **all** structured questions (Blocks 0–6 plus any ad-hoc ones) have been answered does the skill move to the Post-Questionnaire summary — and that summary is a **recap of decisions already made**, not a place to sneak in new questions.

## Structured Questionnaire (SOP — 7 blocks, never assume)

Ask the user **block by block**, in this order, using the Questionnaire Format Rule above for every single question. Every block must include an `Other (specify)` option as a valid answer. If the user has no preference on a framework, recommend 1-2 coherent options aligned with the rest of the answers, and always keep `Other (specify)` on the table.

### Block 0 — Project Purpose & Domain (feeds `product.md`, `architecture.md`, `reliability.md`)

This block did not exist in earlier versions of this skill. It exists because `feature-planner` infers a feature's `area` from `product.md`, and cannot do that safely against an empty file — so bootstraper must seed it. Like every other block, each of these four items is asked as its own structured question — never merged into a single free-text paragraph.

**1. One-line description:**
```
Question: "¿Qué es este proyecto, en una frase?"
Options: []  (inherently descriptive — no meaningful predefined options)
Other (specify): free-text field, always shown as the primary input for this question
```

**2. Target users:**
```
Question: "¿Quién usa este proyecto?"
Options: ["Uso interno", "Producto público", "Ambos (interno y público)"]
Other (specify): free text
```

**3. Core feature areas (2–4):**
```
Question: "¿Cuáles son las 2–4 áreas core iniciales del producto? (ej. auth, billing, dashboard)"
Options: ["TBD — confirmar en la primera sesión de feature-planner"]
Other (specify): free text (comma-separated list of areas)
```
If the user selects "TBD", record `"TBD — confirm during first feature-planner session"` instead of inventing areas.

**4. Golden journey(s), if any:**
```
Question: "¿Cuál es el/los 'golden journey(s)' — lo mínimo que siempre debe funcionar para considerar el producto 'up'? (ej. 'un usuario puede loguearse y ver su dashboard')"
Options: ["TBD — no hay golden journey definido aún"]
Other (specify): free text
```
If the user selects "TBD", record `"TBD — no golden journey defined yet"`.

### Block 1 — Project Type + Framework

**1. Project type?**

```
Question: "¿Qué tipo de proyecto es?"
Options: ["Fullstack (frontend + backend)", "Solo frontend", "Solo backend"]
Other (specify): free text
```

**2. Specific framework desired?** (grouped by project type; offer recommendations if user has no preference)

```
Question: "¿Qué framework específico quieres?"
Options (Frontend candidates): ["React + Vite", "Next.js", "Angular", "Vue (+ Nuxt)", "SvelteKit", "Solid", "Qwik"]
Options (Backend candidates): ["Node — Express", "Node — Fastify", "Node — NestJS", "Node — Koa", "Python — FastAPI", "Python — Django", "Python — Starlette", "PHP — Laravel", "PHP — Symfony", "Go — Gin", "Go — Fiber", "Go — Echo", "Rust — Axum", "Rust — Actix", "Ruby — Rails", "Java — Spring Boot"]
Options (Fullstack candidates): ["Next.js", "Nuxt", "SvelteKit", "Remix", "Redwood", "T3 (create-t3-app)", "Laravel + Blade/Vue", "Django + HTMX"]
Other (specify): free text
```

**3. Fullstack folder layout (ONLY asked when Project Type = Fullstack and the chosen setup is a combination of two independent frameworks rather than a single integrated fullstack framework — e.g. "Vite+React" + "Express", not "Next.js"):**

```
Question: "¿Quieres separar el proyecto en ./src/frontend y ./src/backend, o prefieres otra estructura?"
Options: ["Sí — ./src/frontend y ./src/backend separados", "No — estructura combinada en la raíz de ./src"]
Other (specify): free text
```
This question must be asked as its own structured question in this same turn as Block 1, never deferred to a later "clarifying" paragraph — it is a foreseeable branch of Block 1, not an ad-hoc surprise.

### Block 2 — Language (when not dictated by the framework)

Ask only if the framework leaves room for choice:

```
Question: "¿Qué lenguaje quieres usar?"
Options: ["TypeScript", "JavaScript", "Python 3.x", "Go", "Rust", "PHP", "Java"]
Other (specify): free text
```
Note: if the framework dictates the language (e.g., Django = Python, Rails = Ruby, Angular = TS), state the assumption out loud and confirm the variant if any (e.g., TS vs JS for Next.js) — that confirmation is itself a structured question (options: the possible variants), not a stated assumption left unconfirmed.

### Block 3 — Package Manager (when applicable)

```
Question: "¿Qué gestor de paquetes prefieres?"
Options (Node): ["npm", "pnpm", "yarn", "bun", "Default del framework"]
Options (Python): ["uv", "pip", "poetry", "Default del framework"]
Options (Other runtime): ["Gestor por defecto del runtime", "Default del framework"]
Other (specify): free text
```

### Block 4 — Architecture / Deployment Target

```
Question: "¿Qué arquitectura de despliegue debe asumirse por defecto (plantillas CI, hardening)?"
Options: ["Solo local (sin pipeline, sin cloud)", "DevOps propio (infraestructura ya existente)", "Bitbucket + Pipelines", "GitHub + Actions/Pipelines", "GitLab + CI/CD", "AWS SAM / AWS CDK", "Cloudflare (Pages/Workers)", "Vercel", "Netlify", "Render", "Fly.io", "Google Cloud Run / Firebase", "Azure Static Web Apps / Functions"]
Other (specify): free text
```

### Block 5 — Security (results feed `agent/docs/security.md`)

Ask the desired **minimum level / accepted bar**. `"None for now / urgency first"` is a valid answer. List each item explicitly as its own structured question so the user can accept / skip each individually:

```
Question: "¿Qué controles de seguridad mínimos quieres aplicar en el bootstrap?"
Options: [
  "Variables de entorno vía .env + .env.example + .gitignore adecuado",
  "Secrets fuera del repositorio (nunca commiteados)",
  "Dependency bot (Dependabot / Renovate)",
  "Security linting / auditing (npm audit, eslint-plugin-security, bandit, cargo-audit, etc.)",
  "Baseline de CORS / security-headers",
  "Hardening específico del target de despliegue",
  "Ninguno por ahora / prioridad a la urgencia"
]
Other (specify): free text
```
This can be presented as a multi-select structured question (each item accept/skip) rather than a single-select, but it must still render as predefined checkable options plus "Other (specify)" — never as free prose.

### Block 6 — Testing (results feed `agent/verification/e2e-check.sh`, see Step H)

**Preferred test framework:**
```
Question: "¿Qué framework de testing prefieres?"
Options: ["Default del framework elegido (ej. Vitest/Jest, pytest, etc.)"]
Other (specify): free text
```

**Scope desired:**
```
Question: "¿Qué alcance de testing quieres?"
Options: ["Solo unit", "Unit + Integration", "Unit + Integration + E2E (Playwright/Cypress/etc.)", "Ninguno por ahora / prioridad a la urgencia"]
Other (specify): free text
```

Step H0 / Step H are mandatory later in this workflow. If Testing scope is `"None for now"`, `e2e-check.sh` is still wired, but to a build/compile-style verification rather than a test runner.

## Any Additional or Clarifying Question — same mandatory format (no exceptions, no "final answer" shortcuts)

Sometimes, after Blocks 0–6, the skill discovers it still needs one more piece of information that wasn't foreseeable as its own numbered item above (e.g. disambiguating a CLI flag, resolving a naming conflict, confirming an edge case in the chosen stack). When this happens:

- Treat it exactly like any other block item: emit a structured `Question` with predefined `options` (best-guess reasonable choices) plus `Other (specify)`.
- Do this in its own turn/message, ending the turn there — the same way Blocks 1–6 end a turn with structured questions rather than continuing into a narrative.
- Do **not** combine it with a "here's what I already know" recap paragraph followed by the new question as trailing prose. If a recap is useful, keep it to at most one short sentence, then immediately present the structured question(s) — the recap is not a substitute for the structured format, and the message must not read as a finished/final response.
- Do **not** proceed to the Post-Questionnaire summary while any structured question — from Blocks 0–6 or ad-hoc — remains unanswered.

## Post-Questionnaire — Summary + Human Approval

Before opening **any** `mcp-cli-navigator` session, present the human with a concise approval summary. Do not proceed on your own. This summary is only reached once every structured question (Blocks 0–6 and any ad-hoc ones) has been answered — it is a recap of decisions made, never the place where a new question is first raised.

```
Bootstrap Plan Draft
====================
Project Summary:     [Block 0 one-line description]
Core Areas:          [Block 0 answer 3]
Golden Journey(s):   [Block 0 answer 4]

Project Type:       [answer]
Framework & Lang:   [answer]
Folder Layout:      [Block 1.3 answer, if applicable]
Package Manager:    [answer]
Deployment Target:  [answer]

Security Controls to be applied:
  - [x] Control accepted by user
  - [ ] Control skipped per user

Testing setup:
  Framework: [answer]
  Scope:     [answer]
  e2e-check.sh will be wired to: [command — tests if configured, otherwise build/compile]

Output location: ./src
Official scaffold command to be run (via mcp-cli-navigator):
  [exact command + args you will pass to start_cli_session]

Manual adjustments after CLI (if any):
  1. [Adjustment] — Reason: [a / b / c / d classification + why]
  2. ...

Documentation to be written/updated:
  - agent/docs/architecture.md
  - agent/docs/product.md
  - agent/docs/reliability.md
  - agent/docs/security.md
  - agent/state/feature_list.json (feature-001 will be REPLACED, not appended)
  - agent/docs/features/feature-001.md (REPLACED)

====================================
Human APPROVAL REQUIRED before any CLI execution. Reply APPROVE to proceed.
```

## Execution Workflow (after explicit APPROVE)

Run in order. Do not skip validation steps. **All** CLI execution in this workflow goes through `mcp-cli-navigator` per the operating loop described above — never a raw shell tool. Steps F, G, and the End of Bootstrap Session are documentation/state-only and do not need the navigator.

### Step A — Run the official scaffolding command via mcp-cli-navigator

Prefer **always the latest official command + flags** of the chosen framework. If there is version ambiguity, validate against the framework's official documentation URL before running.

- Always set `cwd` to an **absolute** path derived from `repoRoot`.
- Prefer running scaffolding commands from `cwd = repoRoot` and specifying output folders under `./src` in the command args (example: `... my-app` where `my-app` is `src/<something>`), so the destination is explicit.
- If the CLI natively supports a **destination directory flag**, use it and point it at `srcDir` (or a subfolder of it), still keeping `cwd` inside `repoRoot`.
- If the CLI does **NOT** support a destination flag → use a temporary directory inside the repo (example: `<repoRoot>/.tmp-bootstrap`), drive the scaffold there via the operating loop, then **move the produced content** to `srcDir` (a file-move, not a CLI-navigator step), and delete the temporary folder afterwards.
- Drive every prompt through `send_key`, reading the real `output` at each step (project name, TS/JS, linter, router, package manager confirmation, etc.) rather than assuming the sequence in advance. Close the session once `exited: true` and record the `exitCode`.

### Step B — Manual adjustments allowed (and ONLY these)

Writing files by hand is restricted to the following cases. Everything else must come from the official CLI, driven through `mcp-cli-navigator`.

1. **Case (a) — Relocation to `./src`:** Path fixing, moving nested sub-folders if the CLI produced incorrect nesting inside `./src`. (Plain file operations — not a navigator session.)
2. **Case (b) — Questionnaire answers not covered by the official command:**
   - Add CI configuration (e.g., a GitHub Actions workflow file under `.github/workflows/`), **always using official starter templates** from GitHub starter-workflows or the equivalent official source for the CI provider.
   - Add Dependabot / Renovate configuration files from **official templates**.
   - Add security linter packages / audit scripts into `package.json` / `requirements-dev.txt` / project dev dependencies, using the **standard official plugin / package names** — install them via `mcp-cli-navigator` (e.g. `npm install -D <plugin>` through `start_cli_session`), not by hand-editing lockfiles.
   - Create `.env.example` + add `.env` to `.gitignore` if the CLI did not do it already.
   - CORS / security headers baseline hardening via the **standard official plugin or package** for the framework, installed through `mcp-cli-navigator`.
3. **Case (c) — Integrations with no official scaffold command:** e.g., adding a pre-commit hook config when no `init` command exists for it.
4. **Case (d) — Harness documentation/state:** everything in Steps F, G, and End of Bootstrap Session below.

### Step C — Apply the selected Testing setup via mcp-cli-navigator

If it goes beyond the framework default, use the framework's official add-plugin / install commands through `start_cli_session` + the operating loop (do not hand-write test configs unless no official command exists). Installers for test frameworks can also prompt interactively (e.g. choosing a runner or config style) — treat them the same as Step A: read the screen, respond via `send_key`.

Record the exact "run all tests" command this produces (e.g. `npm test`, `pytest`, `cargo test`) — Step H0.2 needs it verbatim when Testing scope ≠ `"None for now"`.

### Step D — Write / Update Central Documentation

This step is **mandatory** (not conditional like before), because leaving `architecture.md` and `product.md` empty after a bootstrap is exactly what causes `feature-planner` to treat a freshly-scaffolded project as "stack unknown" / `area: unknown` later. Fill within the existing templates — do not add or delete sections (same anti-drift rule as `feature-planner` and `implementor`).

- **`architecture.md`**: layers/services/data flow/storage, derived from the chosen framework + Block 1/2/3/4 answers. Record `./src` as the project root and the exact scaffold command executed in Step A (for traceability).
- **`product.md`**: the one-line description, target users, and Core Features sections from Block 0. These are the `area` values `feature-planner` will infer against on every future request — if Block 0 answers were `"TBD"`, say so explicitly here instead of inventing areas.
- **`reliability.md`**: the golden journey(s) from Block 0, plus the command that proves the app boots (from Step A/E). If Step H0 wires `e2e-check.sh`, reference it here as the canonical restart/health check going forward.
- **`security.md`**: for every control in **Block 5** → flip the row in the Controls Matrix to `Status = complete` / `pending` / `n/a`, fill `Notes / Reference` with a concrete path or rationale, fill `Deployment & Runtime Hardening` with the Block 4 target, and fill `Secret Management` / `Dependency Hygiene` accordingly.

(This step is documentation only — no `mcp-cli-navigator` session needed.)

### Step E — Minimal scaffold validation via mcp-cli-navigator

Compile or run the **empty project once** to confirm the scaffold actually boots, using `start_cli_session` (and `read_output` while it warms up):

- Node/TS frontend / fullstack: `npm run build` (session should reach `exited: true` on its own) or `npm run dev` (poll with `read_output` until you see a successful boot line in the output, then `close_session` to kill it — dev servers don't exit on their own).
- Python FastAPI: `uvicorn app.main:app --port 0 --log-level info` — poll with `read_output` until a clean startup line appears, then `close_session`.
- Any other framework: the equivalent short compile-or-boot command for an empty baseline, driven the same way.
- If this fails → attempt **one minimal fix** of PATHs / misplacement from Step A, then proceed to Step H0 / Step H. Do not treat a one-off boot command as sufficient verification.

### Step H0 — Align verification scripts with the scaffold (mandatory)

`agent/verification/init.sh`, `agent/verification/check-architecture.sh`, and `agent/verification/e2e-check.sh` are the canonical technical entrypoints future sessions rely on. Bootstraper must ensure they match what it scaffolded under `./src` (layout, package manager, and testing choice), rather than assuming one default stack.

#### Step H0.1 — `check-architecture.sh`: baseline + extensions (never overwrite the baseline)

`check-architecture.sh` must always retain its baseline required file set, as currently defined in `agent/verification/check-architecture.sh` inside `required_files=(...)`. That baseline is part of the harness contract.

- Allowed change: append *additional* structural checks derived from the scaffolded setup (e.g. presence of `./src` subprojects, runtime manifests, entrypoints, configs).
- Forbidden change: rewriting `required_files` from scratch, removing baseline entries, or replacing it with a “new list” that drops harness-required paths.

Treat it as:

- `BASE_REQUIRED_FILES` = the existing `required_files` list (unchanged, always present)
- `EXTRA_REQUIRED_FILES` = setup-derived additions
- Actual check = `BASE_REQUIRED_FILES + EXTRA_REQUIRED_FILES`

#### Step H0.2 — `e2e-check.sh`: derive a deterministic verify command from the chosen Testing scope and layout

`e2e-check.sh` must run a single scalable “verify everything” command (or a small sequence when the setup is multi-project), and exit non-zero on failure. It must not hardcode specific test file names.

- If Testing scope ≠ `"None for now"`: wire `e2e-check.sh` to the exact “run all tests” command recorded in Step C (e.g. `npm test`, `pytest`, `cargo test`).
- If Testing scope = `"None for now"`: wire `e2e-check.sh` to a build/compile-style verification (non-interactive) that fails when the project cannot compile/build.
- If the scaffold produces multiple runnable subprojects under `./src`: `e2e-check.sh` must run the verify command per subproject (sequentially) or invoke a root-level verify command if the scaffold already provides one.

#### Step H0.3 — `init.sh`: derive install/start/verify from the scaffolded setup

`init.sh` must reflect the actual package manager and directory layout produced by the scaffold, not a hardcoded default:

- Setup phase: install dependencies in the correct locations for the chosen stack (single project vs multi-project), using the selected package manager.
- Verification phase: run `check-architecture.sh` and `e2e-check.sh` as the canonical verification entrypoints, propagating failures.
- Startup phase: set the default start/dev command to the scaffold’s real startup command, and keep it optional via `RUN_START_COMMAND=1`.

### Step H — Validate via `init.sh` (mandatory) and apply the bounded fix loop on failure

Run `./agent/verification/init.sh` via `mcp-cli-navigator` (never raw shell). This is the verification gate that future sessions rely on: it is required regardless of whether Testing scope is `"None for now"`.

#### Step H.1 — Bounded fix-attempt loop on `init.sh` failure

- `MAX_FIX_ATTEMPTS = 3`, fixed for the session, not configurable mid-run.
- If `init.sh` fails after alignment/wiring, attempt a fix **strictly scoped to files this skill produced or touched** in Steps A–D/H0/H (scaffold output, verify scripts, test config if any). Never touch unrelated pre-existing repo content.
- Each attempt: (1) diagnose from the actual `init.sh` output — never guess blind, same principle as the CLI navigator loop; (2) apply the narrowest possible fix; (3) re-run `init.sh` via `mcp-cli-navigator`; (4) increment the attempt counter.
- If `init.sh` passes within budget → proceed to Step F with `status = passing`.
- If the counter reaches `MAX_FIX_ATTEMPTS` and `init.sh` still fails → **stop attempting fixes immediately.** Do not keep retrying past the limit, and do not mark the feature `passing` with a failing baseline. Go to Step F with `status = blocked`, then to the Bootstrap Failure Handoff below — this mirrors exactly what `implementor` does when it cannot get a feature's verification to pass.

### Step F — Replace the `feature-001` placeholder with the bootstrap task

The harness template ships an example `feature-001` entry in `agent/state/feature_list.json` and a matching `agent/docs/features/feature-001.md`. Bootstraper's job is a **direct replacement**, using the same construction rules `feature-planner` uses for a new feature, but filled retrospectively (documenting what was actually done, not proposing future work) and never appended as a new ID.

**In `agent/state/feature_list.json`:** locate the entry with `id == "feature-001"` and overwrite its fields (do not append a new object):

| Field | Value rule |
|---|---|
| `id` | `feature-001` (unchanged — this is a replacement, never a new ID) |
| `priority` | `1` |
| `area` | `"bootstrap"` |
| `title` | e.g. `"Bootstrap <Framework> Project Scaffold"` |
| `user_visible_behavior` | One sentence starting with `"A developer can ..."`, e.g. `"A developer can clone the repo and run <validation command> to see the empty <Framework> app boot."` |
| `status` | `"passing"` if Step H validation succeeded; `"blocked"` if `MAX_FIX_ATTEMPTS` was exhausted in Step H.1 |
| `verification` | 3–5 human-executable steps built from what Steps A–H0/H actually did (same rule `feature-planner` uses), ending in a `"Verify ..."` assertion — e.g. `"Run <install command>"`, `"Run <start/dev command>"`, `"Run ./agent/verification/init.sh"`, `"Verify it exits 0"` |
| `session_ids` | `[current session id]` |

Also update the top-level `last_updated` field to today's date.

**In `agent/docs/features/feature-001.md`:** overwrite the placeholder file using the same five-section structure `feature-planner` produces, plus the Dynamic Tasks table — but filled retrospectively:

- `Objective` / `Expected Behavior` / `Out of Scope` / `Acceptance Criteria` / `Minimum Expected Evidence`: describe the scaffold that now exists, not a future request.
- `## Implementation Tasks (Dynamic)`: one row per Step A–H0/H actually executed (scaffold, manual adjustments, testing setup, docs, verification-script alignment, validation), each with `Status = done` (or `blocked` for the one that failed, if applicable) and `Notes` = a concrete evidence pointer (command run, exit code, files touched). Bootstraper does not plan ahead here — it documents completed work, so no row should be left `pending`.
- `### Task Rationale`: state explicitly that this feature was auto-generated by `bootstraper`, not `feature-planner`, and include the Step H.1 fix-attempt log if any attempts were made.
- `### Complexity Flags`: `Low` is the natural default for a scaffold-only feature. If `status = blocked`, do not use this field to express that — use `status` and the session-handoff continuation context instead.
- `### Open Questions Before Implementation`: carry over any `"TBD"` answers from Block 0 here, so the next `feature-planner` session sees them.

**Never** create a `feature-002` for this — the bootstrap task IS `feature-001`, always.

## End of Bootstrap Session (mirrors `implementor`'s Handoff phase)

Run these steps in order, **whether the bootstrap succeeded or hit the Step H.1 fix-attempt limit**, before printing the Final Report. This is the same discipline `implementor` applies at the end of every session, adapted to bootstrap.

1. Write the session log in `agent/state/logs/session-log-${id}.md` (`id` = `yyyy-MM-dd-hhmmss`, one file per session). Include: Block 0–6 questionnaire answers, the exact scaffold command run, manual adjustments applied (Step B), security controls applied (Step D), the verify command wired into `e2e-check.sh` (Step H0), the `init.sh` result, and — if Step H.1 fix attempts occurred — each attempt with what was tried and why it failed.
2. Update `agent/state/feature_list.json` per Step F (feature-001 fields), and append the session ID to its `session_ids`.
3. Update `agent/state/session-handoff.md`:
   - **Success** (`init.sh` passing): reset to the empty/no-handoff marker defined in its template.
   - **Blocked** (`MAX_FIX_ATTEMPTS` exhausted): write a compact continuation context — what's broken, what was tried in Step H.1 and why each attempt failed, and what the next session (most likely `implementor`, since `feature-001` is now just another `blocked` feature) should pick up from. Mark the handoff as active.
4. Update `agent/state/progress.md` with the new snapshot: bootstrap completed (or blocked), verified state, and blocker if any. This is the explicit signal other skills rely on to know a bootstrap happened — `feature-planner`'s pre-flight reads this file, so it no longer has to infer anything from `./src`'s contents.
5. Review `agent/state/clean-state-checklist.md`.
6. Record any unresolved risk or blocker in the session log and, if it outlives the session, also in `session-handoff.md`.
7. State explicitly in the report whether the repo is restartable from `init.sh`: **proven true** for the success path (Step H already confirmed it), or **explicitly not yet true** for the blocked path.
8. Commit **only if** `progress.md` and `feature_list.json` are updated **and** `init.sh` is passing. If blocked, do **not** auto-commit — present the Final Report and stop; let the human decide whether to commit the broken scaffold as-is, discard it, or hand `feature-001` to `implementor` to unblock. This mirrors the Anti-Overwrite Guard philosophy already in this skill: never guess past a hard stop.

## Final Report (CLI vs manual breakdown)

When finished, print a structured report that explicitly separates what the official CLI generated vs. what was hand-adjusted, and states the bootstrap's final status.

```
Bootstrap Complete Report
=========================
Status: [PASSING / BLOCKED — see Step H.1 fix attempts]

Official scaffold command executed (via mcp-cli-navigator):
  [full command + args as run]
  Interactive prompts encountered: [brief list of what was answered, e.g. "project name, TS, ESLint: yes, router: yes"]
  → generated the following baseline files (or a short summary) under ./src

Manual adjustments NOT produced by CLI:
  1. [Adjustment description] — Reason: [a/b/c/d classification + short reason]
  2. ...

Documentation written/updated:
  - agent/docs/architecture.md
  - agent/docs/product.md
  - agent/docs/reliability.md
  - agent/docs/security.md

Security controls applied (see agent/docs/security.md):
  ✅ [Control name 1]
  ✅ [Control name 2]
  ⚪ [Skipped per user / n/a]

Testing setup:
  - Framework: [xxx]
  - Scope:     [xxx]
  - e2e-check.sh wired to: [command — tests if configured, otherwise build/compile]

Validation (init.sh via mcp-cli-navigator):
  [PASS / FAIL]
  Fix attempts used: [N / MAX_FIX_ATTEMPTS]

feature-001 (agent/state/feature_list.json + agent/docs/features/feature-001.md):
  Status: [passing / blocked]
  Replaced the template placeholder — see verification[] for the human-checkable steps.

Output location: ./src

NEXT STEP:
  [If PASSING] — This bootstrap session ends HERE. Do NOT implement business logic
  or custom features inside this same pass. Use the standard harness path for
  any follow-up feature work: feature-planner → (human approval) → implementor.

  [If BLOCKED] — feature-001 is now status: blocked in feature_list.json, with
  continuation context in session-handoff.md. The next session should invoke
  implementor to unblock it (same as any other blocked feature) — do NOT re-run
  bootstraper from scratch unless the human explicitly asks to reset ./src.
```

## Reference Table: Official Scaffold Commands

Not exhaustive — **always validate the current version against official docs before running.** Every command below is executed via `mcp-cli-navigator` (`start_cli_session` + `send_key` loop), regardless of whether it happens to be interactive — no need to pre-classify.

| Framework                | Type                 | Default Lang                      | Official Command (reference — validate version before running)                        |
| ------------------------ | -------------------- | ---------------------------------- | --------------------------------------------------------------------------------------- |
| React + Vite             | Frontend             | TS / JS                           | `npm create vite@latest . -- --template react-ts` or `react`                          |
| Next.js                  | Fullstack / Frontend | TS / JS                           | `npx create-next-app@latest` (flags: --ts --app --tailwind, etc.)                     |
| Angular                  | Frontend             | TS                                 | `ng new <name>` or `npx @angular/cli new <name>`                                      |
| Vue + Vite               | Frontend             | TS / JS                           | `npm create vue@latest`                                                               |
| Nuxt                     | Fullstack / Vue      | TS / JS                           | `npx nuxi init`                                                                        |
| SvelteKit                | Fullstack            | TS / JS                           | `npx sv create`                                                                        |
| SolidStart               | Fullstack            | TS / JS                           | `npx degit solidjs/templates/ts my-app` or `npm create solid@latest`                  |
| Qwik City                | Fullstack            | TS / JS                           | `npm create qwik@latest`                                                              |
| Remix                    | Fullstack            | TS / JS                           | `npx create-remix@latest`                                                             |
| RedwoodJS                | Fullstack            | TS                                 | `npx create-redwood-app@latest <path>`                                                |
| T3 App (create-t3-app)   | Fullstack            | TS                                 | `npm create t3-app@latest`                                                            |
| Express (Node)           | Backend              | JS / TS                           | `npx express-generator` or `npm create express@latest`                                |
| Fastify (Node)           | Backend              | TS / JS                           | `npx fastify-cli@latest generate myproject`                                           |
| NestJS                   | Backend              | TS                                 | `npx @nestjs/cli new <name>`                                                          |
| Koa (Node)                | Backend              | JS / TS                           | `npx koa-generator`                                                                    |
| Django                   | Backend / Fullstack  | Python                            | `django-admin startproject <name>`                                                    |
| FastAPI                  | Backend              | Python                            | `uv init` + `uv add fastapi "uvicorn[standard]"`                                      |
| Flask                    | Backend              | Python                            | `mkdir app && python -m venv .venv && source .venv/bin/activate && pip install flask` |
| Starlette                | Backend              | Python                            | `uv init` + `uv add starlette uvicorn`                                                |
| Laravel                  | Backend / Fullstack  | PHP                                | `composer create-project laravel/laravel <name>`                                      |
| Symfony                  | Backend / Fullstack  | PHP                                | `symfony new <name> --webapp` or `composer create-project symfony/skeleton <name>`    |
| Gin (Go)                 | Backend              | Go                                 | `go mod init <module> && go get -u github.com/gin-gonic/gin`                          |
| Fiber (Go)                | Backend              | Go                                 | `go mod init <module> && go get github.com/gofiber/fiber/v3`                          |
| Echo (Go)                 | Backend              | Go                                 | `go mod init <module> && go get github.com/labstack/echo/v4`                          |
| Axum (Rust)               | Backend              | Rust                               | `cargo new <name> && cargo add axum tokio --features tokio/full`                      |
| Actix-web (Rust)          | Backend              | Rust                               | `cargo new <name> && cargo add actix-web`                                             |
| Rails                     | Backend / Fullstack  | Ruby                               | `rails new <name>`                                                                     |
| Spring Boot               | Backend / Fullstack  | Java / Kotlin                      | Spring Initializr CLI `spring init` or start.spring.io generate                        |
| AWS SAM                   | Infra + Deploy       | Mix                                | `sam init`                                                                              |
| AWS CDK                   | Infra                | TS / JS / Python / Java / Go / C# | `npm i -g aws-cdk && cdk init app --language=typescript`                              |
| Cloudflare Workers         | Backend / Edge       | TS / JS                           | `npm create cloudflare@latest`                                                         |
| Cloudflare Pages          | Frontend Deploy      | N/A                                | CI template per framework (no code scaffold, only deploy config)                       |
| Vercel Deploy              | Deploy               | N/A                                | `npx vercel init` or (commonly a CI file)                                              |
| GitHub Actions (CI base)  | CI                   | YAML                               | Copy official templates from `actions/starter-workflows` into `.github/workflows/`     |
| Other                     | -                    | -                                   | User-specified command — ALWAYS validate official docs before executing                |

## What NOT To Do (Anti-Drifting Guards & Anti-patterns)

HARD RULES — never break these:

1. **Never write by hand** `package.json`, `tsconfig.json`, `vite.config.*`, `next.config.*`, `angular.json`, `pyproject.toml`, `settings.py`, `Cargo.toml`, `go.mod`, `composer.json`, etc. if the framework's official CLI already generates them. Hand-writing is allowed ONLY for cases (a), (b), (c), (d) of the Execution Workflow.
2. **Never execute CLI commands outside `mcp-cli-navigator`.** No raw shell/bash tool, no "this one looks non-interactive so I'll skip the navigator" shortcuts.
3. **Do NOT mix roles in the same pass.** After the bootstrap runs and the report is printed, STOP. Do not implement any feature, any business endpoint, any view beyond the empty scaffold. If the user requests `"bootstrap + implement a login"` in the same message: run the bootstrap, print this report, and reply that the login feature must go through the standard `feature-planner → implementor` path.
4. **Do NOT assume.** If the user left any questionnaire block unanswered, ask before executing. Never pick a default silently — always state out loud which default you are picking and why, if you are picking one.
5. **Do NOT ask any question — Block 0, Blocks 1–6, or ad-hoc/clarifying — outside the structured `Question` + predefined `options` + `Other (specify)` format.** A message that raises a new open question via narrative prose (even inside an otherwise-helpful status recap) violates this rule just as much as silently assuming an answer. See "Questionnaire Format Rule" and "Any Additional or Clarifying Question" above.
6. **Do NOT overwrite `./src` without explicit confirmation.** See Pre-flight Anti-Overwrite Guard.
7. **Do NOT use deprecated commands or flags.** Always prefer the latest command documented by the framework. If in doubt, validate against the official documentation URL before executing.
8. **Do NOT touch `agent/docs/security.md` from other skills** — only `bootstraper` and `implementor` are allowed to write it. `feature-planner` never reads or writes it in a capacity that would apply controls.
9. **Do NOT leave sessions open.** Every `start_cli_session` must be matched with a `close_session` once it exits (or once aborted).
10. **Do NOT leave `feature-001` as the template placeholder.** Once bootstrap runs, it must always be overwritten in-place — never appended as a new ID, never left stale.
11. **Do NOT exceed `MAX_FIX_ATTEMPTS` silently.** After the limit, stop and hand off exactly as described in Step H.1 and the Bootstrap Session Handoff — do not keep looping.
12. **Do NOT commit when `init.sh` is failing.** A blocked bootstrap ends in a report and a handoff, not a commit.