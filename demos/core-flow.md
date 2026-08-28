# LeadRadar Core Demo Flow

Status: **Intended from `docs/PRD.md`; not implemented or verified yet.**

## 1. Configure the vertical

Owner reviews/edits the single V1 AI automation/software-agency profile: offer, target roles/industries/company size/regions, positive and negative signals, `BOOK_CALL` goal, and outreach tone.

Expected outcome: the active profile provides the qualification and outreach context used by a campaign.

## 2. Create a campaign

Owner enters a campaign name and a supported public LinkedIn post URL, then selects `Find Prospects`.

Expected outcome: the campaign is created immediately and discovery continues asynchronously.

## 3. Discover public commenters

LeadRadar starts the Apify engagement adapter and ingests usable public LinkedIn comments without LinkedIn credentials/session cookies.

Expected outcome: source post, public identity/provider identity, comment text/identifier, discovery timestamp, and available role/company metadata are captured as normalized product data.

## 4. Normalize, deduplicate, and qualify

Commenters resolve to canonical prospects where possible; repeated discoveries add Signals rather than duplicate prospects. NVIDIA evaluates prospect identity plus public engagement context.

Expected outcome: each campaign prospect becomes `QUALIFIED`, `REVIEW`, or `REJECTED`, with schema-valid confidence/reason. Only `QUALIFIED` continues automatically.

## 5. Enrich and determine contact eligibility

Hunter searches for and verifies a business email. LeadRadar then applies deterministic outreach policy plus suppression/active-relationship checks.

Expected outcome: only acceptable verified business contacts with `ALLOWED` policy and clear suppression/relationship checks may become automatically eligible; ambiguous policy/data routes to review.

## 6. Draft and review campaign copy

NVIDIA drafts a 2–3 email sequence from the vertical, source context, offer, goal, and tone. The owner edits/reviews sequence copy and the eligible qualified batch.

Expected outcome: copy remains a draft and no first message is sent yet.

## 7. Explicit campaign approval and outreach

Owner explicitly approves the final campaign batch and sequence. LeadRadar releases approved eligible prospects to Hunter and records provider references/outreach state.

Expected outcome: no prospect is released before campaign approval; material changes to approved copy/eligibility require re-approval for unsent prospects.

## 8. Receive and process a reply

A genuine Hunter reply arrives. LeadRadar idempotently records the inbound event/message and pauses that prospect's automated sequence immediately, before NVIDIA classification.

Expected outcome: no further automated follow-up is sent to a replying prospect while AI determines intent.

## 9. Surface an opportunity and draft response

NVIDIA classifies the reply (`POSITIVE`, `QUESTION`, `LATER`, `REFERRAL`, `NEGATIVE`, `UNSUBSCRIBE`, `OUT_OF_OFFICE`, or `REVIEW`). Commercial replies create/update an Opportunity. NVIDIA may draft a next response.

Expected outcome: the Opportunity Inbox prioritizes call-relevant conversations; the owner edits/reviews and explicitly sends any drafted reply.

## 10. Move toward a booked call

Owner manually marks the opportunity `READY_TO_BOOK` when appropriate, shares an existing calendar link or arranges the meeting externally, and marks `BOOKED` when confirmed.

Expected outcome: LeadRadar records the commercial outcome without owning calendar scheduling in V1.
