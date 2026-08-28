---
name: spec
description: Turn a shared-understanding-ready implementation ticket into a repository-grounded technical specification that defines how the requested behaviour should fit the existing system without implementing it.
---

# Spec

Create the technical contract for one ticket and save it under `spec/` only when the ticket is ready for technical design.

## Required input

Require an explicit ticket path or one clearly selected ticket.

A current-contract `status: ready` ticket should already contain sufficient shared understanding and no known material intake question. Stop when the source ticket is missing, unreadable, `blocked`, materially ambiguous, or contains a material unresolved product decision.

If a legacy ticket is marked `ready` but still contains a material user-owned intake question, treat that as lifecycle drift: do not guess and do not continue as though the ticket were clean. Return to `/ticket` shared-understanding intake to reconcile the decision first.

## Context to read

1. Read the complete source ticket, including `## Shared Understanding` and `## Open Questions` when present.
2. Read `AGENTS.md`, `CLAUDE.md`, `review.md`, relevant `context/*.md`, and `context/lessons.md`.
3. Inspect the relevant application code, data models, APIs, components, configuration, and tests deeply enough to understand the existing architecture and conventions.
4. Inspect related specs when they establish a current contract or prevent duplication.

## Spec responsibility

The spec defines **the technical solution** for the ticket. It must remain inside the ticket's confirmed scope and must not reopen user decisions already settled during `/ticket` intake unless new repository evidence creates a genuine material conflict.

Use [references/spec-format.md](references/spec-format.md).

Distinguish:

- **Existing:** confirmed repository behaviour.
- **Required:** behaviour demanded by the ticket.
- **Proposed:** the smallest clean technical approach not already established as fact.

Technical choices that can be resolved from repository evidence and established conventions are the spec's responsibility. Do not ask the user to choose file names, ordinary implementation patterns, or other technical details that can be decided safely from the codebase.

A spec that is returned as ready for `/plan` must have `Open Technical Questions: None`.

## New material decisions discovered during specification

If repository inspection reveals a genuinely new material user-owned decision that could change ticket scope, acceptance criteria, environment/data, security/permissions, architecture constraints, dependency/migration permission, or verification requirements:

1. stop specification;
2. report the observed evidence and the exact decision;
3. return the workflow to `/ticket` shared-understanding intake;
4. do not silently redesign the ticket;
5. do not publish a spec as plan-ready while that decision remains unresolved.

If the issue is purely technical and can be resolved from repository evidence, make and clearly label the smallest justified technical proposal instead of escalating a question unnecessarily.

## Conflict handling

If repository evidence shows that the ticket cannot be implemented as written without materially changing scope, architecture, dependencies, migrations, authentication, payments, permissions, or security posture, stop and report the conflict instead of redesigning the ticket silently.

## Output

When specification succeeds, save under `spec/` using the same basename as the ticket when possible, for example `spec/004-saved-products.md`.

Return the saved path, the core technical approach, and confirm that no blocking technical question remains for `/plan`.

When blocked by a new material user decision, return the blocker and the required return to `/ticket`; do not present the spec as ready for planning.

Do not modify runtime code while generating the specification.
