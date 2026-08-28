# LeadRadar AI Software Delivery Operating Guide

## Product

LeadRadar is a reusable B2B prospecting application that turns public LinkedIn post engagement into a focused list of potential prospects who are strong candidates to contact and move toward booking a call.

Product authority: `docs/PRD.md`.
Technical authority for V1: `docs/SPEC.md`.

V1 is a single-owner application initially configured for AI automation/software agencies. The product optimizes for qualified commercial conversations and call-ready opportunities rather than scrape volume, email volume, or generic contact counts.

## Current repository state

LeadRadar is currently specification-only. `docs/PRD.md` and `docs/SPEC.md` exist; application/runtime implementation has not started. Never describe specified or planned behaviour as implemented or verified without repository evidence.

## Working style

- Read `docs/PRD.md`, `docs/SPEC.md`, `roadmap.md`, `review.md`, and relevant `context/*.md` before consequential work.
- Preserve the distinction between product intent and current implementation truth.
- Keep one ticket to one outcome, one visible finish line, and one reviewable change.
- Prefer the smallest complete vertical slice.
- Follow the existing V1 stack and modular-monolith/provider-adapter boundaries unless an approved ticket explicitly changes them.
- Use TDD for testable implementation: RED → GREEN → REFACTOR → VERIFY.
- Preserve unrelated user changes and never overwrite or discard them.
- Use `.env` for secrets and never expose credentials, tokens, session material, or provider secrets.
- Report checks only as `Passed`, `Failed`, or `Not run` based on observed evidence.

## Product safety invariants

These V1 requirements are material boundaries, not implementation suggestions:

- Human approval is required before outbound campaign sending begins.
- Human approval/editing is required before AI-drafted conversational replies are sent.
- Any genuine prospect reply pauses automated follow-ups deterministically before AI classification.
- Suppression, verification eligibility, authentication, policy enforcement, and reply pausing must not depend on AI judgment.
- NVIDIA AI may support qualification, reply classification, and drafting, but it must not override deterministic `BLOCKED` policy decisions.
- Only acceptable verified business email addresses may proceed automatically to outreach.
- Unknown or insufficient outreach-policy information defaults to `REVIEW`, not `ALLOWED`.
- No LinkedIn credentials, passwords, session cookies, or authenticated LinkedIn session management are part of V1.
- Provider integrations remain replaceable adapters; LeadRadar owns durable prospect, signal, conversation, opportunity, policy, suppression, job, and integration-event truth.

## Architecture guardrails

V1 uses a modular monolith with:

- React + Vite + TypeScript + Tailwind CSS;
- Node.js + Express;
- MongoDB / Mongoose;
- a single root `package.json` using npm workspaces;
- separate web and worker process types;
- MongoDB-backed asynchronous jobs;
- provider adapters for Apify, NVIDIA, and Hunter;
- MongoDB Atlas as the application data store;
- Heroku as the specified V1 runtime target.

Domain modules own business behaviour. Provider-specific details stay behind provider adapters.

Exact provider endpoints, NVIDIA model identifiers, and Apify Actor identifiers must be revalidated at implementation time. A provider limitation must fail clearly or trigger an approved adapter change; it must not silently weaken locked product behaviour.

## Operating workflow

Use `/workspace-health` for a read-only audit when project truth, lifecycle state, verification evidence, artifact links, or manifest integrity may have drifted.

Use `/sync-project` only for evidence-backed operating-document/lifecycle reconciliation. Unless a stricter project rule applies, it must present the exact write set and wait for `Approve sync`.

Use `/morning-brief` for orientation, prioritization, and safe queue intake. It may create or reuse at most one evidence-backed `status: ready` ticket and never implements it.

Use `/deliver-ticket` as the default delivery path:

```text
/morning-brief
      ↓
create/reuse one ready ticket
      ↓
/deliver-ticket
      ↓
ticket → spec → TDD plan → execution contract
      ↓
Approve plan
      ↓
RED → GREEN → REFACTOR → VERIFY
      ↓
final verification → review → project truth sync
      ↓
status: delivered
```

For manual stage-by-stage control use:

```text
/ticket → /spec → /plan → /implement-plan
```

After a ticket is already `delivered`, use `/publish-ticket` only when GitHub publication is explicitly wanted. Unless stricter rules apply, wait for `Approve publish` before creating a scoped commit when needed, pushing the approved non-main branch without force, and creating one draft PR.

## Approval boundaries

Safe/read-only without a new execution approval:

- inspect repository/docs/history;
- run `/workspace-health`;
- analyze product/specification evidence;
- propose plans and verification;
- read current Git/GitHub state.

Approval required:

- runtime/application edits;
- dependency or lockfile changes;
- database schema/migration changes;
- authentication/session changes;
- outreach-policy or suppression-rule changes;
- provider integration behaviour changes;
- destructive file/data operations;
- Git commit/push/draft-PR publication.

Runtime execution requires the approved execution contract and `Approve plan` when no stricter phrase exists. Material changes to scope, architecture, dependencies, migrations, authentication, payments, permissions, security/privacy, external services, destructive behaviour, acceptance criteria, or verification invalidate prior approval.

GitHub publication is a separate approval boundary and uses `Approve publish` when no stricter phrase exists.

Human-owned unless separately and explicitly authorized outside the default workflow:

- merge;
- production deployment/release;
- destructive production data operations;
- live billing/customer-data decisions;
- security-policy decisions and credential sharing.

## Ticket lifecycle

Canonical states:

- `ready`
- `awaiting-approval`
- `in-progress`
- `verifying`
- `delivered`
- `blocked`
- `failed-verification`
- `superseded`

`delivered` means implemented + acceptance-evidenced + required verification/review complete + project truth synchronized. It does not mean committed, pushed, merged, deployed, or released.

## Verification

For implementation, run the relevant available tests plus lint/type-check/build where configured. For user-facing work, inspect the real flow at desktop and mobile widths when browser tooling is available, including loading, empty, validation/error, success, console, network, keyboard, and accessibility states.

Review against `review.md` and classify findings as `Must fix`, `Should fix`, or `Okay to ship`.

## Project memory

After verified work, update only documents whose truth actually changed:

- `context/current-state.md`;
- `context/architecture.md` when architecture actually changed;
- `context/decisions.md` for confirmed decisions only;
- `roadmap.md` when completion/priority evidence changed;
- `context/lessons.md` for concise repository-specific lessons actually learned;
- lifecycle-aware source ticket evidence/status.

Repository and verification evidence outrank stale planning/lifecycle metadata.
