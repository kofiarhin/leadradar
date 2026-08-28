# Project Reconciliation Rules

## Evidence hierarchy

Prefer evidence in this order when claims conflict:

1. current repository contents and Git state;
2. verification tied to an identified checkpoint;
3. GitHub pull-request, branch, commit, check, deployment, and release state;
4. lifecycle/current-state documentation;
5. roadmap, spec, plan, and historical narrative.

A lower source may define intended behaviour, but it must not override stronger evidence about what currently exists.

## Safe corrections

Examples of supported synchronization:

- change `unmerged` to `merged` after the exact PR is confirmed merged;
- record a check as Passed only after its executed result is observed at the stated checkpoint;
- change an outcome from `implemented` to `verifying` when implementation exists but required verification is incomplete;
- remove a current deployment claim when the referenced environment/checkpoint can no longer be supported, while retaining it as historical evidence when useful;
- mark a roadmap outcome complete only when its own finish-line evidence is satisfied.

## Unsafe corrections

Do not:

- mark `delivered` from a merge alone;
- infer production deployment from a merged main branch;
- infer a product/architecture decision from code without confirming that the decision was intentionally made;
- treat authored tests as executed verification;
- convert `Not run` into `Failed`;
- reopen a delivered ticket to represent a regression;
- rewrite historical specs/plans to match current code without an explicit re-spec/re-plan workflow;
- invent ticket creation dates, customer evidence, test evidence, releases, or external actions.

## Historical evidence

Preserve historical checkpoints that still help explain the project. Move them under clearly historical headings or add explicit checkpoint labels when necessary so they cannot be mistaken for current state.

## Partial knowledge

When GitHub, deployment, CI, or repository evidence cannot be inspected:

- keep the corresponding status `Unresolved` or explicitly historical;
- do not downgrade or upgrade state from assumption;
- make the unavailable evidence a visible limitation in the completion report.
