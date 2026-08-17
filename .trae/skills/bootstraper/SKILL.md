---
name: "bootstraper"
description: "Bootstraps a brand new project (web/fullstack/frontend-only/backend-only) inside ./src via OFFICIAL framework CLIs — never writes boilerplate by hand. Executes all CLI commands through the mcp-cli-navigator MCP (PTY-based, turn-based) since most scaffolding CLIs present interactive menus. Triggers when user message begins with or contains the 'bootstrap' keyword."
---

# Bootstraper Skill

## Purpose

This skill is the **project bootstrapper**. Its single responsibility is to lift the initial scaffolding (andamiaje inicial) of a **brand new project** inside `./src`.

Guiding principle: **DO NOT REINVENT BOILERPLATE.**

- Never write by hand the base files of a framework (package.json, bundler config, tsconfig, folder structure, etc.).
- Always execute the **official scaffolding command** documented by the chosen framework or tool, and let that tool generate the files.
- This saves output tokens (no need to regenerate known versioned boilerplate), guarantees the setup matches the framework's current version and conventions, and reduces manual configuration errors.
- Writing or editing files by hand is ONLY allowed for:
  - **(a)** Relocating the scaffolded output to the required location (`./src`).
  - **(b)** Applying questionnaire answers that the official command does not cover (e.g., add a security linter, CI, hardening).
  - **(c)** Integrating pieces that have no official command of their own.

This skill **NEVER** implements business features in the same pass. That is the `implementor` skill's job at [implementor/SKILL.md](file:///Users/leandro/Documents/projects/harness-template/.trae/skills/implementor/SKILL.md).
This skill **NEVER** plans or specs features. That is the `feature-planner` skill's job at [feature-planner/SKILL.md](file:///Users/leandro/Documents/projects/harness-template/.trae/skills/feature-planner/SKILL.md).
This skill **writes and updates** `agent/docs/security.md` as the single source of truth for applied security controls.

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

**Every** command this skill runs against a terminal — scaffold commands, plugin/testing installs, validation boots, everything in Steps A/C/E — MUST go through the `mcp-cli-navigator` MCP tools, never through a raw shell/bash tool.

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

- Never fall back to a raw shell/bash execution tool for anything covered by the Reference Table of official scaffold commands, or for Step C / Step E — the navigator is the only execution path for this skill.
- Never pre-script an entire multi-step interaction sequence and fire it blind. Read the actual `output` after every `start_cli_session`/`send_key` call before deciding the next key — menus vary by CLI version and by earlier answers.
- If `command` would fall outside the navigator's allowlist, treat that as a Block 1/Block 4 answer that needs the "Other (specify)" path — do not attempt to work around the allowlist.
- If a session produces no new output and doesn't exit within the navigator's own timeout, call `read_output` once more; if still stuck, `close_session`, report the stall with the last known screen content, and ask the user how to proceed rather than retrying blindly.

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
2. If `./src` contains **any files or folders other than** `.gitkeep` or a placeholder `README.md` → **STOP.** Ask the user for explicit confirmation to overwrite, using an explicit yes/no prompt:
   ```
   ./src already contains files. Do you want to OVERWRITE the existing ./src contents? (yes / no)
   ```
   Without an explicit `yes`, do **not** open any `mcp-cli-navigator` session.
3. Basic runtime availability (Node, Python, etc.) can be verified now via `start_cli_session` (e.g. `node --version`) — these are non-interactive and will simply return `exited: true` immediately — or deferred until after the questionnaire narrows the target stack.

## Structured Questionnaire (SOP — 6 blocks, never assume)

Ask the user **block by block**, in this order. Every block must include an `Other (specify)` option as a valid answer. If the user has no preference on a framework, recommend 1-2 coherent options aligned with the rest of the answers (e.g., if AWS SAM was chosen, recommend a backend that scaffolds cleanly against SAM) and always keep `Other (specify)` on the table.

### Block 1 — Project Type + Framework

**1. Project type?**

- Fullstack (frontend + backend monorepo or integrated)
- Frontend only
- Backend only
- Other (specify)

