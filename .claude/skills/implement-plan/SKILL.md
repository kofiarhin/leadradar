---
name: implement-plan
description: Execute an approved implementation plan against the current repository using a strict RED → GREEN → REFACTOR → VERIFY loop, then review the work and keep project context, lessons, and lifecycle-aware source-ticket evidence aligned with verified reality.
---

# Implement Plan

Execute one approved plan. This is the state-changing boundary of the delivery workflow.

## Required input and approval

Require an explicit plan path or one clearly selected plan. Read its source spec and ticket. Do not infer implementation approval merely because a plan file exists. Require the approval model defined by `AGENTS.md` or higher-priority project instructions before changing code; when no project-specific gate exists, present a concise execution summary and wait for explicit approval.

When the plan is executed through `/deliver-ticket`, use the already approved consolidated execution contract only after revalidating it against current repository state. Standalone `/implement-plan` remains supported.

## Revalidate before editing

1. Read `AGENTS.md`, `CLAUDE.md`, `review.md`, the plan, source spec, source ticket, and relevant `context/*.md`, including `context/lessons.md`.
2. Inspect Git/worktree state and relevant current code/tests.
3. Confirm the plan still matches the repository.
4. Stop for renewed approval when current evidence introduces a material scope, architecture, dependency, migration, authentication, payment, permission, security, deployment, or destructive change not covered by the approved plan.
5. Preserve unrelated and uncommitted work.

For a lifecycle-aware source ticket, reconcile its status with repository evidence before editing. Ticket metadata is a durable queue record, not stronger evidence than the current repository.

Only after implementation approval and successful revalidation may a lifecycle-aware source ticket move to `status: in-progress`.

## TDD execution

Follow [references/tdd-cycle.md](references/tdd-cycle.md) for every testable slice.

Execute one slice at a time:

```text
RED → GREEN → REFACTOR → VERIFY
```

Do not batch all tests first and then implement the entire feature.

For each slice, preserve evidence of:

- RED failing for the intended missing behaviour;
- GREEN passing after the minimum production change;
- REFACTOR preserving green behaviour without adding unrequested scope;
- VERIFY covering the targeted regression surface.

## Final verification

After all planned slices are complete, move a lifecycle-aware source ticket to `status: verifying` when project rules permit the documentation write.

Then:

- run the project's relevant automated checks actually available for the changed areas;
- run lint/type-check/build when configured and relevant;
- for user-facing work, inspect the real flow at relevant desktop and mobile widths when browser tooling is available;
- check relevant loading, empty, error, success, console, network, and accessibility states;
- report every unavailable check as `Not run`, never as passed.

A required check that fails and remains unresolved prevents delivery. Record `status: failed-verification` on a lifecycle-aware ticket when that failure cannot be resolved inside the approved scope.

## Review

Review the final diff against the ticket, spec, plan, `roadmap.md`, and `review.md`. Classify findings as:

- `Must fix`: blocks completion or creates material risk;
- `Should fix`: important but does not block the stated outcome;
- `Okay to ship`: verified and within scope.

Resolve in-scope `Must fix` findings before describing the implementation as complete. A fix that materially changes approved scope must stop for renewed approval.

## Keep project memory aligned

After verification and review, update only documents whose truth actually changed:

- `context/current-state.md`: reflect implemented and verified state from observed evidence;
- `context/architecture.md`: update only when architecture actually changed;
- `context/decisions.md`: record only decisions that were explicitly confirmed during the work;
- `roadmap.md`: mark an outcome complete only when its completion evidence is satisfied;
- `context/lessons.md`: add concise repository-specific lessons learned from actual implementation, test failures, debugging, or review.

Do not add generic advice to `context/lessons.md`. Do not create a lesson merely because the plan predicted something. If no useful repository-specific lesson was learned, leave the file unchanged.

## Keep the source ticket aligned

When the source ticket uses lifecycle metadata, or when execution is being coordinated by `/deliver-ticket`, synchronize the ticket from observed evidence after project-truth updates.

Preserve the ticket's original request, problem, user outcome, scope, exclusions, requirements, and history.

Required synchronization:

1. update acceptance-criteria checkboxes only when the implemented/verified result proves them;
2. record the source spec and plan paths in frontmatter when known;
3. add or update a concise `## Delivery Evidence` section containing:
   - implementation result;
   - acceptance-criteria result;
   - automated checks as `Passed`, `Failed`, or `Not run` with concise evidence/reason;
   - browser/manual verification when relevant;
   - review result including remaining `Should fix` and human-review items;
   - spec and plan paths;
   - external actions not actually performed when relevant;
4. set `status: failed-verification` when required verification remains failed;
5. set `delivered_at` and `status: delivered` only after:
   - acceptance criteria are supported by observed evidence;
   - required verification is satisfied, or an unavailable check is explicitly `Not run` only where the ticket/plan allows that limitation;
   - no in-scope `Must fix` remains;
   - applicable project truth documents have been synchronized;
   - delivery evidence has been written successfully.

Never mark a ticket `delivered` merely because code was edited, a plan was followed, a test subset passed, or a commit/push/pull request exists.

`delivered` remains distinct from committed, pushed, merged, deployed, and released.

For a legacy source ticket with no lifecycle metadata, preserve standalone `/implement-plan` compatibility. Normalize lifecycle metadata only when the active workflow/project permission model authorizes that documentation change and the ticket state can be established from evidence; otherwise report the legacy state without inventing metadata.

## Completion report

Report:

- plan executed;
- source ticket, spec, and plan;
- affected files;
- RED/GREEN/REFACTOR/VERIFY evidence by slice;
- final checks as `Passed`, `Failed`, or `Not run`, including commands/results when available;
- review findings;
- synchronized project documents;
- source-ticket status/evidence changes when applicable;
- lessons added, if any;
- unresolved and human-review items;
- external actions explicitly not performed.

Never claim commit, push, pull request, merge, deployment, release, or other external actions occurred unless they were actually performed and verified.
