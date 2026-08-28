# Deliver Ticket Workflow

This reference defines ticket resolution, queue selection, lifecycle transitions, revalidation, and phase ordering for `/deliver-ticket`.

## Input resolution

Resolve input in this order:

1. **Existing explicit ticket path** — if the supplied argument points to a readable ticket under the project ticket source, use it exactly.
2. **Unique ticket number or basename** — resolve values such as `004` or `004-saved-products` only when exactly one ticket matches.
3. **No argument** — run the automatic queue selection algorithm below.
4. **Freeform task** — if the argument does not resolve to an existing ticket, apply the `/ticket` evidence/scope contract, check for equivalent active tickets, then create or reuse the ticket. A newly created ticket uses `source: deliver-ticket`.

If a reference is ambiguous, stop with one concrete question. Do not reinterpret an ambiguous ticket reference as freeform work.

## Canonical lifecycle

Normal path:

```text
ready
  ↓
awaiting-approval
  ↓
in-progress
  ↓
verifying
  ↓
delivered
```

Exceptional states:

- `blocked` — a material unresolved decision or external prerequisite prevents safe progress;
- `failed-verification` — implementation was attempted but required verification remains failed;
- `superseded` — another explicitly identified ticket replaces this one.

`delivered` and `superseded` are terminal queue states.

Allowed exceptional transitions:

- any pre-delivery state → `blocked` when a material unresolved decision prevents continuation;
- `in-progress` or `verifying` → `failed-verification` when required checks fail and cannot be resolved inside approved scope;
- any non-terminal state → `superseded` only when `superseded_by` identifies the replacement;
- `blocked` → `ready` only after the blocker is resolved and current evidence is revalidated;
- `failed-verification` → `awaiting-approval` or `in-progress` only after revalidation determines whether the prior execution approval remains valid.

A material scope, architecture, dependency, migration, authentication, payment, permission, security, deployment, or destructive change invalidates prior execution approval.

## Automatic queue selection

For `/deliver-ticket` with no argument:

1. Inspect `tickets/`.
2. Consider automatically ordered tickets only when their filenames use the repository's numeric-prefix convention, such as `005-search-regression.md`.
3. Sort numeric prefixes descending by numeric value, not modification time or lexicographic timestamp.
4. For each ticket in that order:
   - skip `delivered`;
   - skip `superseded` and follow `superseded_by` only when relevant to explain queue state;
   - skip `blocked` for automatic selection, but remember the newest blocked ticket when it materially explains why higher-numbered work is unavailable;
   - treat `ready`, `awaiting-approval`, `in-progress`, `verifying`, and `failed-verification` as potentially actionable subject to revalidation;
   - classify a legacy/no-status ticket before continuation.
5. Select the first eligible actionable ticket.
6. If no actionable ticket exists, report that the queue has no eligible ticket. Surface the newest blocked ticket only when useful context.

Non-numeric legacy filenames require explicit reference unless the project already defines another deterministic ordering convention.

## Legacy tickets

A selected legacy ticket may lack lifecycle frontmatter.

1. Read the full ticket and current repository/project evidence.
2. If completion is clearly evidenced, report that it appears already delivered. Normalize metadata only when the active permission model authorizes that documentation write.
3. If it is clearly incomplete and otherwise valid, normalize it to:

```yaml
---
ticket_schema: 1
status: ready
source: manual
created: <best supported creation date or current date when normalization rules permit>
---
```

4. If the correct state is ambiguous, stop with one material question.

Do not silently fabricate historical dates or delivery evidence.

## Delivered ticket safeguard

When a user explicitly references a `delivered` ticket:

1. Do not automatically implement it again.
2. Inspect enough current repository/context/verification evidence to determine whether the delivered behaviour still appears present.
3. If the behaviour remains present, report that the ticket is already delivered and stop.
4. If current evidence clearly demonstrates a regression, create a new regression ticket under the normal ticket contract and reference the historical ticket in repository evidence.
5. If ticket metadata and repository evidence conflict and the correct state is unclear, stop and surface the conflict.

Historical delivery evidence is immutable workflow history; regressions become new work rather than silently reopening the old ticket.

## Equivalent-ticket detection

For freeform intake and morning-brief-created work, inspect existing active tickets plus relevant specs/plans before creating a new ticket.

