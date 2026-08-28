# Workspace Schema

Create the smallest applicable form of this structure. Reuse equivalent existing files or directories.

| Path | Responsibility |
| --- | --- |
| `.claude/workspace-manifest.json` | Ownership record for operating-workspace paths created, updated, or reused by setup; used by `/reset-workspace` to fail closed and delete only explicitly owned state |
| `AGENTS.md` | Canonical operating guide: working style, permissions, queue/delivery flow, verification, learning, and reporting |
| `CLAUDE.md` | Thin compatibility entry point that directs Claude-compatible tools to the canonical operating guide |
| `roadmap.md` | Current goal, priorities, exclusions, ordered outcomes, lifecycle status, and definition of done |
| `review.md` | Product, UX, code, security, accessibility, evidence, scope, and document-alignment review standard |
| `context/product.md` | Product, customer, problem, promise, scope, journeys, and success criteria |
| `context/architecture.md` | Intended architecture plus clearly separated implemented and verified state |
| `context/decisions.md` | Confirmed decisions and unresolved questions; never fabricated decisions |
| `context/current-state.md` | Proposed, specified, planned, in-progress, implemented, verified, released, and unresolved status where applicable |
| `context/lessons.md` | Concise repository-specific lessons learned from observed implementation/review evidence; never generic advice |
| `customers/README.md` | Format and rules for future real customer evidence; no invented notes |
| `tickets/README.md` | Durable work-queue contract: tickets define what should change and why, lifecycle metadata/status, one outcome per ticket, active versus terminal states, and delivery-evidence rules |
| `spec/README.md` | Specs define the technical contract for an approved ticket |
| `plans/README.md` | Plans define ordered TDD implementation slices for an approved spec |
| `demos/core-flow.md` | PRD-derived buyer/user walkthrough and expected outcome |
| `demos/browser-review-checklist.md` | Desktop/mobile states, console/network, accessibility, and human review checks |
| `routines/README.md` | Safe routine format and activation boundary; define no active schedule |

Use the templates in `assets/templates/` as content guides, not text to copy blindly. Replace every placeholder with supported project facts or `Unresolved`.

Track ownership at the safest level:

- if setup creates an entire operating directory, the manifest may record that directory as `created`;
- if the directory already existed, preserve it and record only individual files setup creates or updates inside it;
- never record application/runtime directories, source product documents, secrets, Git metadata, installed skills, dependency files, lockfiles, deployment configuration, or unrelated project content as reset-owned paths.

Do not create empty `interviews/`, `feedback/`, `evidence/`, or similar directories. Create them later when real content exists.
