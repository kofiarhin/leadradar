# LeadRadar Implementation Plans

`plans/` contains ordered implementation slices for an approved ticket specification.

Plans define execution order, not new product scope or architecture. Testable slices use:

```text
RED → GREEN → REFACTOR → VERIFY
```

Each slice should define its observable outcome, affected areas, failing RED behaviour, minimum GREEN implementation, refactor boundary, and targeted verification. Final verification should include the relevant test, lint, type-check, build, and browser/manual checks available for the ticket.

If planning reveals a material product decision, return to `/ticket`; if it reveals a material technical contract flaw, return to `/spec`.

Prefer the same basename as the source ticket/spec.
