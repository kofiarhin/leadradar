# Implementation Plan Format

```md
# <Outcome> Implementation Plan

## Sources
- Ticket: `tickets/...`
- Spec: `spec/...`

## Goal
What completing the plan achieves.

## Preconditions
Repository state, approvals, decisions, or setup required before implementation.

## Implementation Strategy
A short summary derived from the approved spec.

## Slice 1 — <Observable behaviour>

### Outcome
What this slice proves.

### Affected Areas
Repository-backed files/modules likely to change.

### RED
Test to add or change and the expected failing reason.

### GREEN
Minimum implementation required to pass RED.

### REFACTOR
Allowed cleanup while preserving behaviour.

### VERIFY
Targeted tests/checks after the slice.

## Slice 2 — ...
Repeat only as needed.

## Final Verification
Relevant full tests, lint, type-check, build, browser flow, console/network, accessibility, or manual checks.

## Risks and Checkpoints
Material conditions that should stop implementation for review.

## Completion Criteria
Observable conditions proving the spec and ticket are satisfied.
```

Prefer vertical behaviour slices over layer-only sequences such as "model, route, UI, tests" when a smaller end-to-end slice can be tested and reviewed independently.
