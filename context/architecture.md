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

No application/runtime architecture is implemented in the repository yet. Current repository evidence contains the approved PRD and technical specification plus this operating workspace only.

## Verified

Repository inspection confirms application implementation has not started. No runtime, data-model, provider-adapter, build, or deployment behaviour has been verified.

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
