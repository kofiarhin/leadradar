# Safety and Verification

## Stop conditions

Stop or skip the affected operation when:

- the product specification is missing or unreadable;
- multiple sources remain plausible and none was explicitly selected;
- a write would leave the resolved workspace;
- an existing target contains materially conflicting instructions;
- permissions prevent a required write;
- an existing `.claude/workspace-manifest.json` is malformed, unsupported, contains unsafe paths, or materially conflicts with current filesystem evidence.

## Safe defaults

- Keep existing application code unchanged.
- Never follow a symlink or junction for a write outside the workspace.
- Preserve existing content and uncommitted changes.
- Redact secret values while retaining non-sensitive variable names when useful.
- Use a meaningful `README.md` to represent a future-content directory; do not add `.gitkeep`.
- Use the user's requested language. Otherwise follow the source specification's primary language.
- Do not populate `context/lessons.md` with generic advice. Record only repository-specific lessons supported by existing evidence.
- Treat the ownership manifest as reset metadata, not permission to claim application or unrelated project files.
- Never record `.git`, `.claude/skills`, `.env` or secret files, application/runtime source, source product specifications, dependency manifests, lockfiles, deployment/CI configuration, database files, migrations, or paths outside the workspace as `created` reset targets.
- When a standard operating directory already exists, track setup-created files within it individually instead of claiming ownership of the whole directory.

## Verification

After setup:

1. Confirm every reported file exists.
2. Confirm `tickets/`, `spec/`, and `plans/` are separate and their README files describe their distinct responsibilities.
3. Confirm generated `tickets/README.md` defines lifecycle/queue semantics and the operating guide describes `/morning-brief` → queued ticket → `/deliver-ticket`, while preserving the manual `/ticket` → `/spec` → `/plan` → `/implement-plan` flow.
4. Confirm `context/lessons.md` exists.
5. Confirm `.claude/workspace-manifest.json` exists, parses as schema version 1, and has `managedBy: "setup-prd-workspace"`.
6. Confirm every manifest path is normalized, workspace-relative, and matches the reported `created`, `updated`, or `reused` classification.
7. Confirm no manifest entry claims the workspace root, `.git`, `.claude/skills`, secrets, application/runtime paths, source product specifications, dependencies, lockfiles, deployment/CI configuration, database/migration paths, or any path outside the workspace.
8. For every `created` directory entry, confirm the directory did not pre-exist setup. For pre-existing directories, confirm only setup-created child files are individually classified as `created`.
9. Search generated files for unresolved template markers such as `{{...}}`, `[TODO]`, and example product names.
10. Search generated files for accidentally copied secret values when safe identifiers are known.
11. Confirm no runtime-code, dependency, lockfile, Git-state, deployment, or external-service changes occurred.
12. Inspect the diff when Git is available and classify each target as created, updated, reused, skipped, or blocked.

Do not run application tests or builds for a documentation-only setup unless project instructions explicitly require them. Report those checks as not run rather than implying success.

A setup must not be reported complete when manifest validation fails, because `/reset-workspace` depends on that ownership evidence to fail closed safely.
