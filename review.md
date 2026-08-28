# LeadRadar Review Standard

Use this standard for ticket delivery and final diff review.

## Must fix

A finding is `Must fix` when it blocks the approved outcome or creates material product, safety, privacy, security, data-integrity, or outreach risk. Examples include:

- outbound can begin without explicit campaign approval;
- an AI decision can bypass suppression, verification, authentication, outreach policy, or reply-pausing controls;
- a genuine reply can receive another automated follow-up before the sequence is paused;
- `BLOCKED` policy or suppression records can be overridden by AI or ordinary send logic;
- unverified/personal/free-mail contact data can proceed automatically where V1 requires a verified business email;
- webhook/provider events are not idempotently handled and can duplicate sends, replies, prospects, or opportunities;
- cross-campaign prospect deduplication or workspace scoping is broken;
- secrets, LinkedIn credentials/session material, or sensitive provider payloads are exposed or retained contrary to scope;
- authentication/session implementation stores plaintext passwords or lacks secure HTTP-only server-verifiable sessions;
- a provider limitation silently weakens a locked LeadRadar behaviour;
- a change materially exceeds the approved ticket/plan or touches unexpected protected areas;
- required verification fails and remains unresolved.

## Should fix

A finding is `Should fix` when the ticket outcome works but quality is materially below the V1 bar. Examples include:

- confusing loading, empty, review, error, or partial-failure states;
- unclear qualification/contact/policy/outreach status language;
- weak mobile layout or keyboard/accessibility behaviour;
- provider failures that are technically visible but difficult for the owner to understand or retry safely;
- unnecessary abstractions or coupling across domain/provider boundaries;
- weak test coverage around important edge cases that does not currently block the approved acceptance criteria.

## Okay to ship

Use `Okay to ship` only when:

- the change stays inside the approved ticket/spec/plan;
- acceptance criteria are supported by observed evidence;
- relevant tests/checks actually ran and are reported as `Passed`, `Failed`, or `Not run` truthfully;
- deterministic LeadRadar safety controls remain intact;
- provider-specific code stays behind integration/adapter boundaries;
- no in-scope `Must fix` remains;
- project memory/lifecycle evidence is synchronized.

## User-facing verification

When browser tooling is available, inspect relevant desktop and mobile widths plus loading, empty, validation/error, partial-failure, review/approval, and success states. Check console/network errors and keyboard/accessibility behaviour. For outreach/reply flows, verify the human approval and deterministic pause/suppression behaviour from the user's perspective.

## Evidence rules

- `docs/PRD.md` and `docs/SPEC.md` describe intended behaviour; they are not implementation evidence.
- A ticket, spec, plan, code diff, commit, push, or PR is not proof of successful runtime behaviour by itself.
- Never claim a check passed unless it was run and inspected at the relevant checkpoint.
- `context/current-state.md` and ticket status must not claim more than repository/verification evidence supports.
