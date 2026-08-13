# harness-template — Boilerplate for Any Technical Project

> This template provides a **predefined operational harness** for working
> on software projects with a disciplined workflow, compatible with both
> LLM agents and humans.
>
> The fundamental repo rule: **all operational knowledge lives
> in files within the `/agent/` directory, not in chat memory.**

---

## 🚀 SINGLE Entry Point: Read `AGENTS.md`

Opening this repository for the first time must start in the same place:

👉 **[AGENTS.md](file:///Users/leandro/Documents/projects/harness-template/AGENTS.md)** 👈

## You HUMAN, not agent:

### To add new features, do the following:

* Write the entry in `feature_list.json`
* Set a unique priority (or at least make it clearly the top priority)
* Set `status = not_started`
* Make `user_visible_behavior` as observable as possible
* Make `verification.checks` as concrete as possible
* Set `session_ids = []`
* If the feature is moderately complex:
  * Create `./agent/docs/features/feature-XXX.md` with:
    * objective
    * expected behavior
    * out of scope
    * acceptance criteria
    * minimum expected evidence

* If it affects product / architecture / reliability:
  * Update `product.md`
  * Update `architecture.md`
  * Update `reliability.md` (Golden Journeys if applicable)
  * If new scripts were required, update `init.sh` / `check-architecture.sh` / `e2e-check.sh`

* Leave the repo in a healthy baseline before handing it over to the agent:
  * `./agent/verification/init.sh` → exit 0
  * If not, the agent must enter **baseline fix** first, not feature work.