**2. Specific framework desired?** (grouped by project type; offer recommendations if user has no preference)

- **Frontend candidates:** React + Vite, Next.js, Angular, Vue (+ Nuxt), SvelteKit, Solid, Qwik, Other (specify)
- **Backend candidates:** Node (Express / Fastify / NestJS / Koa), Python (FastAPI / Django / Starlette), PHP (Laravel / Symfony), Go (Gin / Fiber / Echo), Rust (Axum / Actix), Ruby (Rails), Java (Spring Boot), Other (specify)
- **Fullstack candidates:** Next.js, Nuxt, SvelteKit, Remix, Redwood, T3 (T3 Turbo / create-t3-app), Laravel + Blade/Vue, Django + HTMX, Other (specify)

### Block 2 — Language (when not dictated by the framework)

Ask only if the framework leaves room for choice:

- TypeScript, JavaScript, Python 3.x, Go, Rust, PHP, Java, Other (specify)
- Note: if the framework dictates the language (e.g., Django = Python, Rails = Ruby, Angular = TS), state the assumption out loud and confirm the variant if any (e.g., TS vs JS for Next.js).

### Block 3 — Package Manager (when applicable)

- **Node:** npm / pnpm / yarn / bun / Default of the framework
- **Python:** uv / pip / poetry / Default of the framework
- **Other runtime's package manager** or **Default of the framework**
- Other (specify)

### Block 4 — Architecture / Deployment Target

Ask which deployment architecture should be assumed as default / configured (CI templates, hardening):

