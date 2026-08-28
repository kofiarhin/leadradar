# LeadRadar Tickets

`tickets/` is the durable work queue between `/morning-brief` and `/deliver-ticket`.

One ticket must represent one outcome, one visible finish line, and one reviewable change. Tickets define what should change and why; technical design belongs in `spec/`.

New tickets use `ticket_schema: 1` and one of the canonical states: `ready`, `awaiting-approval`, `in-progress`, `verifying`, `delivered`, `blocked`, `failed-verification`, or `superseded`. `delivered` and `superseded` are terminal historical states.

A `ready` ticket must have no known material intake question. Use the installed `/ticket` shared-understanding Grill when user-owned decisions remain.

Acceptance criteria are checked only from observed implementation/verification evidence. `delivered` requires evidenced acceptance criteria, required verification/review, no in-scope `Must fix`, synchronized project truth, and delivery evidence. It does not mean committed, pushed, merged, deployed, or released.

Use stable zero-padded filenames such as `001-foundation.md` so downstream `spec/` and `plans/` artifacts can share the basename.

Workspace setup creates no implementation ticket automatically.
