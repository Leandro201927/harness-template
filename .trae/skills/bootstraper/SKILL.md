---
name: "bootstraper"
description: "Bootstraps a brand new project (web/fullstack/frontend-only/backend-only) inside ./src via OFFICIAL framework CLIs — never writes boilerplate by hand. Triggers when user message begins with or contains the 'bootstrap' keyword."
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

1. List the contents of `./src` (if the directory exists).
2. If `./src` contains **any files or folders other than** `.gitkeep` or a placeholder `README.md` → **STOP.** Ask the user for explicit confirmation to overwrite, using an explicit yes/no prompt:
   ```
   ./src already contains files. Do you want to OVERWRITE the existing ./src contents? (yes / no)
   ```
   Without an explicit `yes`, do **not** execute any scaffold command.
3. Basic runtime availability (Node, Python, etc.) can be verified now, or deferred until after the questionnaire narrows the target stack.

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

Before executing **any** CLI command, present the human with a concise approval summary. Do not proceed on your own.

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
Official scaffold command to be run:
  [exact command + flags you will run]

Manual adjustments after CLI (if any):
  1. [Adjustment] — Reason: [a / b / c classification + why]
  2. ...

====================================
Human APPROVAL REQUIRED before any CLI execution. Reply APPROVE to proceed.
```

## Execution Workflow (after explicit APPROVE)

Run in order. Do not skip validation steps.

### Step A — Run the official scaffolding command

Prefer **always the latest official command + flags** of the chosen framework. If there is version ambiguity, validate against the framework's official documentation URL before running.

- If the CLI natively supports a **destination directory flag**, point it to `./src` (or to the appropriate sub-folder under `./src` for monorepo layouts).
- If the CLI does **NOT** support a destination flag → create a temporary directory (e.g., `./.tmp-bootstrap`), run the scaffold there, then **move the produced content** to `./src`, and delete the temporary folder afterwards.

### Step B — Manual adjustments allowed (and ONLY these)

Writing files by hand is restricted to the following cases. Everything else must come from the official CLI.

1. **Case (a) — Relocation to** **`./src`:** Path fixing, moving nested sub-folders if the CLI produced incorrect nesting inside `./src`.
2. **Case (b) — Questionnaire answers not covered by the official command:**
   - Add CI configuration (e.g., a GitHub Actions workflow file under `.github/workflows/`), **always using official starter templates** from GitHub starter-workflows or the equivalent official source for the CI provider.
   - Add Dependabot / Renovate configuration files from **official templates**.
   - Add security linter packages / audit scripts into `package.json` / `requirements-dev.txt` / project dev dependencies, using the **standard official plugin / package names**.
   - Write or update `agent/docs/security.md` with the controls applied (flip rows to `Status = complete` + fill `Notes/Reference`).
   - Create `.env.example` + add `.env` to `.gitignore` if the CLI did not do it already.
   - CORS / security headers baseline hardening via the **standard official plugin or package** for the framework.
3. **Case (c) — Integrations with no official scaffold command:** e.g., adding a pre-commit hook config when no `init` command exists for it.

### Step C — Apply the selected Testing setup

If it goes beyond the framework default, use the framework's official add-plugin / install commands (do not hand-write test configs unless no official command exists).

### Step D — Write / Update `agent/docs/security.md`

This step is mandatory if any of the Security controls were accepted, or to explicitly mark them `n/a`.

- For every control in **Block 5** → flip the row in `agent/docs/security.md` Controls Matrix to `Status = complete` / `pending` / `n/a`.
- Fill the `Notes / Reference` column with a concrete path to the configuration file, or an explicit rationale.
- Fill the section `Deployment & Runtime Hardening` with the target chosen in Block 4.
- Fill sections `Secret Management` and `Dependency Hygiene` accordingly.

### Step E — Minimal final validation

Compile or run the **empty project once** to confirm the scaffold actually boots:

- Node/TS frontend / fullstack: `npm run build` (exit after build finishes) or `npm run dev` (kill the process after you observe successful boot).
- Python FastAPI: run `uvicorn app.main:app --port 0 --log-level info` (kill immediately after a clean startup line).
- Any other framework: the equivalent short compile-or-boot command for an empty baseline.
- If this fails → attempt **one minimal fix** of PATHs / misplacement from Step A, then report; do not deep-dive.

## Final Report (CLI vs manual breakdown)

When finished, print a structured report that explicitly separates what the official CLI generated vs. what was hand-adjusted.

```
Bootstrap Complete Report
=========================
Official scaffold command executed:
  [full command + flags as run]
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

Validation (empty project compile/run):
  [PASS / FAIL + one-line evidence]

Output location: ./src

NEXT STEP — This bootstrap session ends HERE. Do NOT implement business logic
or custom features inside this same pass. Use the standard harness path for
any follow-up configuration or new feature work:
    feature-planner → (human approval) → implementor
```

## Reference Table: Official Scaffold Commands

Not exhaustive — **always validate the current version against official docs before running.**

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
2. **Do NOT mix roles in the same pass.** After the bootstrap runs and the report is printed, STOP. Do not implement any feature, any business endpoint, any view beyond the empty scaffold. If the user requests `"bootstrap + implement a login"` in the same message: run the bootstrap, print this report, and reply that the login feature must go through the standard `feature-planner → implementor` path.
3. **Do NOT assume.** If the user left any questionnaire block unanswered, ask before executing. Never pick a default silently — always state out loud which default you are picking and why, if you are picking one.
4. **Do NOT overwrite** **`./src`** **without explicit confirmation.** See Pre-flight Anti-Overwrite Guard.
5. **Do NOT use deprecated commands or flags.** Always prefer the latest command documented by the framework. If in doubt, validate against the official documentation URL before executing.
6. **Do NOT touch** **`agent/docs/security.md`** **from other skills** — only `bootstraper` and `implementor` are allowed to write it. `feature-planner` never reads or writes it in a capacity that would apply controls.