- Local only (no pipeline, no cloud)
- Self-hosted DevOps (user's already-existing infrastructure)
- Bitbucket + Pipelines
- GitHub + Actions / Pipelines
- GitLab + CI/CD
- AWS SAM / AWS CDK
- Cloudflare (Pages / Workers / Pages + Functions)
- Vercel
- Netlify
- Render
- Fly.io
- Google Cloud Run / Firebase
- Azure Static Web Apps / Functions
- Other (specify)

### Block 5 — Security (results feed `agent/docs/security.md`)

Ask the desired **minimum level / accepted bar**. `"None for now / urgency first"` is a valid answer. List each item explicitly so the user can accept / skip each:

- Environment variables managed via `.env` + `.env.example` + adequate `.gitignore` entries
- Secrets kept **outside the repository** (never committed; documented forbidden patterns)
- Dependency bot (Dependabot / Renovate)
- Security linting / auditing (npm audit, eslint-plugin-security, bandit, cargo-audit, etc.)
- Basic CORS / security-headers configuration baseline
- Deployment-target-specific hardening (e.g., secure headers on Cloudflare, AWS SAM least-privilege IAM, etc.)
- Other (specify)

### Block 6 — Testing

**Preferred test framework**, or `"Default of the chosen framework"` (examples: Vitest / Jest for Node/TS frontend, pytest for Python, etc.).
**Scope desired:**

- Unit only
- Unit + Integration
- Unit + Integration + E2E (Playwright / Cypress / etc.)
- None for now / urgency first

## Post-Questionnaire — Summary + Human Approval

Before opening **any** `mcp-cli-navigator` session, present the human with a concise approval summary. Do not proceed on your own.

```
Bootstrap Plan Draft
====================
Project Type:       [answer]
Framework & Lang:   [answer]
Package Manager:    [answer]
Deployment Target:  [answer]

Security Controls to be applied:
  - [x] Control accepted by user
  - [ ] Control skipped per user

Testing setup:
  Framework: [answer]
  Scope:     [answer]

Output location: ./src
Official scaffold command to be run (via mcp-cli-navigator):
  [exact command + args you will pass to start_cli_session]

Manual adjustments after CLI (if any):
  1. [Adjustment] — Reason: [a / b / c classification + why]
  2. ...

====================================
Human APPROVAL REQUIRED before any CLI execution. Reply APPROVE to proceed.
```

## Execution Workflow (after explicit APPROVE)

Run in order. Do not skip validation steps. **All** CLI execution in this workflow goes through `mcp-cli-navigator` per the operating loop described above — never a raw shell tool.

### Step A — Run the official scaffolding command via mcp-cli-navigator

Prefer **always the latest official command + flags** of the chosen framework. If there is version ambiguity, validate against the framework's official documentation URL before running.

- Always set `cwd` to an **absolute** path derived from `repoRoot`.
- Prefer running scaffolding commands from `cwd = repoRoot` and specifying output folders under `./src` in the command args (example: `... my-app` where `my-app` is `src/<something>`), so the destination is explicit.
- If the CLI natively supports a **destination directory flag**, use it and point it at `srcDir` (or a subfolder of it), still keeping `cwd` inside `repoRoot`.
- If the CLI does **NOT** support a destination flag → use a temporary directory inside the repo (example: `<repoRoot>/.tmp-bootstrap`), drive the scaffold there via the operating loop, then **move the produced content** to `srcDir` (a file-move, not a CLI-navigator step), and delete the temporary folder afterwards.
- Drive every prompt through `send_key`, reading the real `output` at each step (project name, TS/JS, linter, router, package manager confirmation, etc.) rather than assuming the sequence in advance. Close the session once `exited: true` and record the `exitCode`.

### Step B — Manual adjustments allowed (and ONLY these)

Writing files by hand is restricted to the following cases. Everything else must come from the official CLI, driven through `mcp-cli-navigator`.

1. **Case (a) — Relocation to** **`./src`:** Path fixing, moving nested sub-folders if the CLI produced incorrect nesting inside `./src`. (Plain file operations — not a navigator session.)
2. **Case (b) — Questionnaire answers not covered by the official command:**
   - Add CI configuration (e.g., a GitHub Actions workflow file under `.github/workflows/`), **always using official starter templates** from GitHub starter-workflows or the equivalent official source for the CI provider.
   - Add Dependabot / Renovate configuration files from **official templates**.
   - Add security linter packages / audit scripts into `package.json` / `requirements-dev.txt` / project dev dependencies, using the **standard official plugin / package names** — install them via `mcp-cli-navigator` (e.g. `npm install -D <plugin>` through `start_cli_session`), not by hand-editing lockfiles.
   - Write or update `agent/docs/security.md` with the controls applied (flip rows to `Status = complete` + fill `Notes/Reference`).
   - Create `.env.example` + add `.env` to `.gitignore` if the CLI did not do it already.
   - CORS / security headers baseline hardening via the **standard official plugin or package** for the framework, installed through `mcp-cli-navigator`.
3. **Case (c) — Integrations with no official scaffold command:** e.g., adding a pre-commit hook config when no `init` command exists for it.

### Step C — Apply the selected Testing setup via mcp-cli-navigator

If it goes beyond the framework default, use the framework's official add-plugin / install commands through `start_cli_session` + the operating loop (do not hand-write test configs unless no official command exists). Installers for test frameworks can also prompt interactively (e.g. choosing a runner or config style) — treat them the same as Step A: read the screen, respond via `send_key`.

### Step D — Write / Update `agent/docs/security.md`

This step is mandatory if any of the Security controls were accepted, or to explicitly mark them `n/a`.

- For every control in **Block 5** → flip the row in `agent/docs/security.md` Controls Matrix to `Status = complete` / `pending` / `n/a`.
- Fill the `Notes / Reference` column with a concrete path to the configuration file, or an explicit rationale.
- Fill the section `Deployment & Runtime Hardening` with the target chosen in Block 4.
- Fill sections `Secret Management` and `Dependency Hygiene` accordingly.

(This step is documentation only — no `mcp-cli-navigator` session needed.)

### Step E — Minimal final validation via mcp-cli-navigator

Compile or run the **empty project once** to confirm the scaffold actually boots, using `start_cli_session` (and `read_output` while it warms up):

- Node/TS frontend / fullstack: `npm run build` (session should reach `exited: true` on its own) or `npm run dev` (poll with `read_output` until you see a successful boot line in the output, then `close_session` to kill it — dev servers don't exit on their own).
- Python FastAPI: `uvicorn app.main:app --port 0 --log-level info` — poll with `read_output` until a clean startup line appears, then `close_session`.
- Any other framework: the equivalent short compile-or-boot command for an empty baseline, driven the same way.
- If this fails → attempt **one minimal fix** of PATHs / misplacement from Step A, then report; do not deep-dive.

## Final Report (CLI vs manual breakdown)

When finished, print a structured report that explicitly separates what the official CLI generated vs. what was hand-adjusted.

```
Bootstrap Complete Report
=========================
Official scaffold command executed (via mcp-cli-navigator):
  [full command + args as run]
  Interactive prompts encountered: [brief list of what was answered, e.g. "project name, TS, ESLint: yes, router: yes"]
  → generated the following baseline files (or a short summary) under ./src

Manual adjustments NOT produced by CLI:
  1. [Adjustment description] — Reason: [a/b/c classification + short reason]
  2. ...

Security controls applied (see agent/docs/security.md):
  ✅ [Control name 1]
  ✅ [Control name 2]
  ⚪ [Skipped per user / n/a]

Testing setup:
  - Framework: [xxx]
  - Scope:     [xxx]

Validation (empty project compile/run via mcp-cli-navigator):
  [PASS / FAIL + one-line evidence]

Output location: ./src

NEXT STEP — This bootstrap session ends HERE. Do NOT implement business logic
or custom features inside this same pass. Use the standard harness path for
any follow-up configuration or new feature work:
    feature-planner → (human approval) → implementor
```

## Reference Table: Official Scaffold Commands

Not exhaustive — **always validate the current version against official docs before running.** Every command below is executed via `mcp-cli-navigator` (`start_cli_session` + `send_key` loop), regardless of whether it happens to be interactive — no need to pre-classify.

| Framework                | Type                 | Default Lang                      | Official Command (reference — validate version before running)                        |
| ------------------------ | -------------------- | --------------------------------- | ------------------------------------------------------------------------------------- |
| React + Vite             | Frontend             | TS / JS                           | `npm create vite@latest . -- --template react-ts` or `react`                          |
| Next.js                  | Fullstack / Frontend | TS / JS                           | `npx create-next-app@latest` (flags: --ts --app --tailwind, etc.)                     |
| Angular                  | Frontend             | TS                                | `ng new <name>` or `npx @angular/cli new <name>`                                      |
| Vue + Vite               | Frontend             | TS / JS                           | `npm create vue@latest`                                                               |
| Nuxt                     | Fullstack / Vue      | TS / JS                           | `npx nuxi init`                                                                       |
| SvelteKit                | Fullstack            | TS / JS                           | `npx sv create`                                                                       |
| SolidStart               | Fullstack            | TS / JS                           | `npx degit solidjs/templates/ts my-app` or `npm create solid@latest`                  |
| Qwik City                | Fullstack            | TS / JS                           | `npm create qwik@latest`                                                              |
| Remix                    | Fullstack            | TS / JS                           | `npx create-remix@latest`                                                             |
| RedwoodJS                | Fullstack            | TS                                | `npx create-redwood-app@latest <path>`                                                |
| T3 App (create-t3-app)   | Fullstack            | TS                                | `npm create t3-app@latest`                                                            |
| Express (Node)           | Backend              | JS / TS                           | `npx express-generator` or `npm create express@latest`                                |
| Fastify (Node)           | Backend              | TS / JS                           | `npx fastify-cli@latest generate myproject`                                           |
| NestJS                   | Backend              | TS                                | `npx @nestjs/cli new <name>`                                                          |
| Koa (Node)               | Backend              | JS / TS                           | `npx koa-generator`                                                                   |
| Django                   | Backend / Fullstack  | Python                            | `django-admin startproject <name>`                                                    |
| FastAPI                  | Backend              | Python                            | `uv init` + `uv add fastapi "uvicorn[standard]"`                                      |
| Flask                    | Backend              | Python                            | `mkdir app && python -m venv .venv && source .venv/bin/activate && pip install flask` |
| Starlette                | Backend              | Python                            | `uv init` + `uv add starlette uvicorn`                                                |
| Laravel                  | Backend / Fullstack  | PHP                               | `composer create-project laravel/laravel <name>`                                      |
| Symfony                  | Backend / Fullstack  | PHP                               | `symfony new <name> --webapp` or `composer create-project symfony/skeleton <name>`    |
| Gin (Go)                 | Backend              | Go                                | `go mod init <module> && go get -u github.com/gin-gonic/gin`                          |
| Fiber (Go)               | Backend              | Go                                | `go mod init <module> && go get github.com/gofiber/fiber/v3`                          |
| Echo (Go)                | Backend              | Go                                | `go mod init <module> && go get github.com/labstack/echo/v4`                          |
| Axum (Rust)              | Backend              | Rust                              | `cargo new <name> && cargo add axum tokio --features tokio/full`                      |
| Actix-web (Rust)         | Backend              | Rust                              | `cargo new <name> && cargo add actix-web`                                             |
| Rails                    | Backend / Fullstack  | Ruby                              | `rails new <name>`                                                                    |
| Spring Boot              | Backend / Fullstack  | Java / Kotlin                     | Spring Initializr CLI `spring init` or start.spring.io generate                       |
| AWS SAM                  | Infra + Deploy       | Mix                               | `sam init`                                                                            |
| AWS CDK                  | Infra                | TS / JS / Python / Java / Go / C# | `npm i -g aws-cdk && cdk init app --language=typescript`                              |
| Cloudflare Workers       | Backend / Edge       | TS / JS                           | `npm create cloudflare@latest`                                                        |
| Cloudflare Pages         | Frontend Deploy      | N/A                               | CI template per framework (no code scaffold, only deploy config)                      |
| Vercel Deploy            | Deploy               | N/A                               | `npx vercel init` or (commonly a CI file)                                             |
| GitHub Actions (CI base) | CI                   | YAML                              | Copy official templates from `actions/starter-workflows` into `.github/workflows/`    |
| Other                    | -                    | -                                 | User-specified command — ALWAYS validate official docs before executing               |

## What NOT To Do (Anti-Drifting Guards & Anti-patterns)

HARD RULES — never break these:

1. **Never write by hand** `package.json`, `tsconfig.json`, `vite.config.*`, `next.config.*`, `angular.json`, `pyproject.toml`, `settings.py`, `Cargo.toml`, `go.mod`, `composer.json`, etc. if the framework's official CLI already generates them. Hand-writing is allowed ONLY for cases (a), (b), (c) of the Execution Workflow.
2. **Never execute CLI commands outside `mcp-cli-navigator`.** No raw shell/bash tool, no "this one looks non-interactive so I'll skip the navigator" shortcuts. `start_cli_session` on a non-interactive command simply returns `exited: true` immediately — there is no cost to always going through it, and it removes an entire class of hangs from unclassified interactive prompts.
3. **Do NOT mix roles in the same pass.** After the bootstrap runs and the report is printed, STOP. Do not implement any feature, any business endpoint, any view beyond the empty scaffold. If the user requests `"bootstrap + implement a login"` in the same message: run the bootstrap, print this report, and reply that the login feature must go through the standard `feature-planner → implementor` path.
4. **Do NOT assume.** If the user left any questionnaire block unanswered, ask before executing. Never pick a default silently — always state out loud which default you are picking and why, if you are picking one. This includes reading actual `mcp-cli-navigator` output before choosing the next `send_key` — never guess an interaction sequence blind.
5. **Do NOT overwrite** **`./src`** **without explicit confirmation.** See Pre-flight Anti-Overwrite Guard.
6. **Do NOT use deprecated commands or flags.** Always prefer the latest command documented by the framework. If in doubt, validate against the official documentation URL before executing.
7. **Do NOT touch** **`agent/docs/security.md`** **from other skills** — only `bootstraper` and `implementor` are allowed to write it. `feature-planner` never reads or writes it in a capacity that would apply controls.
8. **Do NOT leave sessions open.** Every `start_cli_session` must be matched with a `close_session` once it exits (or once aborted) — don't leak PTY processes across steps or across the whole bootstrap run.
