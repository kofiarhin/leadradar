# Project Operating Guide

## Product

Summarize the product, customer, problem, promise, and current goal from supported project evidence.

## Workspace health and synchronization

Use `/workspace-health` when durable project truth may have drifted from repository, Git, GitHub, or verification evidence. It is strictly read-only and reports blockers, truth drift, lifecycle drift, verification debt, artifact-link integrity, and manifest integrity. It may recommend a repair, but it never edits files or external state.

Use `/sync-project` when supported evidence shows that durable project truth or lifecycle documentation must catch up after work happened outside the normal delivery flow. It may update only approved operating documents/ticket lifecycle evidence and must preserve runtime code, specs/plans, dependencies/data, Git state, and external systems. Unless stronger project rules grant a narrow sync permission, it presents the exact documentation change plan and waits for `Approve sync` before writing.

## Operator workflow

Use `/morning-brief` to reconcile project truth, identify the single highest-leverage next outcome, and maintain the ticket queue.

The morning brief may inspect current project context, repository and available GitHub state, roadmap priorities, verification evidence, existing tickets/specs/plans, and real customer signals. It may identify truth drift, verification debt, and risks.

Its only write permission is creating at most one evidence-backed ticket under `tickets/` when no equivalent active ticket exists and no material decision blocks safe scoping. A created ticket must satisfy the normal `/ticket` contract and start with `status: ready` and `source: morning-brief`.

If an equivalent active ticket exists, reuse/reference it. If a material decision is unresolved or evidence is insufficient, create no ticket. The morning brief must not implement code, create specs or plans, modify GitHub state, change dependencies/data, commit, push, merge, deploy, or activate routines.

## Software delivery workflow

Use `/deliver-ticket` as the default end-to-end delivery command.

```text
/workspace-health   # optional read-only audit when state may be stale
      ↓
/sync-project       # optional approved repair of documentation/lifecycle drift
      ↓
/morning-brief
      ↓
create/reuse one ready ticket
      ↓
/deliver-ticket
      ↓
spec → TDD plan → consolidated execution review
      ↓
explicit approval
      ↓
RED → GREEN → REFACTOR → VERIFY
      ↓
final verification → review → project truth sync
      ↓
status: delivered
      ↓
/publish-ticket     # optional, separate explicit approval
      ↓
commit if needed → push non-main branch → draft PR
```

`/deliver-ticket` may also be called with an explicit ticket path, a unique ticket number/basename, or a freeform task. With no argument it selects the highest-numbered eligible unfinished numeric ticket. It skips delivered/superseded tickets and revalidates interrupted work before continuation.

Runtime implementation begins only after the consolidated execution contract receives the approval phrase required by project instructions. Material changes invalidate prior approval.

`/publish-ticket` is a separate post-delivery boundary. The ticket must already be delivered. It presents the exact branch/base/files-or-commits/commit-message/push/draft-PR contract and requires explicit publication approval before Git/GitHub writes. It never force-pushes, merges, deploys, releases, or mutates production state.

For step-by-step/manual delivery control, the lower-level commands remain available:

```text
/ticket → /spec → /plan → /implement-plan
```

- `/ticket` defines what should change and why.
- `/spec` defines the technical contract.
- `/plan` defines the implementation order.
- `/implement-plan` executes an approved plan, verifies it, reviews it, and synchronizes project/ticket truth from observed evidence.

## Ticket lifecycle

Canonical states are:

- `ready`
- `awaiting-approval`
- `in-progress`
- `verifying`
- `delivered`
- `blocked`
- `failed-verification`
- `superseded`

`delivered` and `superseded` are terminal historical states. A delivered ticket is not silently reopened; a later regression becomes a new ticket referencing the historical work.

`delivered` means the ticket outcome was implemented, acceptance criteria were evidenced, required verification/review completed, and project truth was synchronized. It does not mean committed, pushed, merged, deployed, or released.

## Working rules

- Read the product source, roadmap, review standard, relevant context, lessons, and current repository evidence before changing work.
- Keep one ticket to one outcome and one reviewable change.
- Use `/workspace-health` for diagnosis instead of silently repairing contradictory state.
- Use `/sync-project` only for evidence-backed operating-document/lifecycle reconciliation, never as a shortcut around delivery approval.
- Keep morning-brief intake, ticket, spec, plan, implementation, and publication responsibilities separate even when commands orchestrate multiple stages.
- Preserve unrelated work and existing project conventions.
- Distinguish proposed, specified, planned, awaiting-approval, in-progress, implemented, verifying, verified, delivered, committed, pushed, merged, deployed, and released states when relevant.
- Prefer TDD for implementation: RED → GREEN → REFACTOR → VERIFY.
- Never treat a morning brief, ticket, specification, plan, commit, push, or PR as implementation/verification evidence by itself.
- Add lessons only when they are repository-specific and supported by observed work.
- Repository/verification evidence outranks stale lifecycle metadata when completion is evaluated.

## Permissions

Define safe/read-only, approval-required, and human-owned actions for this project. Material scope, dependency, migration, authentication, payment, permission, security, deployment, or destructive changes require the appropriate human decision.

`/workspace-health` is read-only. `/sync-project` is documentation/lifecycle-only and approval-gated unless the project explicitly grants a narrow sync write. `/morning-brief` has one narrow write permission: create one queued ticket. `/deliver-ticket` may create/update ticket/spec/plan documentation to reach execution review when project rules allow, but runtime changes require explicit execution approval. `/publish-ticket` requires a separate publish approval for scoped commit/push/draft-PR actions. Merge, deploy, destructive data operations, billing/customer-data decisions, and security-policy decisions are not implied by delivery or publication.

## Document alignment

After verified implementation, update only documents whose truth actually changed: current state, architecture, confirmed decisions, roadmap status, concise lessons, and lifecycle-aware source-ticket acceptance/evidence/status.

## Completion

Define the evidence required before work may be described as implemented, verified, delivered, committed, pushed, merged, deployed, or released. Do not collapse these states into one another.
