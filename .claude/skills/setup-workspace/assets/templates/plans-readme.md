# Implementation Plans

Plans define **how to execute an approved specification in order**.

Each plan should reference its source ticket and spec, then break the work into the smallest useful implementation slices. Testable slices should use the default cycle:

```text
RED → GREEN → REFACTOR → VERIFY
```

For each slice define the outcome, affected areas, RED test, minimum GREEN change, refactor boundary, and verification. Include final regression/build/browser checks required by the project.

Do not redesign the approved specification silently. If planning reveals a material technical conflict, return to the spec instead.

Prefer the same basename as the source spec, for example `plans/004-saved-products.md`.
