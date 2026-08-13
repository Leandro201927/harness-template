# Clean State Checklist — Pre-Commit

> **Mission:** Before running `git commit`, go through every item in this checklist and confirm that it is satisfied. The goal is for ANY commit to leave the repo in a resumable state without surprises.
>
> Referenced by AGENTS.md Phase 3.1.

---

## 1. Harness State

* [ ] **`bash ./agent/verification/check-architecture.sh` passes** without errors

  * Confirms: all harness files exist and `feature_list.json` is valid
* [ ] **`bash ./agent/verification/e2e-check.sh` passes** (or explicitly mark why it does not apply to this commit)
* [ ] **`bash ./agent/verification/init.sh` can run from start to finish** in a clean checkout of the current commit

## 2. feature_list.json (Source of Truth)

* [ ] `last_updated` matches today's date (`YYYY-MM-DD`)
* [ ] The feature that was worked on has the correct `status`:

  * If completed and verified: `"passing"`
  * If left partially complete for a valid and documented reason: `"in_progress"` or `"blocked"`
  * NEVER leave it as `not_started` if work was done on it
* [ ] The `evidence` array for the touched feature(s) is **not empty**:

  * Contains executed test commands
  * Contains verification results
  * Contains a timestamp
* [ ] Untouched feature(s) retain their previous state without accidental modifications

## 3. progress.md (Session Memory)

* [ ] The `Current Verified State` section is up to date and truthful:

  * Correct repository root
  * Correct standard startup path
  * Correct standard verification path
  * Current highest-priority unfinished feature points to the correct feature
  * Current blocker is empty or describes the actual blocker
* [ ] There is a `Session Log` entry for every session that existed:

  * Date: current date
  * Goal: concrete
  * Completed: concrete list (not "nothing" or "various")
  * Verification run: what was executed and whether it passed
  * Evidence captured: reference to `feature_list.json`
  * Commits: hashes, if any
  * Known risk or unresolved issue: empty or clearly described
  * Next best step: concrete next action

## 4. Feature Decision Files

* [ ] For **EACH feature touched in this session**, `/agent/state/features/F-<feature-id>.md` exists
* [ ] The file is not empty:

  * Decisions made are documented
  * If approaches were discarded, they are justified
  * If there are open blockers, they are described

## 5. Quality and Rubric

* [ ] `/evaluator-rubric.md` has been read and the work has been self-evaluated
* [ ] The criteria in `/agent/quality-document.md` have been followed (Definition of Done, architectural boundaries, test coverage)
* [ ] There is no commented-out code, leftover `console.log`, or unowned `TODO` that is not documented in the corresponding feature

## 6. Documentation Files

* [ ] If the feature introduced user-visible behavior changes, `/agent/docs/product.md` was updated
* [ ] If the feature introduced architectural changes or boundary changes, `/agent/docs/architecture.md` was updated
* [ ] If the feature introduced new standard routes or commands, `/agent/docs/reliability.md` was updated

## 7. Working Directory

* [ ] `git status` shows **EXACTLY** the files you want to commit:

  * No untracked files that should be in git
  * No changed files unrelated to the current feature (commit separately or revert them)
* [ ] There are no credentials, tokens, `.env` files containing secrets, or sensitive information in the staged changes

## 8. Human In The Loop

* [ ] The work is presentable so that a human can read and understand it **WITHOUT asking you anything**:

  * `progress.md` is self-explanatory
  * `feature_list.json` contains evidence
  * Commit messages will be descriptive
* [ ] If explicit approval is requested, the summary is ready to send to the human without additional editing

---

If **ALL applicable items** are checked [x], the state is safe.

You may proceed with `git add` and `git commit`.
