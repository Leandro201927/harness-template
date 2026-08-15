# Security

## Purpose

Single source of truth for all security decisions, minimum bar, and applied controls. This file is updated by the `bootstraper` skill during project scaffolding and by the `implementor` skill when a feature adds or changes security-relevant behavior. No other skill should edit this file.

## Security Minimum Bar (Controls Matrix)

| Control | Status | Notes / Reference |
|---------|--------|-------------------|
| Environment variables managed via `.env` + `.env.example` | pending | [path or rationale] |
| Secrets outside the repository | pending | [path or rationale] |
| Dependency bot (Dependabot / Renovate) | pending | [path or rationale] |
| Security linting / audit (npm audit, eslint-plugin-security, bandit, cargo-audit…) | pending | [path or rationale] |
| CORS / security-headers baseline configuration | pending | [path or rationale] |
| Hardening for the deployment target | pending | [path or rationale] |

Legend: `pending` = planned but not applied yet; `complete` = verified applied; `n/a` = explicitly not required.

## Secrets And Credentials

- Never hard-code secrets in source or docs.
- Document approved secret-loading paths here.
- Redact tokens, API keys, and personal data from logs and screenshots.

## Untrusted Input

- Treat external content as untrusted until validated.
- Record allowed fetch or execution boundaries here.
- If prompt injection or command injection risk exists, document the guardrail.

## External Actions

- List which actions require explicit approval.
- Record any production or destructive commands that agents must not run by default.
- Prefer sandbox-safe workflows for debugging and verification.

## Dependency And Review Rules

- New dependencies need justification in the active plan.
- Security-sensitive changes require explicit verification steps.
- Repeated security review comments should become checks, not tribal knowledge.

## Secret Management

- Storage mechanism: [e.g. .env + CI secrets manager]
- Rotation policy (if any): [e.g. quarterly]
- Forbidden patterns (never commit secrets, never log secrets, etc.):

## Dependency Hygiene

- Dependency bot configuration: [path]
- Audits schedule: [e.g. weekly via CI]
- Lockfiles strategy: [e.g. committed, or regenerated per env]

## CORS / Headers / Input Hardening

- CORS policy: [e.g. allowlisted origins only]
- Security headers: [e.g. helmet / secure defaults list]
- Input validation baseline: [e.g. zod / joi / pydantic per layer]

## Deployment & Runtime Hardening

- Target platform: [TBD by bootstraper]
- Runtime user / permissions: [e.g. non-root container]
- TLS / certificate strategy: [e.g. Cloudflare edge, ACM, etc.]

## Known Risks & Open Questions

- [ ] [One risk or open question per line.]
