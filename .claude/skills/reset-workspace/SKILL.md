---
name: reset-workspace
description: Safely reset the AI operating workspace created by setup-workspace while preserving application code, source product documents, Git history, environment/config files, installed skills, and any path not explicitly owned by the workspace manifest.
---

# Reset Workspace

Reset the AI operating workspace without uninstalling the reusable skills or modifying the application.

This is a destructive workspace-state operation. Always inspect first, show the exact reset preview, and require explicit approval before deleting anything.

## Required manifest

Read `.claude/workspace-manifest.json` from the resolved workspace root.

The manifest is the only ownership source for deletion. When installed, use `.claude/skills/setup-workspace/references/workspace-manifest.md` as the manifest contract.

If the manifest is missing, unreadable, malformed, has an unsupported schema version, points outside the workspace, or has an unexpected `managedBy` value:

- do not delete anything;
- report that this workspace is untracked or unsafe to reset automatically;
- list likely operating paths only as informational candidates when useful;
- require a fresh `/setup-workspace` run or a separately reviewed migration before automated reset becomes available.

Never infer ownership from filenames alone.

## What may be removed

Only manifest entries whose ownership is exactly `created` are reset candidates.

For a `created` file entry, the file itself may be removed.

For a `created` directory entry, the directory and its current descendants may be removed because the workspace created that directory as an operating container. Before approval, recursively enumerate its current contents in the preview so the user can see what will be lost.

Entries marked `updated` or `reused` must be preserved. Unknown paths must be preserved.

Missing `created` paths are not errors; report them as already absent.

## Hard preservation boundary

Never remove or modify any of the following, even if a malformed or stale manifest claims ownership:

- `.claude/skills/` and its descendants;
- `.git/` and Git metadata;
- `.env`, `.env.*`, credential files, secret stores, or authentication material;
- dependency manifests or lockfiles such as `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`, or equivalent;
- application/runtime source directories or files unless they are inside a valid manifest-owned operating directory created by the workspace and clearly contain only operating artifacts;
- database files, migrations, deployment configuration, CI/CD configuration, infrastructure configuration, or production data;
- the selected PRD or equivalent source product specification;
- any path outside the resolved workspace root;
- any symlink or junction whose resolved target leaves the workspace.

When ownership and the preservation boundary conflict, preservation wins and the reset must stop before deletion.

## Preflight

Before presenting the reset preview:

1. Resolve the workspace root and manifest path.
2. Parse and validate the manifest.
3. Normalize every manifest path as a workspace-relative path. Reject absolute paths and traversal such as `..`.
4. Resolve symlinks/junctions when the environment permits. Reject candidates that escape the workspace.
5. Inspect Git status when available and identify modified or untracked reset candidates.
6. Expand every `created` directory to show its current descendants.
7. Confirm no candidate intersects the hard preservation boundary.
8. Build one exact deletion set with duplicates and nested child entries de-duplicated.

If any candidate fails validation, do not perform a partial reset. Report the blocker and stop before approval.

## Reset preview

Show a concise preview containing:

```text
# Workspace Reset Preview

Will remove:
- <exact owned paths>

Will preserve:
- .claude/skills/
- application/runtime files
- source PRD/specification
- Git history and metadata
- environment/config secrets
- manifest entries marked updated or reused
- unknown/untracked project files

Modified or untracked reset candidates:
- <paths or None>

Already absent:
- <paths or None>
```

For owned directories, show enough descendant detail to make consequential content visible. Do not hide customer notes, tickets, specs, plans, or other non-empty files behind a vague directory label.

Then request explicit approval for exactly that deletion set. Approval does not extend to new files or paths discovered afterward.

## Execution

After explicit approval:

1. Re-read the manifest and revalidate the workspace root.
2. Recompute the deletion set.
3. If the set materially differs from the approved preview, stop and present a new preview for approval.
4. Delete only approved `created` entries, deepest paths first where needed.
5. Do not alter `updated`, `reused`, unknown, or protected paths.
6. Do not create commits, push, merge, deploy, uninstall skills, or modify external systems.
7. Remove `.claude/workspace-manifest.json` only after every approved reset candidate is either successfully removed or confirmed already absent.

If deletion fails after execution begins, stop, preserve the manifest, report exactly what was removed and what remains, and do not retry destructive actions automatically.

## Completion report

Report:

- removed paths;
- already-absent paths;
- preserved `updated` and `reused` paths;
- any blocked or failed paths;
- confirmation that `.claude/skills/`, application files, source product documents, Git metadata, and protected configuration were preserved;
- whether the manifest was removed;
- checks actually performed.

A reset is complete only when the approved owned operating state is removed and the manifest is removed. If anything remains blocked or failed, report the reset as partial or not completed.
