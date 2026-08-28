---
name: morning-brief
description: Produce a concise operator brief by reconciling project context, repository and GitHub state, roadmap priorities, verification evidence, risks, and available customer signals, then create or reuse at most one evidence-backed ticket without implementing it.
---

# Morning Brief

Produce an operating brief for the current project. The purpose is orientation, prioritization, and safe queue intake, not implementation.

The only repository write this skill may make is creating at most one evidence-backed ticket under `tickets/` when the ticket is safely scoped and no equivalent active ticket exists. It must not modify runtime code, specs, plans, GitHub state, data, dependencies, routines, commits, pushes, merges, or deployments.

## Context to read

Always read when present:

1. `AGENTS.md`.
2. `CLAUDE.md`.
3. `roadmap.md`.
4. `review.md`.
5. `context/current-state.md`.
6. `context/lessons.md`.

Read when relevant:

- `context/product.md`;
- `context/decisions.md`;
- `context/architecture.md`;
- recent files under `customers/`;
- active files under `tickets/`, `spec/`, and `plans/`.

Project-specific instructions and repository evidence override generic assumptions.

## Repository and GitHub inspection

Inspect the current repository state and recent history available in the environment. When GitHub access is available, inspect relevant recent commits, recently merged pull requests, open pull requests, open issues, and available verification or check results.

Prefer observable repository and GitHub evidence over stale planning statements. If external GitHub state cannot be inspected, say so clearly and do not infer it.

GitHub access is read-only for this skill. Do not create or modify issues, pull requests, branches, comments, commits, or other external state.

## Application routes and AI commands

Slash-prefixed names may refer to product/application routes, AI workspace commands, or both. Do not treat the leading `/` as enough evidence to decide which one is meant.

When a brief mentions a slash-prefixed name and there is any realistic ambiguity, identify its role explicitly. Prefer wording such as:

- `Application route /plan` runs the product's planner experience.
- `AI command /plan` creates an implementation plan from an approved specification.
- `Application route /setup` is unchanged.
- `AI command /setup-workspace` initializes the operating workspace.

Inspect application routing and installed workspace skills when necessary to resolve the distinction. If the same token is used by both the application and the AI workspace, keep both meanings separate and mention only the one supported by the statement being made.

Never write an ambiguous statement such as `/plan runs the ten-step wizard` when `/plan` is also an installed AI command. Use an explicit role label instead.

## Responsibilities

Reconcile what project documents claim with what current evidence supports.

Explicitly flag truth drift such as:

- documentation describing work as unmerged when it is merged;
- roadmap items marked incomplete when completion evidence exists;
- plans or tickets being mistaken for implementation evidence;
- verification claims that belong to an older checkpoint;
- deployed or production claims without current evidence.

Distinguish proposed, specified, planned, awaiting-approval, in-progress, implemented, verifying, verified, committed, pushed, merged, deployed, and released states when relevant.

Identify the single highest-leverage next outcome. Prefer, in order:

1. roadmap blockers;
2. material verification gaps;
3. customer-backed problems;
4. the smallest evidence-backed product or engineering improvement.

Do not invent work merely to fill the brief. If no useful next ticket is supported, say so.

## Customer evidence

Use only real customer notes, interviews, feedback, support records, or equivalent evidence present in the project. Surface the strongest recent signal when it materially affects priority. If there is no customer evidence, state that explicitly.

## Ticket queue handoff

After identifying the one highest-leverage outcome, inspect active tickets and relevant specs/plans before creating anything.

Treat an existing ticket as potentially equivalent when its title/user outcome, desired behaviour, acceptance criteria, and scope materially overlap the proposed outcome.

If an equivalent ticket is `ready`, `awaiting-approval`, `in-progress`, `verifying`, `blocked`, or `failed-verification`, reuse/reference it instead of creating a duplicate.

If an equivalent ticket is `superseded`, follow its `superseded_by` replacement when available rather than reviving the historical ticket.

If an equivalent ticket is `delivered` but current repository evidence shows the behaviour has regressed or a materially distinct problem now exists, create a new regression ticket and reference the historical ticket in its repository evidence. Do not reopen the delivered ticket silently.

Create a new ticket only when all of these are true:

- current evidence supports one clear outcome;
- the outcome can be scoped safely without a material unresolved decision;
- no equivalent active ticket exists;
- the ticket can satisfy the normal `/ticket` contract.

When creating a ticket:

1. use the next valid zero-padded numeric prefix;
2. apply the installed `/ticket` quality and artifact contract;
3. set `ticket_schema: 1`;
4. set `status: ready`;
5. set `source: morning-brief`;
6. create no more than one ticket in the invocation.

If a material product/engineering decision is unresolved or evidence is insufficient, create no ticket and surface the one concrete decision/evidence needed.

## Output

Keep the brief under 500 words unless the user explicitly requests more detail.

Use this structure:

```text
# Morning Brief — YYYY-MM-DD

## Since last session

## Current state

## Truth drift

## Verification debt

## Today's focus

## Risks

## Customer signal

## Ticket queue

## Decision needed
```

End the `## Ticket queue` section with exactly one of:

- `Created ticket: tickets/NNN-slug.md` — `status: ready`;
- `Existing ticket: tickets/NNN-slug.md` — `<current status>`;
- `No ticket created: <supported reason>`.

When a ticket is ready for delivery, include:

```text
Suggested command: /deliver-ticket tickets/NNN-slug.md
```

Use `None detected`, `No current evidence`, or `None` rather than inventing content when a section has no supported finding.

## Permissions

Allowed write:

- create at most one new evidence-backed ticket under `tickets/`.

Not allowed:

- runtime/application code edits;
- spec or plan creation;
- edits to existing tickets merely to make the brief look current unless a higher-priority project rule explicitly authorizes that maintenance;
- dependency changes;
- GitHub writes;
- commits, pushes, merges, deployments, releases;
- destructive/data mutation;
- routine activation;
- invented customer feedback or verification evidence.

A morning brief may populate the queue, but it never approves or executes the resulting ticket.
