---
ticket_schema: 1
status: verifying
---

# 009 — V1 specification gap closure

## Outcome
Close the implementation gaps identified by the 2026-08-30 PRD/SPEC audit without weakening LeadRadar's deterministic safety or human-approval boundaries.

## Implemented scope
- Snapshot the exact approved campaign prospect batch with the approved sequence version.
- Configure one campaign-level Hunter sequence from the reviewed 2–3 step copy and explicit connected sender account.
- Recheck and persist outreach policy immediately before release.
- Cancel Hunter scheduled emails for a replying recipient before local pause state and before AI classification.
- Authenticate the public Hunter callback with a fail-closed configured shared-secret URL token while the provider has no documented request-signature mechanism.
- Split reply persistence/pause and AI classification into `PROCESS_REPLY` and `CLASSIFY_REPLY` jobs.
- Implement `EVALUATE_OUTREACH_POLICY` as a real worker stage.
- Recover stale `RUNNING` job leases and surface exhausted jobs into domain failure state.
- Schedule workspace-scoped retention processing daily.
- Add explicit manual resolution for qualification and outreach-policy `REVIEW` states.
- Add Prospect Detail with signal, campaign, conversation, message, and opportunity history.
- Add campaign prospect rows and failure/review visibility to Campaign Detail.
- Expose qualification, contact, outreach, intent, and campaign filters in Leads.
- Reconcile `SENDING` campaigns to terminal states from Hunter pending-message state.
- Require a configured Hunter sender account and idempotency key for human-reviewed manual replies.
- Add Heroku `web` and `worker` process declarations.
- Add focused regression coverage for Hunter sequence/cancellation/send contracts, webhook authentication, and stale job recovery.

## Safety boundaries
- `OUTBOUND_MODE=disabled` remains the default and performs no live provider write.
- Campaign outreach still requires approved copy and an approved prospect snapshot.
- Conversational replies still require explicit human action.
- Provider cancellation must succeed before a genuine reply proceeds to AI classification when live outbound is enabled.
- Suppression, verification, policy, approval, and relationship gates remain deterministic.

## Verification required
- Exact-head `npm test`.
- Exact-head `npm run typecheck`.
- Exact-head `npm run lint`.
- Exact-head `npm run build`.
- Provider adapter contract tests and safe credentialed smoke checks.
- Desktop/mobile/loading/empty/error/keyboard/accessibility browser review.

This ticket remains `verifying` until observed evidence satisfies those checks. No merge or deployment is implied by implementation.
