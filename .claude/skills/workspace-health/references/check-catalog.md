# Workspace Health Check Catalogue

Use these checks selectively. Report only findings supported by evidence.

## Operating structure

- Canonical operating documents referenced by `AGENTS.md` exist when required.
- Required queue/spec/plan directories exist when the project uses the delivery workflow.
- Installed skill directories contain readable `SKILL.md` contracts.
- Slash-prefixed application routes are not confused with AI commands.

## Ownership manifest

When `.claude/workspace-manifest.json` exists:

- schema and `managedBy` are supported;
- paths are normalized and workspace-relative;
- no entry claims ownership outside the workspace;
- application/runtime code, Git metadata, secrets, dependency files, lockfiles, deployment configuration, source product specifications, and installed skills are not reset-owned;
- current files do not materially contradict recorded `created`, `updated`, or `reused` ownership.

A missing manifest is a Blocker only for workflows that require manifest-backed reset or ownership decisions.

## Truth drift

Compare `context/current-state.md`, `roadmap.md`, architecture/decision docs, and operating guides with stronger evidence. Examples:

- documentation says a pull request is open/unmerged after GitHub shows it merged;
- a roadmap outcome is incomplete although its required completion evidence is present;
- production/deployment claims reference an older checkpoint without being labelled historical;
- implemented behaviour is described as merely proposed, or vice versa.

Do not erase useful historical statements. Flag them only when they are presented as current truth.

## Lifecycle drift

For lifecycle-aware tickets:

- `ready` must be scoped and unblocked;
- `awaiting-approval` requires a valid spec, plan, and current execution contract;
- `in-progress` requires valid execution approval and evidence that implementation actually began;
- `verifying` requires implementation evidence and pending final verification/review;
- `delivered` requires evidenced acceptance criteria, required verification/review, project-truth synchronization, and delivery evidence;
- `failed-verification` requires an observed unresolved required failure;
- `superseded` requires an identified replacement.

Planning artifacts, commits, pushes, or pull requests alone never prove `delivered`.

For legacy tickets, report normalization debt only when it prevents deterministic selection or current lifecycle interpretation.

## Artifact linkage

Check traceability where the project expects it:

```text
ticket → spec → plan → implementation evidence
```

Flag:

- source paths that do not exist;
- mismatched basenames that cause ambiguous linkage;
- plans based on a materially stale spec;
- specs that silently exceed their ticket scope;
- duplicate active artifacts for the same outcome without an explicit replacement relationship.

## Approval freshness

An execution approval is stale when repository evidence introduces a material change in scope, architecture, dependencies, migrations, authentication, payments, permissions, security, deployment, destructive behaviour, acceptance criteria, or verification requirements after approval.

Never assume an old approval remains valid merely because the ticket still says `in-progress`.

## Verification debt

Report:

- required checks marked Passed without identifiable evidence;
- checks tied only to an older code checkpoint;
- required checks that are Failed or Not run;
- browser/manual verification missing for user-facing work when project rules require it;
- verification claims based only on authored tests rather than executed results.

Use `Not run` rather than `Failed` when a check was never executed.

## External-state claims

Keep these states independent:

```text
implemented
verified
delivered
committed
pushed
merged
deployed
released
```

Flag current-state documents that collapse these states or claim a later state without observable evidence.
