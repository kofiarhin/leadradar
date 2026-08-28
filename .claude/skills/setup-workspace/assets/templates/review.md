# Review Standard

## Must fix

Define conditions that block the stated product outcome or create material risk.

## Should fix

Define important quality issues that do not block the stated outcome.

## Okay to ship

Define verified, in-scope quality expectations.

## Review dimensions

Review product fit, user journey, correctness, error states, accessibility, security, scope, evidence, unnecessary complexity, unexpected file changes, and regressions.

For user-facing work, inspect the actual flow at relevant desktop and mobile widths when tooling permits. Check relevant loading, empty, error, success, console, network, and accessibility states.

## Evidence and document alignment

- A plan is intended work, not implementation evidence.
- Tests/checks count only when actually run and inspected.
- `context/current-state.md` must not claim more than repository evidence supports.
- Update `context/architecture.md` only when architecture truth changed.
- Update `context/decisions.md` only for confirmed decisions.
- Update `roadmap.md` only when the outcome's required completion evidence exists.
- Add to `context/lessons.md` only concise repository-specific lessons observed during implementation or review.