Treat tickets as potentially equivalent when these materially overlap:

- title/user outcome;
- desired behaviour;
- acceptance criteria;
- scope.

If the equivalent ticket is `ready`, `awaiting-approval`, `in-progress`, `verifying`, `blocked`, or `failed-verification`, reuse/reference it.

If it is `superseded`, follow the identified replacement.

If it is `delivered` and current evidence shows a genuine regression or materially distinct problem, create a new ticket referencing the historical one.

## Phase ordering

### Phase 1 — Resolve and inspect

Resolve/create the ticket, read project instructions and context, inspect current code/tests/configuration and Git/worktree state, reconcile lifecycle metadata with repository truth, and stop when a material unresolved product decision blocks safe specification.

### Phase 2 — Specification

Apply `/spec` responsibilities.

- default path: `spec/<ticket-basename>.md`;
- create the spec if absent;
- revalidate it against current repository evidence if present;
- update a stale spec only when the change remains inside the ticket's approved scope and current documentation-write permissions;
- stop if repository evidence requires a material ticket/scope redesign.

When valid, record the spec path in ticket frontmatter.

### Phase 3 — Plan

Apply `/plan` responsibilities.

- default path: `plans/<ticket-basename>.md`;
- create the plan if absent;
- revalidate it against the current spec/repository if present;
- require `RED → GREEN → REFACTOR → VERIFY` for each normally testable vertical slice;
- return to the spec phase if planning exposes a material flaw in the technical contract.

When valid, record the plan path in ticket frontmatter.

### Phase 4 — Await approval

Render the consolidated contract from `execution-review.md`. When documentation writes are permitted, set `status: awaiting-approval`.

Stop for the project's required approval phrase. When none is stronger, use `Approve plan`.

Do not treat ticket/spec/plan existence or status as approval.

### Phase 5 — Revalidate before runtime edits

After approval:

1. inspect Git/worktree state again;
2. re-read relevant current files/tests;
3. confirm the ticket, spec, plan, and approved execution contract still match reality;
4. preserve unrelated/uncommitted work;
5. invalidate approval and stop if a material difference appears.

Only after successful revalidation set `status: in-progress` and begin runtime/application edits.

### Phase 6 — Execute TDD slices

Delegate to `/implement-plan` semantics. For each testable slice:

```text
RED → GREEN → REFACTOR → VERIFY
```

RED must fail for the intended missing behaviour. GREEN is the minimum production change. REFACTOR adds no unrequested behaviour. VERIFY runs targeted regression checks before the next slice.

### Phase 7 — Final verification

After planned slices complete, set `status: verifying` when lifecycle writes are permitted.

Run applicable project checks: targeted/broader tests, lint, type-check, build, browser flows, loading/empty/error/success states, console/network checks, accessibility, or strongest available manual verification.

Report every check as `Passed`, `Failed`, or `Not run` with concise evidence/reason.

### Phase 8 — Review

Review the final diff against ticket, spec, plan, `roadmap.md`, and `review.md`.

Classify findings:

- `Must fix` — blocks completion or creates material risk;
- `Should fix` — important but non-blocking for the ticket outcome;
- `Okay to ship` — verified and within approved scope.

Resolve all in-scope `Must fix` findings. Material fixes require a revised execution contract and renewed approval.

### Phase 9 — Synchronize and deliver

After successful verification/review:

1. synchronize only project truth documents whose truth actually changed;
2. update acceptance-criteria checkboxes only where proven;
3. write concise `## Delivery Evidence`;
4. record spec/plan paths;
5. set `delivered_at`;
6. set `status: delivered` only after all previous steps succeed.

If required verification remains failed, set `status: failed-verification` instead.

## Interrupted sessions

Never resume runtime edits solely because a ticket says `in-progress` or `verifying`.

Revalidate:

- active workspace/repository;
- Git/worktree state;
- ticket/spec/plan contents;
- current code/tests;
- prior execution contract;
- whether approval is still valid under project rules.

If validity cannot be established, return to `awaiting-approval` behaviour and require a fresh execution contract approval.

## Repository truth rule

Ticket metadata is the durable queue index. It is not stronger than observed repository or verification evidence.

Planning artifacts are never implementation evidence. When ticket metadata materially conflicts with repository evidence and the correct state cannot be proven, stop instead of silently changing lifecycle history.
