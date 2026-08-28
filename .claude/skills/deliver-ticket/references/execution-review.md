# Consolidated Execution Review

Use this format after the source ticket, technical specification, and implementation plan are valid and before any runtime/application implementation begins.

The purpose is one human review boundary for the complete execution contract. Do not require separate runtime approvals merely because the ticket, spec, and plan were produced in separate phases unless higher-priority project instructions explicitly require them.

## Required review

Present the smallest complete version of:

```md
# Execution Contract

## Ticket
`tickets/NNN-slug.md`

## Goal
The exact observable outcome.

## Scope
Included behaviour and files/areas expected to change.

## Exclusions
Explicitly out-of-scope behaviour and external actions.

## Technical Approach
The smallest repository-grounded approach defined by the approved spec.

## TDD Slices
1. <slice>: RED → GREEN → REFACTOR → VERIFY
2. <slice>: RED → GREEN → REFACTOR → VERIFY

## Material Checkpoints
Dependencies, migrations, auth, payments, permissions, security, destructive behaviour, deployment, or `None`.

## Verification
Targeted tests, regression checks, lint/type-check/build, browser/manual checks, and any known unavailable verification.

## Risks and Assumptions
Material uncertainty only.

## Human Review
What still needs human judgment.

## Not Included
Commit, push, pull request, merge, deployment, release, destructive operations, or other external actions unless separately approved.
```

## Approval gate

When project rules permit the documentation write, set the lifecycle-aware source ticket to:

```yaml
status: awaiting-approval
```

Then stop before runtime edits.

Use the explicit approval phrase required by `AGENTS.md` or higher-priority project instructions. When no stronger phrase exists, require:

```text
Approve plan
```

The following never count as execution approval:

- creating the ticket;
- selecting the ticket;
- generating or updating the spec;
- generating or updating the plan;
- setting `status: awaiting-approval`;
- an earlier approval for materially different scope.

## Approval invalidation

Approval becomes invalid when current evidence introduces a material change to:

- ticket outcome or scope;
- architecture;
- dependencies;
- migrations/data model;
- authentication;
- payments/billing;
- permissions;
- security/privacy posture;
- destructive behaviour;
- deployment/external services;
- acceptance criteria or verification requirements in a way that changes risk or work materially.

When invalidated:

1. stop implementation;
2. revise the affected ticket/spec/plan artifacts only as current permissions allow;
3. present a new consolidated execution contract;
4. require explicit approval again.

Minor implementation details already covered by the approved spec/plan do not require a new approval merely because exact line numbers or local refactoring choices differ.

## Revalidation immediately before implementation

After approval but before the first runtime edit:

- inspect Git/worktree state;
- re-read the affected current code/tests/configuration;
- confirm the approved ticket/spec/plan still match reality;
- preserve unrelated/uncommitted work;
- confirm no new material checkpoint appeared.

Only then may the source ticket move to `status: in-progress`.
