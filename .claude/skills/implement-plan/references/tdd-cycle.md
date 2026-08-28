# TDD Cycle

Apply this loop to each testable implementation slice.

## RED

1. Write or update the smallest test that expresses the next required behaviour.
2. Run the targeted test before production implementation.
3. Confirm it fails for the intended missing behaviour.
4. Syntax errors, broken imports, malformed fixtures, environment failures, or unrelated regressions do not count as a valid RED. Fix the test/setup until the failure is meaningful.

Record the command and relevant failure reason.

## GREEN

1. Make the smallest production change required by the RED test.
2. Avoid speculative abstractions and future behaviour.
3. Run the targeted test and confirm it passes.

Record the command and result.

## REFACTOR

1. Improve naming, duplication, structure, or boundaries only where the current slice justifies it.
2. Do not expand product behaviour.
3. Keep the targeted tests green throughout.

Record meaningful refactors; use `None` when no cleanup is needed.

## VERIFY

Run the relevant neighbouring/regression checks for the slice. Confirm that the new behaviour works with existing behaviour rather than only in isolation.

Then move to the next slice.

## Exceptions

Documentation-only changes, generated metadata, or other genuinely non-testable work may use the strongest relevant verification instead of RED/GREEN. The plan should identify the exception and why a test-first cycle is not useful.
