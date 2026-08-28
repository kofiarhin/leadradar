# Claude Project Instructions

Read and follow `AGENTS.md` as the canonical project operating guide. Then read `roadmap.md`, `review.md`, `context/lessons.md`, and the context relevant to the current task.

Use `/workspace-health` for a read-only audit when project truth, lifecycle state, verification evidence, or artifact linkage may have drifted.

Use `/sync-project` when repository/Git/GitHub/verification reality changed outside the delivery workflow and durable project truth needs an approval-gated documentation/lifecycle reconciliation. It must not change runtime code or external systems.

Use `/morning-brief` for project orientation, prioritization, and safe queue intake. It may create or reuse at most one evidence-backed ticket when the active project rules allow that narrow write; it never implements the ticket.

Use `/deliver-ticket` as the default end-to-end delivery command. It resolves a ticket, creates or revalidates its spec and TDD plan, presents one consolidated execution contract, and waits for explicit approval before runtime/application edits.

After a ticket is already delivered, use `/publish-ticket` only when the user wants the approved non-main branch committed when needed, pushed without force, and opened as a draft pull request. Publication never implies merge, deployment, or release.

For step-by-step delivery control, use `/ticket` → `/spec` → `/plan` → `/implement-plan`.

Repository and verification evidence outrank stale planning or lifecycle metadata. Keep delivered, committed, pushed, merged, deployed, and released states distinct.
