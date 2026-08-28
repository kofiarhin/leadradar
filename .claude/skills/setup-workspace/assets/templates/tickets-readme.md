# Tickets

Tickets define **what should change and why** and form the durable work queue between `/morning-brief` and `/deliver-ticket`.

Keep one ticket to one outcome, one visible finish line, and one reviewable change. A ticket should capture the request, problem, user outcome, current and desired behaviour, repository evidence, scope, exclusions, requirements, acceptance criteria, constraints, dependencies, and unresolved questions.

Do not turn the ticket into an implementation design. Technical solution details belong in `spec/`.

Use a stable numeric filename that can be reused by downstream artifacts, for example `004-saved-products.md`.

## Lifecycle metadata

New tickets use YAML frontmatter:

```yaml
---
ticket_schema: 1
status: ready
source: manual
created: YYYY-MM-DD
---
```

Allowed sources are `manual`, `morning-brief`, and `deliver-ticket`.

Optional fields are added only when applicable: `spec`, `plan`, `delivered_at`, `superseded_by`, and `blocked_reason`.

## Queue states

Active/non-terminal states:

- `ready`
- `awaiting-approval`
- `in-progress`
- `verifying`
- `blocked`
- `failed-verification`

Terminal historical states:

- `delivered`
- `superseded`

`/deliver-ticket` with no argument selects the highest-numbered eligible unfinished numeric ticket. It skips terminal tickets and blocked tickets during automatic selection. Interrupted or failed work is revalidated before any continuation.

A `delivered` ticket is historical delivery evidence. Do not reopen it silently. If verified behaviour later regresses, create a new regression ticket referencing the historical ticket.

## Acceptance and delivery evidence

Prefer acceptance criteria as observable checkboxes. Check them only from observed implementation or verification evidence.

A ticket reaches `delivered` only after its acceptance criteria are supported, required verification and review are complete, no in-scope `Must fix` remains, and project truth is synchronized. Add a concise `## Delivery Evidence` section with check results and remaining human-review items.

`delivered` does not mean committed, pushed, merged, deployed, or released.
