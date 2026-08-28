# Specification Format

Use only applicable sections.

```md
# <Outcome> Specification

## Source Ticket
`tickets/...`

## Ticket Decisions
Concise shared-understanding decisions from the source ticket that materially constrain this technical design. Do not reopen settled intake decisions without new conflicting repository evidence.

## Objective
The technical outcome this specification must enable.

## Existing System
Relevant confirmed architecture, code paths, data flows, and tests.

## Proposed Solution
The smallest clean solution consistent with the repository and ticket.

## Architecture
Applicable boundaries and interactions.

## Data Model
Applicable persistence/schema changes and compatibility concerns.

## API Contract
Applicable requests, responses, errors, authorization, and validation.

## Frontend Behaviour
Applicable UI/data flow, including loading, empty, error, and success states.

## Backend Behaviour
Applicable routing/service/persistence behaviour.

## Validation and Error Handling
Expected validation, failure behaviour, retry, and error shape.

## Edge Cases
Important boundary conditions.

## Security / Privacy / Accessibility
Only relevant constraints and requirements.

## Affected Areas
Repository-backed modules/files or clearly labelled likely areas.

## Testing Requirements
Behaviour that must be covered; do not write the implementation plan here.

## Verification Requirements
Project checks and user-facing verification needed before completion.

## Technical Risks
Material risks and compatibility concerns.

## Open Technical Questions
`None` for a specification that is ready for `/plan`.
```

## Plan-readiness rule

Do not use `## Open Technical Questions` as a place to defer decisions that should have been resolved before planning.

- Material user-owned product/scope/safety decisions belong back in `/ticket` shared-understanding intake.
- Repository-answerable technical choices belong in the spec as evidence-backed proposals.
- A genuinely blocking unknown means the spec is not plan-ready and the skill must stop rather than hand an ambiguous contract to `/plan`.
