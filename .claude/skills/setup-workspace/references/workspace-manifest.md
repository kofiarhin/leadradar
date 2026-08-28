# Workspace Ownership Manifest

Use `.claude/workspace-manifest.json` to record which operating-workspace paths were created, updated, or reused by `/setup-workspace`.

The manifest exists so `/reset-workspace` can remove only workspace-owned operating state without guessing from filenames.

## Format

Use schema version 1:

```json
{
  "schemaVersion": 1,
  "managedBy": "setup-prd-workspace",
  "workspaceRoot": ".",
  "entries": [
    {
      "path": "roadmap.md",
      "kind": "file",
      "ownership": "created"
    },
    {
      "path": "AGENTS.md",
      "kind": "file",
      "ownership": "updated"
    },
    {
      "path": "CLAUDE.md",
      "kind": "file",
      "ownership": "reused"
    },
    {
      "path": "context",
      "kind": "directory",
      "ownership": "created"
    }
  ]
}
```

Allowed values:

- `kind`: `file` or `directory`;
- `ownership`: `created`, `updated`, or `reused`.

All `path` values must be normalized workspace-relative paths using `/` separators. Never record an absolute path, `..` traversal, the workspace root itself, `.git`, `.claude/skills`, secrets, application runtime paths, dependencies, lockfiles, or paths outside the resolved workspace.

## Ownership meanings

### `created`

The path did not exist before `/setup-workspace` and was created as part of the operating workspace.

A `created` entry is eligible for `/reset-workspace` after exact preview and explicit approval.

If setup creates an entire directory such as `tickets/`, record the directory once as `created`; its later descendants are considered part of that workspace-owned operating container. Do not add redundant child entries unless the directory itself pre-existed.

### `updated`

The path existed before setup and setup changed it by an authorized conservative merge.

`/reset-workspace` must preserve it. Schema version 1 does not attempt to reverse merged content because doing so without an original-content snapshot would risk deleting unrelated user changes.

### `reused`

The path existed before setup and was used without modification.

`/reset-workspace` must preserve it.

## Pre-existing directories

Never claim ownership of a directory merely because setup created files inside it.

Example: if `context/` already existed and setup creates only `context/current-state.md` and `context/lessons.md`, record those files individually as `created` and preserve the existing directory and all unknown siblings.

```json
{
  "path": "context/current-state.md",
  "kind": "file",
  "ownership": "created"
}
```

## Setup recording procedure

Before writing operating-workspace files:

1. Inspect the existence and type of every intended target.
2. Read an existing manifest when present and validate it before changing workspace files.
3. Preserve existing ownership classifications from a valid manifest. A path previously recorded as `created` must not become `updated` merely because it now exists on a later setup run.
4. Determine which missing directories can safely be owned as whole `created` operating containers and which pre-existing directories require file-level tracking.
5. Write or update the manifest with intended `created` ownership before creating those new targets, so an interrupted setup does not leave newly created operating paths completely untracked.
6. After each successful merge into a pre-existing file, record that path as `updated`.
7. Record inspected but unchanged equivalent operating files as `reused` when they are part of the workspace contract.
8. Remove manifest entries for intended writes that never occurred, unless they remain valid previously recorded entries.
9. Validate the final manifest against the actual workspace before reporting setup complete.

If an existing manifest is malformed, unsupported, references unsafe paths, or conflicts materially with current filesystem evidence, stop workspace writes and report the manifest problem rather than replacing it silently.

## Manifest lifecycle

- `/setup-workspace` creates and maintains the manifest.
- Normal delivery work may create content inside workspace-owned `created` operating directories such as `tickets/`, `spec/`, or `plans/` without changing directory ownership.
- `/reset-workspace` reads the manifest but must not broaden ownership.
- `/reset-workspace` removes the manifest only after a complete successful reset.
- Forced skill installation must not delete the manifest because installers replace skills, not generated project state.

## Safety rule

The manifest is evidence of ownership, not authority to bypass preservation rules. If a manifest entry conflicts with application boundaries, secrets, Git metadata, installed skills, source product documents, or another protected path, stop and preserve the path.
