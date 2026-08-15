# Local AI Execution Contract

Read `AGENTS.md`, `docs/SITE_DESIGN_PRINCIPLES.md`, `docs/ARCHITECTURE.md`, `docs/CONTENT_MODEL.md`, and the implementation plan before changing code.

Execute Phase 0–6 continuously. Each phase must implement, verify, repair, inspect the diff, update the temporary implementation state, and commit before entering the next phase. Do not ask for phase-by-phase confirmation.

For the same root cause, make at most three materially different repair attempts. Never weaken tests, delete assertions, skip failures, disable privacy checks, or change product semantics to obtain a green CI result. Stop only for an environment blocker, missing external credential, unapproved private-public decision, or irreversible data risk.

Use available UI review, browser verification, Playwright E2E, code review, debugging, and official-document verification skills when present. These tools are implementation aids, not website architecture dependencies.

Before production merge or deployment, check the current authorization level. Feature branch, commits, push, and Preview are authorized by default; merge to `main` and Production require explicit authorization.
