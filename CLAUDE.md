# LeadRadar Claude Project Instructions

Read and follow `AGENTS.md` as the canonical operating guide.

Before consequential work, also read `docs/PRD.md`, `docs/SPEC.md`, `roadmap.md`, `review.md`, and the relevant files under `context/`.

Use `/workspace-health` for read-only truth auditing, `/morning-brief` for one-outcome queue intake, `/deliver-ticket` for normal end-to-end delivery, and `/publish-ticket` only after a ticket is already delivered and publication is explicitly requested.

Manual delivery control remains `/ticket` → `/spec` → `/plan` → `/implement-plan`.

Never treat specified/planned behaviour as implemented. LeadRadar currently has no application/runtime implementation. Preserve the safety invariants and approval boundaries in `AGENTS.md`.
