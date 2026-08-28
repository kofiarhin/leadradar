# Publish Ticket Workflow

## Scope matching

The publishable diff must be explainable by the delivered ticket, spec/plan, and delivery evidence. Documentation synchronized by the delivery workflow may be included when it belongs to the same delivered outcome.

Stop before publishing when:

- unrelated modified/untracked files are present and cannot be safely excluded;
- the branch contains multiple unrelated outcomes that cannot be separated without history rewriting;
- a secret or credential-bearing file would be committed;
- a protected base branch is active;
- the intended base repository/branch is ambiguous;
- the ticket is not delivered.

## Commit handling

Create a commit only for approved uncommitted delivered changes.

- Stage exact approved paths.
- Preserve unrelated working-tree changes.
- Do not amend an existing commit by default.
- Do not create an empty commit.
- If the project has an approved commit naming convention, follow it; otherwise use a concise scoped message such as `feat: <ticket outcome>` or the appropriate `fix/docs/chore` prefix.

## Push handling

- Use a normal fast-forward push.
- Never use force or force-with-lease under the default skill contract.
- Do not push directly to the protected base branch.
- If the branch has diverged and safe resolution requires rebase/merge/history changes, stop for a separate decision.

## Pull-request handling

Before creation, search for an existing open/draft PR with the same head and base.

Create a draft PR only when none exists. Suggested body sections:

```text
## Summary
- <delivered outcome>

## Ticket
- `tickets/NNN-slug.md`

## Verification
- `<check>` — Passed | Failed | Not run — <evidence>

## Review
- Must fix: None
- Should fix: <items or None>
- Human review: <items or None>

## Not included
- merge
- deployment/release
- <other ticket-specific exclusions>
```

A draft PR is publication evidence, not delivery evidence and not merge/deployment evidence.

## Existing PR

If an equivalent PR already exists, return its number/URL and do not create another. Do not silently update PR metadata or convert draft/ready state unless explicitly included in a new approved publish contract.
