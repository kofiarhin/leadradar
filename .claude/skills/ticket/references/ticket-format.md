# Ticket Format

Use the smallest complete version of this structure.

```md
---
ticket_schema: 1
status: ready
source: manual
created: YYYY-MM-DD
---

# <Outcome>

## Request
What was asked for.

## Problem
Why the change matters.

## User Outcome
What the user should be able to accomplish.

## Current Behaviour
What current repository evidence shows.

## Desired Behaviour
What should be different when the ticket is complete.

## Repository Evidence
Relevant confirmed files, flows, tests, constraints, or existing patterns.

## Shared Understanding
Concise confirmed intake decisions that materially shaped this ticket. Record decisions, not a transcript. Use `No additional decisions required` when repository evidence and the original request were already sufficient.

## Scope
Included behaviour.

## Out of Scope
Explicit exclusions.

## Requirements
Product/functional requirements without inventing technical design.

## Acceptance Criteria
- [ ] Observable condition defining done.
- [ ] Another observable condition when needed.

## Constraints
Confirmed product, technical, security, accessibility, compatibility, environment/data, or permission boundaries.

## Dependencies
Real prerequisites or `None identified`.

## Open Questions
`None` for every `status: ready` ticket. Only a `status: blocked` ticket may preserve a material unresolved intake decision here.
```

## Shared-understanding invariant

A ticket may use `status: ready` only when the bounded `/ticket` Grill has reached sufficient shared understanding and no known material user-owned intake question remains.

The Grill should resolve only decisions that can materially change scope, acceptance criteria, environment/data, security/permissions, architecture constraints, dependencies/migrations, or verification requirements. Repository facts must be researched rather than asked. Minor implementation choices belong to `/spec`.

Do not store the full interview transcript. Fold confirmed decisions into `## Shared Understanding` and the sections they affect so `/spec` and `/plan` can consume the durable result without re-asking settled questions.

If the default three-question Grill cap is exhausted while a material decision remains unresolved, never create a misleading ready ticket. When a durable record is appropriate, use:

```yaml
status: blocked
blocked_reason: <concise unresolved material decision>
```

and list the same decision under `## Open Questions`.

## Lifecycle frontmatter

Required on newly created tickets:

- `ticket_schema: 1`;
- `status`;
- `source`;
- `created` in `YYYY-MM-DD` form.

Canonical `status` values:

- `ready`;
- `awaiting-approval`;
- `in-progress`;
- `verifying`;
- `delivered`;
- `blocked`;
- `failed-verification`;
- `superseded`.

`delivered` and `superseded` are terminal queue states.

Allowed `source` values:

- `manual` — created directly through `/ticket`;
- `morning-brief` — created by `/morning-brief`;
- `deliver-ticket` — created from freeform input passed to `/deliver-ticket`.

Add these only when applicable:

```yaml
spec: spec/NNN-slug.md
plan: plans/NNN-slug.md
delivered_at: YYYY-MM-DD
superseded_by: tickets/NNN-other-ticket.md
blocked_reason: <concise reason>
```

Do not put secrets, large logs, full command output, or volatile environment details in frontmatter.

## Acceptance criteria

Prefer observable checkbox items when practical. Mark a checkbox complete only when implementation or verification evidence proves it. A specification, plan, code diff, commit, push, pull request, or partial test result is not enough by itself.

## Delivery Evidence

Add or update this section only from observed delivery evidence:

```md
## Delivery Evidence

- Implementation: <verified result or failure state>
- Acceptance criteria: <what was proven>
- Automated checks:
  - `<command/check>` — Passed | Failed | Not run — <concise result/reason>
- Browser/manual verification: <Passed | Failed | Not run, when relevant>
- Review: <Must fix / Should fix / Okay to ship summary>
- Spec: `spec/NNN-slug.md`
- Plan: `plans/NNN-slug.md`
- Human review: <remaining items or None>
- Not performed: <commit/push/merge/deploy/release/external actions when relevant>
```

A ticket may be marked `delivered` only after its acceptance criteria are supported by observed evidence, required verification is satisfied or explicitly unavailable where allowed, no in-scope `Must fix` remains, and project truth has been synchronized. `delivered` does not mean committed, pushed, merged, deployed, or released.

Do not include speculative affected-file lists as facts. Label recommendations clearly when genuinely useful, but leave technical solution design to `/spec`.
