---
ticket_schema: 1
status: ready
---

# 006 — Sequence drafting, approval, and outreach release

## Outcome
NVIDIA drafts a 2–3 step campaign sequence, the owner can edit it, explicit approval locks a version, and only approved eligible prospects may be released through Hunter.

## Acceptance criteria
- Sequence draft uses configured vertical/campaign context and validates 2–3 steps.
- User can edit subject/body/delay before approval.
- Approval stores approved version/time and eligible batch state.
- Material copy changes after approval set REAPPROVAL_REQUIRED.
- No prospect is released before campaign approval.
- Release rechecks suppression, policy, contact verification, and relationship state immediately before provider action.
- Hunter sequence/recipient operations remain adapter-owned; live outbound execution is disabled in test/safe implementation mode.
- Tests prove approval and deterministic release gates cannot be bypassed.
