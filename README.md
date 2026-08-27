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

👉 **[AGENTS.md](./AGENTS.md)** 👈


--- 
Following steps are only for human, not agent:

## Steps to begin with an empty repository:

1. Use the skill `/bootstrap` to scaffold the technical setup, this skill will assist you on:
    - Questionnaire about:
        - Name of project
        - Description of project
        - Target audience of project
        - Technical stack of project
        - Testing scope of project
        - Verification scope of project
        - Verification tools of project
    - Then it will scaffold the initial version of:
        - `product.md`
        - `architecture.md`
        - `reliability.md`
        - `feature_list.json`
        - `init.sh` and `check-architecture.sh`
        - `e2e-check.sh`
        - `./src`
    - The skill will automatically ensure the setup is verified.

2. Use the skill `/feature-planner` to plan the first (and consecutive) features of the product.

3. Use the skill `/implementor` to implement the features of the product.

4. Go to step 2 and repeat the implementing loop.