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

Confirmed during delivery of `tickets/001-owner-login.md`:

- Sessions are server-side records in MongoDB via `express-session` + `connect-mongo`, not stateless tokens. `docs/PRD.md` §13 requires server-verifiable session data and `docs/SPEC.md` notes session state must not depend on process memory; a cleared cookie would also not satisfy the logout requirement.
- Passwords use Node's built-in `crypto.scrypt` at OWASP-aligned parameters rather than an `argon2` or `bcrypt` package. Each hash stores its own cost parameters and a unique random salt, and verification is timing-safe. The self-describing encoding leaves an argon2id migration open without touching stored data.
- Strict allowed-origin validation is the primary CSRF control; `SameSite=Lax` is defence in depth. CORS is default-deny by installing no CORS middleware, since client and API share an origin in both development and production.
- TypeScript is pinned to the 5.x line. `ts-jest` peers `typescript >=4.3 <7` and `typescript-eslint` peers `>=4.8.4 <6.1.0`, so the newest release (7.x) is not usable until both publish support.

## Unresolved

- Exact Apify Actor/provider endpoints, Hunter endpoint details, and NVIDIA model identifiers must be revalidated when implementation begins.
- Provider capability gaps that would conflict with the approved product contract require an explicit decision before implementation proceeds.

## Historical

None recorded.
