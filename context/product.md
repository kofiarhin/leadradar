# LeadRadar Product Context

## Product

LeadRadar is a reusable B2B prospecting application that turns public LinkedIn post engagement into a focused list of potential prospects who are strong candidates to contact and move toward booking a call.

Core outcome: identify potential prospects from LinkedIn post engagement who are strong candidates to contact and move toward booking a call.

The product optimizes for qualified commercial conversations and call-ready opportunities rather than raw scrape volume, email volume, or generic contact counts.

## Customer

V1 is a single-owner application for a B2B service operator. The first specified vertical is AI automation/software agencies selling implementation/services, with target buyers including founders, CEOs, CTOs, COOs, Heads of Operations, and similar decision-makers.

This is PRD-defined target-user context, not customer-research evidence. No real customer interviews or support notes are currently stored in this repository.

## Problem

Broad outbound lead generation commonly produces low-relevance contacts, costly enrichment on unlikely prospects, generic outreach, manual reply triage, duplicate contacts across campaigns, and weak traceability from an original public signal to a sales outcome.

LeadRadar uses public LinkedIn comments as higher-signal engagement, qualifies before enrichment, preserves durable prospect/signal history, and routes commercially relevant replies into a focused opportunity workflow.

## Product principles

- Signal before volume.
- Qualify before enrichment.
- Human approval before outbound.
- Deterministic safety rules for suppression, verification eligibility, authentication, outreach policy, and reply pausing.
- AI for judgment-heavy qualification, classification, and drafting.
- Provider independence through replaceable adapters.
- Durable prospect intelligence across campaigns.
- Keep V1 simple; do not become a general CRM, mailbox, calendar, workflow builder, or microservice platform.

## Primary journey

1. Owner edits the one V1 vertical profile.
2. Owner creates a campaign with a name and public LinkedIn post URL.
3. LeadRadar extracts public comments through Apify asynchronously.
4. Commenters are normalized into canonical prospects/signals and deduplicated across campaigns.
5. NVIDIA returns schema-valid qualification: `QUALIFIED`, `REVIEW`, or `REJECTED`.
6. Qualified prospects are enriched and business-email verification is performed through Hunter.
7. Deterministic outreach policy and global suppression/relationship checks decide automatic eligibility; unknowns default to review.
8. NVIDIA drafts a 2–3 email sequence; the owner reviews/edits it and the eligible batch.
9. The owner explicitly approves the campaign before any first outbound message.
10. Hunter handles delivery; LeadRadar owns release state and durable product events.
11. On a genuine reply, LeadRadar persists it and pauses automated follow-ups immediately before AI classification.
12. Relevant replies create/update opportunities; NVIDIA may draft a response, but the owner reviews/edits and explicitly sends it.
13. The owner manually moves strong conversations to `READY_TO_BOOK` and `BOOKED` and shares an existing calendar link externally.

## V1 scope

In scope includes single-owner authentication, one editable vertical profile, public-comment campaign discovery, cross-campaign prospect deduplication, NVIDIA qualification/drafting/classification, Hunter enrichment/verification/sequences/reply integration, deterministic policy/suppression, human approvals, Opportunity Inbox, qualified-lead database, conversation history, manual booking status, funnel metrics, MongoDB-backed jobs, separate Heroku web/worker processes, retries, idempotency, failure visibility, and retention controls.

See `roadmap.md` and `docs/PRD.md` for explicit exclusions.

## Success

Product success is defined by the approved journey producing qualified, commercially relevant conversations and call-ready/booked opportunities while enforcing the human-approval and deterministic-safety boundaries. No runtime success metrics have been observed yet because implementation has not started.
