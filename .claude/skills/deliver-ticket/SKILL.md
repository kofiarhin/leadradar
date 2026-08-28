---
name: deliver-ticket
description: Orchestrate one ticket from queue resolution or freeform intake through bounded shared-understanding ticketing, repository-grounded spec and TDD plan generation, one explicit execution approval gate, implementation, verification, review, project-truth synchronization, and evidence-backed delivery status.
---

# Deliver Ticket

Take one ticket through the complete software-delivery lifecycle while preserving the responsibilities of `/ticket`, `/spec`, `/plan`, and `/implement-plan`.

This skill is an orchestrator. Do not replace or silently weaken the contracts of those lower-level skills.

## Supported input

Resolve input using [references/workflow.md](references/workflow.md) in this precedence:

1. an existing explicit ticket path;
2. a unique ticket number or basename;
3. no argument → select the highest-numbered eligible unfinished numeric ticket;
4. otherwise treat the argument as a freeform task, apply the complete `/ticket` rules including the bounded shared-understanding Grill, prevent duplicates, reuse an equivalent ticket without changing its provenance, or create a new ticket with `source: deliver-ticket`.

Ambiguous ticket references stop for one concrete resolution question. Never guess between multiple tickets.

Freeform product/task ambiguity is different: use the `/ticket` shared-understanding Grill, which asks one material decision at a time with `Question`, `Recommended answer`, and `Why`, up to the default three-question cap. Do not proceed to `/spec` until the resulting ticket is genuinely `ready`.

## Context to read

Before planning or resuming work:

1. Read the complete source ticket, including `## Shared Understanding` and `## Open Questions` when present.
2. Read `AGENTS.md`, `CLAUDE.md`, `roadmap.md`, `review.md`, and relevant `context/*.md`, including `context/lessons.md`, when present.
3. Inspect relevant current code, tests, configuration, Git/worktree state, and available verification evidence.
4. Inspect related tickets/specs/plans to prevent duplicate or conflicting work.
5. Reconcile ticket metadata with current repository evidence. Repository/verification evidence is authoritative when lifecycle status is evaluated.

Preserve unrelated and uncommitted work. Stop when project-specific safety rules are violated.

## Delivery phases

Follow the detailed state machine and selection rules in [references/workflow.md](references/workflow.md).

### 1. Resolve, Grill when needed, and inspect

Resolve or create the source ticket and classify legacy state when needed.

For freeform intake, apply `/ticket` completely before specification. A newly created `status: ready` ticket must have no known material intake question remaining.

If an existing or legacy ticket is `blocked`, or is marked `ready` while still carrying a material unresolved product decision, stop before `/spec`. Do not treat lifecycle metadata as proof of shared understanding when the ticket content contradicts it; return to `/ticket` intake/reconciliation instead.

### 2. Generate or revalidate the spec

Apply the installed `/spec` contract. Use `spec/<ticket-basename>.md` by default. Revalidate an existing spec against current repository evidence before reuse. Record the valid spec path in ticket metadata.

A spec returned as ready for planning must not carry a blocking technical question. If specification discovers a new material user-owned decision, return to `/ticket`; if it discovers a material technical contract flaw, resolve it in `/spec` rather than passing ambiguity onward.

If repository evidence requires a material ticket/scope change, stop instead of silently redesigning the ticket.

### 3. Generate or revalidate the plan

Apply the installed `/plan` contract. Use `plans/<ticket-basename>.md` by default. Revalidate an existing plan against the spec and current repository before reuse. Record the valid plan path in ticket metadata.

If planning reveals a material user decision, return to `/ticket`. If planning reveals a material flaw in the spec, return to `/spec`. Do not hide either inside implementation steps.

### 4. Present one execution contract

Use [references/execution-review.md](references/execution-review.md) to present one consolidated review containing the goal, scope, exclusions, technical approach, affected areas, TDD slices, material checkpoints, verification, risks/assumptions, human-review items, and explicitly excluded external actions.

When project rules permit the documentation write, set the ticket to `status: awaiting-approval`.

Then stop. Runtime/application implementation requires the explicit approval phrase defined by project instructions; when none is stronger, require:

```text
Approve plan
```

A ticket, spec, plan, or `awaiting-approval` status never implies approval.

### 5. Revalidate approval

After approval and immediately before runtime edits, re-read Git/worktree state and relevant repository evidence. Confirm the ticket, spec, plan, and approved execution contract still match reality.

Any material scope, architecture, dependency, migration, authentication, payment, permission, security, deployment, or destructive change invalidates approval. Present a revised contract and require approval again.

Only after successful revalidation may the ticket move to `status: in-progress`.

### 6. Implement

Delegate execution semantics to `/implement-plan` and execute every testable vertical slice:

```text
RED → GREEN → REFACTOR → VERIFY
```

Do not batch the whole feature before verifying slices.

### 7. Final verification and review

After planned slices complete, move a lifecycle-aware ticket to `status: verifying` and run the relevant checks actually available. Report each as `Passed`, `Failed`, or `Not run`.

Review the final diff against the ticket, spec, plan, `roadmap.md`, and `review.md` using `Must fix`, `Should fix`, and `Okay to ship`.

Resolve in-scope `Must fix` findings. A material fix reopens approval.

### 8. Synchronize and deliver

Use the `/implement-plan` ticket-synchronization contract and [references/completion-report.md](references/completion-report.md).

A ticket becomes `delivered` only after acceptance criteria are evidenced, required verification/review succeeds, project truth is synchronized, and no in-scope `Must fix` remains. Failed required verification results in `failed-verification`, not `delivered`.

## Permission boundary

Invoking `/deliver-ticket` requests the ticket/spec/plan documentation work needed to reach the execution review when higher-priority project rules allow those writes. Higher-priority approval gates still win.

The default delivery contract does not imply authorization for:

- unapproved dependency or migration changes;
- authentication/payment/security-policy changes outside the approved contract;
- commits unless project rules explicitly include them;
- pushes or pull requests;
- merges;
- deployments/releases;
- destructive data/application operations;
- live billing/customer-data decisions.

Never claim an external action occurred unless it was actually performed and verified.
