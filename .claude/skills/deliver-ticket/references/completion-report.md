# Delivery Completion Report

Use this reference after implementation, final verification, review, and project-truth synchronization.

## Delivery rule

A ticket may reach `status: delivered` only when:

- the approved implementation outcome exists in the current repository;
- acceptance criteria are supported by observed evidence;
- required verification has passed, or an unavailable check is explicitly `Not run` only where the ticket/plan permits that limitation;
- no unresolved in-scope `Must fix` remains;
- project truth documents whose truth changed are synchronized;
- delivery evidence is written back to the source ticket.

If required verification remains failed, set `status: failed-verification` and report the failure instead of claiming delivery.

## Source-ticket evidence

Update acceptance-criteria checkboxes only for conditions actually proven.

Add or update a concise section:

```md
## Delivery Evidence

- Implementation: <verified result>
- Acceptance criteria: <x/y proven or concise summary>
- Automated checks:
  - `<check>` — Passed | Failed | Not run — <result/reason>
- Browser/manual verification: <Passed | Failed | Not run, when relevant>
- Review:
  - Must fix: <count/summary>
  - Should fix: <count/summary>
  - Okay to ship: <Yes/No with evidence>
- Spec: `spec/NNN-slug.md`
- Plan: `plans/NNN-slug.md`
- Human review: <remaining items or None>
- Not performed: <commit/push/PR/merge/deploy/release/external actions not actually performed>
```

On successful delivery, frontmatter should include the valid artifact references and delivery date:

```yaml
status: delivered
spec: spec/NNN-slug.md
plan: plans/NNN-slug.md
delivered_at: YYYY-MM-DD
```

Do not overwrite the ticket's original request/problem/scope/history merely to make delivery evidence cleaner.

## Final response format

Report:

- source ticket;
- spec and plan used;
- outcome implemented;
- affected files;
- RED/GREEN/REFACTOR/VERIFY evidence per slice;
- final checks as `Passed`, `Failed`, or `Not run` with concise results;
- review findings as `Must fix`, `Should fix`, and `Okay to ship`;
- synchronized project documents;
- source-ticket lifecycle/evidence update;
- lessons added, if any;
- unresolved/human-review items;
- external actions explicitly not performed.

Never report an action as completed because it was planned. In particular, distinguish delivery from:

- committed;
- pushed;
- pull request opened;
- merged;
- deployed;
- released.

A ticket can be `delivered` while those states remain not performed when the approved delivery contract did not include them.

## Failure report

When delivery cannot complete, report the last verified phase and the exact blocking evidence.

For required verification failure that remains unresolved:

```yaml
status: failed-verification
```

The report must identify:

- failing check/behaviour;
- whether implementation changes remain in the workspace;
- whether prior approval is still valid for another attempt;
- the next concrete review/decision needed;
- what was not performed downstream.

Do not silently downgrade a failed required check to `Not run` or `Should fix`.
