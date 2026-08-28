# LeadRadar Decisions

## Confirmed

The following decisions are supported by the approved `docs/PRD.md` and `docs/SPEC.md`:

- V1 is a single-owner application; public signup, teams, invitations, RBAC, and billing are deferred.
- All durable business records remain scoped by `workspaceId` to preserve a future multi-tenant path.
- V1 uses a modular monolith rather than microservices.
- Application stack: React + Vite + TypeScript + Tailwind, Node + Express, MongoDB/Mongoose, npm workspaces.
- MongoDB-backed asynchronous jobs support a separate web and worker runtime.
- Apify is the V1 public-comment discovery provider; authenticated LinkedIn scraping and credential/cookie storage are excluded.
- NVIDIA is the V1 AI provider for prospect qualification, reply classification, and drafting.
- Hunter is the V1 provider for business-email discovery/verification plus outbound sequence/reply integration.
- Human approval is required before a campaign begins sending.
- AI-drafted conversational replies require human review/editing and explicit send.
- Any genuine reply pauses automated follow-ups deterministically before AI classification.
- Outreach policy, suppression, verification eligibility, authentication, and reply-pausing controls are deterministic and cannot be overridden by AI.
- Unknown/insufficient outreach-policy information defaults to `REVIEW`.
- LeadRadar owns durable product truth; external providers remain replaceable adapters.
- Scheduling is manual/external in V1; the owner shares an existing calendar link and manually marks `BOOKED`.

## Unresolved

- Exact Apify Actor/provider endpoints, Hunter endpoint details, and NVIDIA model identifiers must be revalidated when implementation begins.
- Provider capability gaps that would conflict with the approved product contract require an explicit decision before implementation proceeds.

## Historical

None recorded.
