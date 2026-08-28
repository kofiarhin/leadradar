# Shared Understanding Grill

Use this intake layer before writing a new `/ticket` when material user-owned decisions remain after repository inspection.

This model is inspired by Matt Pocock's MIT-licensed `grilling` skill, especially its design-tree idea, its separation of facts from decisions, and its goal of reaching shared understanding before acting. This workspace intentionally adapts that model to be bounded and one-question-at-a-time so normal ticket intake stays fast.

Source inspiration: `mattpocock/skills`, `skills/productivity/grilling/SKILL.md`.

## Goal

Resolve the minimum set of material decisions needed for a ticket to define **what should change and why** without guessing and without pushing known product ambiguity into `/spec` or `/plan`.

The target is not exhaustive interrogation. The target is sufficient shared understanding for a safe, reviewable ticket.

## Facts versus decisions

**Facts are the agent's job.** Inspect the repository, project context, tests, routes, existing tickets, architecture, configuration, and available external evidence instead of asking the user for information that can be established directly.

**Decisions are the user's job.** Ask only when multiple materially different valid outcomes remain and repository evidence cannot choose between them.

Do not turn a missing fact into a user question.

## Material decision tree

Think of intake as a small decision tree. A question is eligible only when its prerequisites are already known and its answer can materially change at least one of:

- scope or explicit exclusions;
- acceptance criteria or user-visible behaviour;
- environment, data source, or test-data boundary;
- permissions, privacy, security, authentication, or destructive behaviour;
- architecture constraints the user must choose rather than the repository already establishing;
- dependency or migration permission;
- verification requirements or evidence needed to call the outcome complete.

Do not Grill on naming preferences, minor implementation style, file placement, ordinary refactors, or technical choices that `/spec` can determine from repository conventions.

## Question format

Ask exactly one material question at a time using this structure:

```text
Question
<one decision the user needs to make>

Recommended answer
<one concrete recommended answer>

Why
<short explanation grounded in the goal, evidence, risk, and trade-offs>
```

The recommendation must be actionable, not `it depends`. When several options are legitimate, still recommend one and explain the trade-off briefly.

Wait for the user's answer before asking another question. After each answer, recompute the remaining decision tree because the answer may eliminate downstream questions.

If the user accepts the recommendation in substance, treat that decision as settled without asking them to restate it.

## Bounds

- Ask zero questions when the request plus repository evidence already provide sufficient shared understanding.
- One question should be common.
- Two questions are appropriate for moderately ambiguous requests.
- Three questions are the default maximum.
- Stop early whenever no material user-owned decision remains.
- Never manufacture questions merely to reach the maximum.

If a fourth material question appears necessary, first determine whether it is actually a repository fact, a `/spec` technical choice, or a non-material preference. If it is still genuinely material, stop rather than extending the interview indefinitely.

## Completion rule

Shared understanding is reached when all of the following are true:

- the user outcome is clear;
- included and excluded scope are clear enough for specification;
- observable acceptance criteria can be written without guessing;
- relevant environment/data/safety boundaries are settled;
- any user-owned dependency, migration, permission, or verification decision is settled;
- no known material product decision must be handed to `/spec`.

Then create the ticket and record the confirmed decisions concisely. Do not copy the full Q&A transcript into the ticket.

A `status: ready` ticket must have `Open Questions: None` for material intake decisions.

If the three-question cap is exhausted before this condition is met, never guess. Do not create a `ready` ticket. When preserving the work request is useful, write a `status: blocked` ticket with the exact unresolved decision and `blocked_reason`; otherwise stop and report the blocker.
