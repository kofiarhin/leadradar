---
name: sync-project
description: Reconcile durable project truth and lifecycle documentation with current repository, Git, GitHub, and verification evidence without changing runtime code or external systems.
---

# Sync Project

Reconcile the AI operating workspace after repository or GitHub reality has changed outside the normal delivery workflow.

This skill changes documentation/lifecycle state only. It never changes runtime/application code or external systems.

## Typical use cases

Use `/sync-project` when:

- a pull request was merged or closed outside `/deliver-ticket`;
- verification was completed later than the implementation;
- current-state or roadmap documents are stale;
- a legacy ticket needs evidence-backed lifecycle classification;
- a branch, commit, deployment, or release claim must be corrected from current evidence;
- work happened manually and project memory needs to catch up.

Use `/workspace-health` first when the drift is unclear. `/sync-project` may perform the same read-only comparisons itself, but it must not assume that a prior health report is still current.

## Context to read

Read when present:

1. `AGENTS.md` and `CLAUDE.md`.
2. `roadmap.md` and `review.md`.
3. `context/current-state.md`, `context/architecture.md`, `context/decisions.md`, and `context/lessons.md`.
4. relevant tickets/specs/plans.
5. repository files, current branch/worktree state, and recent Git history.
6. available GitHub pull requests, branches, commits, checks, deployments, and releases when relevant and accessible.
7. `.claude/workspace-manifest.json` only when ownership affects which operating documents may be changed.

Repository and verification evidence outrank stale lifecycle metadata. Historical planning artifacts are never implementation evidence.

## Reconciliation rules

Apply [references/reconciliation-rules.md](references/reconciliation-rules.md).

Only synchronize facts that can be supported now.

Keep these states distinct:

```text
proposed
specified
planned
awaiting-approval
in-progress
implemented
verifying
verified
delivered
committed
pushed
merged
deployed
released
```

Do not promote an outcome because a later state merely seems likely.

### Current state

Update `context/current-state.md` when current repository/Git/GitHub/verification evidence materially changes the project's recorded implementation, verification, branch, merge, deployment, or release truth.

Preserve useful historical checkpoints, but label them historical instead of presenting them as current.

### Architecture

Update `context/architecture.md` only when implemented architecture actually changed. A plan, proposed refactor, or merged documentation-only pull request does not establish an architecture change.

### Decisions

Update `context/decisions.md` only for decisions that were explicitly made and can be supported by project/user evidence. Never infer a decision from implementation convenience.

### Roadmap

Update `roadmap.md` only when current evidence changes priority, dependency, completion, or the definition of the next outcome. Mark work complete only when its own completion evidence is satisfied.

### Lessons

Update `context/lessons.md` only when observed implementation, debugging, verification, or review produced a reusable repository-specific lesson. Do not turn ordinary status updates into lessons.

### Tickets

A lifecycle-aware ticket may be synchronized when current evidence supports the change.

- Acceptance criteria may be checked only when observed implementation/verification evidence proves them.
- `delivered` requires evidenced acceptance criteria, required verification/review, project-truth synchronization, and delivery evidence.
- A merged pull request alone does not prove `delivered`.
- A delivered historical ticket is not reopened. A later regression becomes a new ticket.
- `failed-verification` requires an observed unresolved required failure; a check that was never run is verification debt, not failure.
- Legacy tickets may be classified without inventing historical dates or evidence. Normalize metadata only when the required fields can be established safely under the active project rules.

Do not rewrite specs or plans merely to make them look current. If they are stale, report that status and leave the historical contract intact unless a separate workflow explicitly re-specifies/re-plans the work.

## Change plan and approval

Before writing anything, present one reconciliation plan:

```text
# Project Sync Plan

Evidence checkpoint:
- repository/commit: <value>
- GitHub state: <value or unavailable>
- verification: <value or unavailable>

Will update:
- <path>: <supported truth change>

Will preserve:
- runtime/application code
- specs/plans unless separately authorized
- unrelated and historical content

Not included:
- commits/pushes/PR writes
- merge/deployment/release
- dependency/data changes
```

If the active project already grants `/sync-project` a narrow documentation-write permission, follow that rule. Otherwise require explicit approval of the listed files and truth changes before writing. When no stronger phrase exists, use:

```text
Approve sync
```

Approval covers only the presented documentation changes. New material evidence or a changed write set invalidates approval and requires a revised plan.

## Write boundary

Allowed after approval when supported by evidence:

- `context/current-state.md`;
- `context/architecture.md`;
- `context/decisions.md`;
- `context/lessons.md`;
- `roadmap.md`;
- lifecycle/evidence fields in relevant tickets.

Not allowed:

- runtime/application source edits;
- dependency or lockfile changes;
- database/data mutation;
- spec or implementation-plan redesign;
- Git branch/commit/tag changes;
- GitHub issue, pull-request, comment, label, or review writes;
- push, merge, deployment, release, or routine activation;
- destructive operations.

## Execution

After approval:

1. re-read the evidence checkpoint and target documents;
2. stop and re-present the plan if material evidence changed;
3. apply only the approved documentation/lifecycle changes;
4. preserve unrelated content and history;
5. re-read the changed documents and confirm they no longer contradict the evidence used;
6. report every requested update that was skipped because evidence was insufficient.

## Completion report

Report:

- evidence checkpoint used;
- updated files and exact truth changes;
- preserved files/content;
- unresolved drift or verification debt;
- checks actually performed;
- confirmation that runtime code, dependencies/data, Git state, and external systems were unchanged.
