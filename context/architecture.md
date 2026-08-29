# LeadRadar Architecture

## Intended

LeadRadar V1 is specified as a modular monolith: one codebase and one deployable application family with separate web and worker process types.

Application stack:

- React, Vite, TypeScript, Tailwind CSS;
- Node.js, Express;
- MongoDB / Mongoose;
- one root `package.json` using npm workspaces;
- `client/`, `server/`, and `packages/shared/` boundaries.

The Express/domain layer owns campaigns, prospects, signals, qualification, enrichment, outreach policy, suppression, outreach, conversations, opportunities, jobs, and integration/webhook orchestration.

Provider-specific code is isolated behind adapters:

- Apify — public LinkedIn comment extraction;
- NVIDIA API — qualification, reply classification, sequence/reply drafting;
- Hunter — business-email discovery/verification, sequence delivery, and reply integration.

MongoDB Atlas is the authoritative application data store. MongoDB also backs asynchronous jobs. Heroku is the specified V1 runtime with separate web and worker processes.

Durable business records are workspace-scoped even though V1 has one owner/workspace. The specification separates qualification, contact, outreach, reply intent, and opportunity state rather than using one giant lifecycle enum.

## Implemented

The modular-monolith skeleton exists, limited to what owner authentication required:

- root npm workspace with `client/`, `server/`, and `packages/shared/` as specified;
- `server/src/app.ts` builds the Express app without connecting or listening; `server/src/server.ts` is the only entry that opens a port; `server/src/seed.cli.ts` is a separate explicit command;
- domain modules `auth` and `workspaces` under `server/src/modules/`; no other module and no provider adapter exists yet;
- MongoDB via Mongoose, with sessions stored in MongoDB through `connect-mongo` so session state does not depend on process memory;
- `packages/shared/` exports zod schemas, types, and error-code constants consumed by both sides; it is built to `dist/` and resolved through the workspace link;
- the client uses TanStack Query for server state with all fetch calls confined to `client/src/api/`.

Two conventions were established here that later work inherits: protected routes are grouped behind `requireAuth` so new routes are default-deny without opting in, and state-changing routes are grouped behind origin validation for the same reason.

The worker process type, job queue, and provider adapters remain unimplemented.

## Verified

Automated tests, type-checking, lint, and build pass. A real server process was exercised end to end over HTTP against an in-memory MongoDB, covering seeding, login, session reads, workspace scoping, and logout. Browser behaviour, provider integrations, workers, and deployment have not been verified.

## Constraints

- Domain modules own business behaviour; provider adapters own provider API details.
- Human approval is required before outbound and before sending AI-drafted conversational replies.
- Genuine replies pause automated follow-ups deterministically before AI classification.
- Suppression, verification eligibility, authentication, policy enforcement, and reply pausing are deterministic controls.
- Unknown outreach-policy information defaults to `REVIEW`.
- No authenticated LinkedIn scraping or LinkedIn credential/cookie storage in V1.
- Provider webhooks/jobs require idempotency and failure visibility.
- Avoid microservices/Kafka/distributed event streaming in V1.

## Unresolved

- Exact provider endpoints, NVIDIA model identifiers, and Apify Actor identifiers require implementation-time verification.
- Any provider capability mismatch that would weaken locked V1 behaviour requires an explicit technical/product decision rather than a silent workaround.
