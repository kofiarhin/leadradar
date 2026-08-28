---
name: workspace-health
description: Audit an AI software-delivery workspace for truth drift, lifecycle drift, verification debt, broken ticket/spec/plan links, stale approvals, and manifest or operating-document inconsistencies without changing repository or external state.
---

# Workspace Health

Audit the current AI operating workspace and report whether its durable project truth still matches repository, Git, GitHub, and verification evidence.

This skill is strictly read-only. It diagnoses drift; it never repairs it.

## Context to read

Read when present:

1. `AGENTS.md` and `CLAUDE.md`.
2. `roadmap.md` and `review.md`.
3. `context/current-state.md`, `context/architecture.md`, `context/decisions.md`, and `context/lessons.md`.
4. `.claude/workspace-manifest.json`.
5. active and recent artifacts under `tickets/`, `spec/`, and `plans/`.
6. repository structure, current branch/worktree state, and recent Git history.
7. available GitHub pull-request, branch, commit, and check evidence when the environment provides it.

Read additional product/customer evidence only when it is needed to determine whether a roadmap or lifecycle claim is stale.

## Evidence precedence

Use observable evidence before workflow metadata:

1. current repository files and Git state;
2. verification output tied to an identified commit/checkpoint;
3. GitHub branch, pull-request, commit, and check state;
4. lifecycle metadata and current-state documents;
5. roadmap, specification, plan, and historical narrative.

A document is not unhealthy merely because it describes intended future behaviour, provided that intended, proposed, specified, planned, implemented, verified, merged, deployed, and released states are labelled distinctly.

## Health checks

Apply the detailed catalogue in [references/check-catalog.md](references/check-catalog.md).

At minimum inspect:

- operating-workspace structure and ownership-manifest integrity;
- contradictions between repository/Git/GitHub evidence and `context/current-state.md` or `roadmap.md`;
- ticket lifecycle states that are unsupported by current evidence;
- delivered tickets whose claimed behaviour is no longer present;
- legacy or malformed ticket lifecycle metadata that blocks deterministic queue handling;
- missing or mismatched ticket → spec → plan links;
- specs or plans that materially conflict with current repository architecture;
- plans or approvals that became stale after material repository changes;
- required verification that is failed, stale, attached to an older checkpoint, or not run;
- claims that work is committed, pushed, merged, deployed, or released without corresponding evidence;
- duplicate active tickets that materially describe the same outcome.

Do not classify a missing optional artifact as a defect unless the active project contract requires it.

## Severity model

Classify each finding as:

- **Blocker** — continuing delivery would be unsafe or materially ambiguous, such as invalid ownership evidence, conflicting active execution state, or an approval that cannot be revalidated.
- **Drift** — durable project truth conflicts with stronger current evidence.
- **Debt** — required verification, evidence, or lifecycle maintenance is incomplete but does not by itself prove the implementation is wrong.
- **Notice** — useful non-blocking observation.

Overall status:

- `HEALTHY` — no Blocker, Drift, or material Debt findings.
- `DEGRADED` — Drift or material Debt exists but read-only diagnosis remains reliable.
- `BLOCKED` — at least one Blocker prevents safe continuation.
- `UNKNOWN` — required evidence could not be inspected well enough to classify the workspace.

## Output

Return a concise report:

```text
# Workspace Health

Overall: HEALTHY | DEGRADED | BLOCKED | UNKNOWN

## Blockers
- <finding or None>

## Truth drift
- <finding or None>

## Lifecycle drift
- <finding or None>

## Verification debt
- <finding or None>

## Artifact integrity
- <finding or Passed>

## Manifest integrity
- <finding or Passed | Not present>

## Recommended next action
<one command/action or None>
```

Every material finding must state the conflicting evidence, not merely assert that something is stale.

Prefer one next action. Use `/sync-project` when the problem is documentation/lifecycle reconciliation and that skill is installed. Use `/deliver-ticket` when the workspace is healthy enough and one queued ticket is ready. Recommend a concrete human decision when evidence is insufficient or a safety boundary is blocking progress.

## Permissions

Allowed:

- read repository files and Git history/status;
- inspect available GitHub state and verification/check evidence;
- compare artifacts and report findings.

Not allowed:

- create, edit, move, or delete files;
- create or modify tickets, specs, plans, branches, commits, issues, pull requests, labels, or comments;
- run destructive or state-changing commands;
- install dependencies;
- mutate data;
- push, merge, deploy, release, or activate routines.

If a useful repair is identified, describe it and stop. Diagnosis never implies repair authorization.
