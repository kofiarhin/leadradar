---
name: ticket
description: Turn a roadmap outcome, bug report, idea, or product request into one evidence-backed implementation ticket with durable lifecycle metadata, using a bounded shared-understanding Grill to resolve material user-owned decisions before a ready ticket is written.
---

# Ticket

Create one clear assignment with a visible finish line and save it under `tickets/` only after the request is understood well enough for specification without known material product ambiguity.

## Input

Accept a user request, bug report, roadmap item, customer problem, or equivalent description. If no request is supplied, use the first clearly incomplete roadmap outcome only when it is unambiguous.

Do not ask the user for facts that can be established from repository or project evidence. Resolve facts first, then use the bounded shared-understanding Grill only for decisions the user actually owns.

## Context to read

Before asking questions or writing the ticket:

1. Read `AGENTS.md` and `CLAUDE.md` when present.
2. Read `roadmap.md`, `review.md`, `context/product.md`, `context/current-state.md`, and `context/lessons.md` when present.
3. Read relevant architecture/decision/customer evidence when it materially affects the request.
4. Inspect relevant repository code and tests enough to describe current behaviour accurately.
5. Inspect active files under `tickets/`, `spec/`, and `plans/` to avoid duplicate or conflicting work.

Repository evidence overrides assumptions. Do not invent implementation status, customer evidence, or technical constraints.

## Shared-understanding Grill

Before creating a new ticket, apply [references/shared-understanding-grill.md](references/shared-understanding-grill.md).

The Grill is an intake layer adapted from Matt Pocock's `grilling` model: map the material decision tree, resolve repository facts yourself, and ask only the user-owned decisions needed to make the ticket safe and specific.

Key rules:

- Ask exactly one material question at a time.
- Use exactly this visible structure:

```text
Question
<one material question>

Recommended answer
<one concrete recommendation>

Why
<why this recommendation best fits the observed evidence and goal>
```

- Ask no more than three Grill questions by default.
- Stop early as soon as shared understanding is sufficient.
- Ask only questions whose answers can materially change scope, acceptance criteria, environment/data, security/permissions, architecture constraints, dependencies/migrations, or verification requirements.
- Minor technical choices belong to `/spec`; preference questions that do not change the outcome are not Grill questions.
- After every user answer, recompute what remains materially ambiguous before asking another question.
- A `ready` ticket must have no known material user-owned question left unresolved.

If the three-question limit is reached and a material decision still blocks safe specification, do not guess and do not create a misleading `ready` ticket. A durable ticket may be written as `status: blocked` with the exact unresolved decision and `blocked_reason`; otherwise stop and report the blocker.

## Ticket responsibility

A ticket defines **what should change and why**. It should not prescribe a new architecture, endpoint shape, class list, component tree, or implementation sequence unless those are already established repository facts or explicit requirements.

Use [references/ticket-format.md](references/ticket-format.md).

Capture confirmed Grill decisions concisely in `## Shared Understanding` and in the relevant scope, requirements, constraints, dependencies, and acceptance criteria. Do not preserve a full interview transcript.

## Scope and duplicate rules

- One ticket = one outcome = one reviewable change.
- Split oversized requests into ordered proposed tickets instead of creating one giant assignment.
- Make the finish line observable through acceptance criteria.
- Separate scope from out-of-scope work.
- Never create `status: ready` while a known material question remains unresolved.
- Do not create a duplicate when an existing active ticket materially covers the same outcome. Reuse/reference the existing ticket instead.
- If an equivalent legacy ticket is marked `ready` but contains a material unresolved question, do not treat that status as proof of readiness; surface the inconsistency and reconcile the ticket before `/spec`.
- A delivered historical ticket is not reopened silently. If current evidence shows a regression or materially new problem, create a new ticket that references the prior outcome.

## Lifecycle contract

Every newly created ticket uses `ticket_schema: 1`.

A new ticket uses `status: ready` only after it is scoped, unblocked, and the bounded Grill has reached shared understanding. If the Grill cap is exhausted with a material unresolved decision and a durable record is written, use `status: blocked` and record the exact blocker.

Canonical statuses:

- `ready` — scoped, unblocked, no known material intake question remains, waiting for delivery;
- `awaiting-approval` — spec and plan are valid and the execution contract is waiting for explicit approval;
- `in-progress` — approved runtime/application implementation has started;
- `verifying` — implementation slices are complete and final verification/review is underway;
- `delivered` — acceptance criteria, required verification, review, and project-truth synchronization are complete from observed evidence;
- `blocked` — a material unresolved decision or prerequisite prevents safe progress;
- `failed-verification` — implementation was attempted but required verification remains failed;
- `superseded` — the ticket was intentionally replaced by another identified ticket.

`delivered` and `superseded` are terminal queue states. Delivery status must never be treated as equivalent to committed, pushed, merged, deployed, or released.

Allowed `source` values:

- `manual` for direct `/ticket` creation;
- `morning-brief` when created by `/morning-brief`;
- `deliver-ticket` when created from freeform `/deliver-ticket` input.

When `/ticket` is invoked directly, use `source: manual`. When another approved workflow delegates ticket creation, preserve the caller-specific source value and the same shared-understanding invariant.

Only implementation/delivery workflows may mark acceptance criteria complete or write `## Delivery Evidence`, and only from observed evidence.

## Output

After shared understanding is reached, save the ticket under `tickets/` using the project's existing naming convention. Otherwise use the next available zero-padded numeric prefix plus a concise slug, such as `004-saved-products.md`.

For a successful `ready` ticket, return the saved path, lifecycle status, a one-line outcome, and confirm that no known material intake question remains.

For a blocked outcome, return the blocker and whether a `status: blocked` ticket was written. Never tell `/spec` to proceed until the blocker is resolved.

Do not implement code, generate the technical spec, create an implementation plan, or change dependencies while creating the ticket.
