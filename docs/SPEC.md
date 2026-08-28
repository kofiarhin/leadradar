# LeadRadar V1 Technical Specification

**Status:** Approved implementation specification
**Version:** 1.0
**Date:** 2026-08-28
**Repository:** `kofiarhin/leadradar`
**Implementation status:** Not started
**Product authority:** [`docs/PRD.md`](./PRD.md)

## 1. Purpose

This specification defines the V1 technical design for LeadRadar: a reusable, single-owner, workspace-ready application that identifies potential prospects from public LinkedIn post comments, qualifies them, enriches verified business contact data, orchestrates approved outbound email, monitors replies, and surfaces commercial opportunities that can move toward a booked call.

The design intentionally uses a modular monolith with asynchronous workers and provider adapters. V1 must be simple to operate while preserving clean boundaries for future scale and provider replacement.

## 2. Locked Technology and Service Stack

### Application

- React
- Vite
- TypeScript
- Tailwind CSS
- Node.js
- Express
- MongoDB / Mongoose
- single root `package.json` using npm workspaces

### External services

- Apify — public LinkedIn post comment extraction
- NVIDIA API — qualification, reply classification, sequence/reply drafting
- Hunter — business-email discovery, verification, outbound sequences, reply integration
- MongoDB Atlas — application data store
- Heroku — web/API runtime, worker runtime, public webhook endpoints

### Testing

- Vitest for client/unit tests where appropriate
- Jest for backend tests
- integration tests for API, jobs, provider adapter contracts, and webhook idempotency

Exact provider endpoints/model/Actor identifiers must be verified at implementation time. Provider adapters must preserve the product contract even when individual provider APIs change.

## 3. Architectural Style

LeadRadar V1 is a **modular monolith**.

It is one codebase and one deployable application family, with separate web and worker process types.

```text
Browser
   │
   ▼
React/Vite client
   │ HTTPS
   ▼
Express web process
   │
   ├── Campaigns
   ├── Prospects
   ├── Signals
   ├── Qualification
   ├── Enrichment
   ├── Outreach Policy
   ├── Suppression
   ├── Outreach
   ├── Conversations
   ├── Opportunities
   └── Integrations/Webhooks
   │
   ├──────── MongoDB Atlas
   │             │
   │             └── jobs collection
   │                     │
   │                     ▼
   └────────────── Heroku worker process
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
           Apify       NVIDIA      Hunter
```

### 3.1 Why not microservices

V1 does not need independent services for qualification, enrichment, outreach, or webhooks. Module interfaces must be strong enough that those components could be separated later, but operational complexity should remain minimal until volume requires it.

## 4. Repository Structure

Recommended structure:

```text
leadradar/
├── client/
│   ├── package.json
│   └── src/
│       ├── api/
│       ├── app/
│       ├── components/
│       ├── features/
│       │   ├── auth/
│       │   ├── campaigns/
│       │   ├── leads/
│       │   ├── opportunities/
│       │   └── vertical-settings/
│       ├── pages/
│       ├── routes/
│       └── main.tsx
│
├── server/
│   ├── package.json
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       ├── worker.ts
│       ├── config/
│       ├── middleware/
│       ├── modules/
│       │   ├── auth/
│       │   ├── workspaces/
│       │   ├── verticals/
│       │   ├── campaigns/
│       │   ├── prospects/
│       │   ├── signals/
│       │   ├── qualification/
│       │   ├── enrichment/
│       │   ├── outreach-policy/
│       │   ├── suppression/
│       │   ├── outreach/
│       │   ├── conversations/
│       │   ├── opportunities/
│       │   ├── jobs/
│       │   └── integrations/
│       ├── providers/
│       │   ├── apify/
│       │   ├── nvidia/
│       │   └── hunter/
│       └── shared/
│
├── packages/
│   └── shared/
│       ├── package.json
│       └── src/
│           ├── types/
│           ├── schemas/
│           └── constants/
│
├── docs/
│   ├── PRD.md
│   └── SPEC.md
│
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

### 4.1 Module rule

Domain modules own business behavior. Provider-specific code belongs only in provider adapters/integration boundaries.

Examples:

- qualification decides **when** a prospect requires AI evaluation;
- NVIDIA adapter decides **how** to call NVIDIA;
- outreach decides **when** a lead may be released;
- Hunter adapter decides **how** to create/pause/send through Hunter.

## 5. Core Domain Model

LeadRadar must not represent the entire prospect lifecycle with one giant enum. Qualification, contact, outreach, reply intent, and opportunity state are separate dimensions.

### 5.1 Workspace

V1 has one owner and one active workspace, but all durable business records include `workspaceId`.

```ts
interface Workspace {
  _id: ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 5.2 Admin user

```ts
interface AdminUser {
  _id: ObjectId;
  workspaceId: ObjectId;
  email: string; // normalized/lowercase
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}
```

Only one active V1 admin is required.

### 5.3 VerticalProfile

```ts
type OutreachGoal = "BOOK_CALL";

interface VerticalProfile {
  _id: ObjectId;
  workspaceId: ObjectId;
  name: string;
  offer: string;
  targetRoles: string[];
  targetIndustries: string[];
  companySize?: {
    min?: number;
    max?: number;
  };
  targetRegions: string[];
  positiveSignals: string[];
  negativeSignals: string[];
  outreachGoal: OutreachGoal;
  outreachTone: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
```

V1 UI manages one profile, seeded for AI automation/software agencies.

### 5.4 Campaign

```ts
type CampaignStatus =
  | "DRAFT"
  | "DISCOVERING"
  | "PROCESSING"
  | "READY_FOR_REVIEW"
  | "APPROVED"
  | "SENDING"
  | "COMPLETED"
  | "PARTIAL_FAILURE"
  | "FAILED"
  | "CANCELLED";

type SequenceApprovalStatus =
  | "NOT_GENERATED"
  | "DRAFT"
  | "APPROVED"
  | "REAPPROVAL_REQUIRED";

interface Campaign {
  _id: ObjectId;
  workspaceId: ObjectId;
  verticalProfileId: ObjectId;
  verticalProfileVersion: number;
  name: string;
  source: {
    platform: "LINKEDIN";
    postUrl: string;
  };
  status: CampaignStatus;
  discovery?: {
    provider: "APIFY";
    runId?: string;
    startedAt?: Date;
    completedAt?: Date;
  };
  sequence: {
    approvalStatus: SequenceApprovalStatus;
    draftVersion: number;
    approvedVersion?: number;
    approvedAt?: Date;
    steps: CampaignSequenceStep[];
  };
  metricsSnapshot: {
    signals: number;
    uniqueProspects: number;
    qualified: number;
    verified: number;
    eligible: number;
    contacted: number;
    replies: number;
    opportunities: number;
    readyToBook: number;
    booked: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

Campaign metrics may be recomputed from authoritative records; the snapshot exists for fast UI reads and must not become a competing source of truth.

### 5.5 CampaignSequenceStep

```ts
interface CampaignSequenceStep {
  order: number;
  delayDays: number;
  subject?: string;
  body: string;
}
```

V1 supports 2–3 steps.

### 5.6 Prospect

```ts
type QualificationStatus =
  | "PENDING"
  | "QUALIFIED"
  | "REVIEW"
  | "REJECTED"
  | "ERROR";

type ContactStatus =
  | "NOT_ENRICHED"
  | "ENRICHING"
  | "VERIFIED"
  | "NOT_FOUND"
  | "INVALID"
  | "REVIEW"
  | "ERROR";

type OutreachStatus =
  | "NOT_ELIGIBLE"
  | "ELIGIBLE"
  | "QUEUED"
  | "CONTACTED"
  | "PAUSED"
  | "REPLIED"
  | "COMPLETED"
  | "BLOCKED"
  | "ERROR";

type ReplyIntent =
  | "POSITIVE"
  | "QUESTION"
  | "LATER"
  | "REFERRAL"
  | "NEGATIVE"
  | "UNSUBSCRIBE"
  | "OUT_OF_OFFICE"
  | "REVIEW";

interface Prospect {
  _id: ObjectId;
  workspaceId: ObjectId;
  identity: {
    firstName?: string;
    lastName?: string;
    displayName: string;
    linkedinUrl?: string;
    normalizedLinkedinUrl?: string;
    role?: string;
    company?: string;
    companyDomain?: string;
    location?: string;
    countryCode?: string;
    companyType?: string;
  };
  qualification: {
    status: QualificationStatus;
    confidence?: number;
    reason?: string;
    evaluatedAt?: Date;
    model?: string;
    verticalProfileVersion?: number;
  };
  contact: {
    status: ContactStatus;
    businessEmail?: string;
    normalizedEmail?: string;
    provider?: string;
    providerReference?: string;
    verificationConfidence?: number;
    verifiedAt?: Date;
  };
  outreach: {
    status: OutreachStatus;
    provider?: string;
    providerLeadId?: string;
    providerSequenceId?: string;
    activeCampaignId?: ObjectId;
    firstContactedAt?: Date;
    lastContactedAt?: Date;
    pausedAt?: Date;
  };
  latestIntent?: {
    intent: ReplyIntent;
    confidence: number;
    classifiedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### 5.7 Signal

Signals are separate documents because one Prospect may accumulate many signals across campaigns.

```ts
interface Signal {
  _id: ObjectId;
  workspaceId: ObjectId;
  prospectId: ObjectId;
  campaignId: ObjectId;
  type: "LINKEDIN_COMMENT";
  source: {
    postUrl: string;
    profileUrl?: string;
    provider: "APIFY";
    providerSignalId: string;
  };
  content: string;
  occurredAt?: Date;
  discoveredAt: Date;
  retentionClass: "QUALIFIED_DURABLE" | "REJECTED_TEMPORARY" | "REVIEW";
  expiresAt?: Date;
  createdAt: Date;
}
```

### 5.8 CampaignProspect

A join record is recommended so the same Prospect can have different campaign-specific states without mutating historical campaign meaning.

```ts
interface CampaignProspect {
  _id: ObjectId;
  workspaceId: ObjectId;
  campaignId: ObjectId;
  prospectId: ObjectId;
  primarySignalId: ObjectId;
  qualificationDecision: QualificationStatus;
  outreachPolicyDecision?: OutreachPolicyDecision;
  suppressionDecision?: "CLEAR" | "BLOCKED";
  releaseStatus:
    | "PENDING"
    | "REVIEW"
    | "READY"
    | "RELEASED"
    | "SKIPPED"
    | "BLOCKED";
  createdAt: Date;
  updatedAt: Date;
}
```

Unique `(workspaceId, campaignId, prospectId)`.

### 5.9 OutreachPolicyEvaluation

```ts
type OutreachPolicyDecision = "ALLOWED" | "REVIEW" | "BLOCKED";

interface OutreachPolicyEvaluation {
  _id: ObjectId;
  workspaceId: ObjectId;
  campaignId: ObjectId;
  prospectId: ObjectId;
  decision: OutreachPolicyDecision;
  policyVersion: string;
  reasonCodes: string[];
  evaluatedAt: Date;
}
```

The evaluation engine is deterministic. NVIDIA does not determine legal/policy eligibility.

### 5.10 Suppression

```ts
type SuppressionReason =
  | "UNSUBSCRIBE"
  | "DO_NOT_CONTACT"
  | "COMPLAINT"
  | "HARD_BOUNCE";

interface Suppression {
  _id: ObjectId;
  workspaceId: ObjectId;
  normalizedEmail?: string;
  prospectId?: ObjectId;
  reason: SuppressionReason;
  source: string;
  createdAt: Date;
}
```

A suppression record is deliberately minimal and durable.

### 5.11 Conversation

```ts
interface Conversation {
  _id: ObjectId;
  workspaceId: ObjectId;
  prospectId: ObjectId;
  campaignId?: ObjectId;
  provider: "HUNTER";
  providerThreadId?: string;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 5.12 Message

```ts
type MessageDirection = "INBOUND" | "OUTBOUND";

type MessageKind = "SEQUENCE" | "MANUAL_REPLY" | "PROSPECT_REPLY";

interface Message {
  _id: ObjectId;
  workspaceId: ObjectId;
  conversationId: ObjectId;
  prospectId: ObjectId;
  campaignId?: ObjectId;
  direction: MessageDirection;
  kind: MessageKind;
  provider: "HUNTER";
  providerMessageId: string;
  subject?: string;
  bodyText: string;
  sentAt?: Date;
  receivedAt?: Date;
  createdAt: Date;
}
```

### 5.13 Opportunity

```ts
type OpportunityStatus =
  | "OPEN"
  | "READY_TO_REPLY"
  | "READY_TO_BOOK"
  | "FOLLOW_UP_LATER"
  | "BOOKED"
  | "CLOSED_LOST";

interface Opportunity {
  _id: ObjectId;
  workspaceId: ObjectId;
  prospectId: ObjectId;
  campaignId?: ObjectId;
  conversationId: ObjectId;
  status: OpportunityStatus;
  intent: ReplyIntent;
  priority: "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
  summary: string;
  recommendedAction: string;
  followUpAt?: Date;
  bookedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 5.14 IntegrationEvent

All provider webhooks should first be recorded/idempotently claimed.

```ts
interface IntegrationEvent {
  _id: ObjectId;
  provider: "APIFY" | "HUNTER";
  providerEventId: string;
  eventType: string;
  payloadHash: string;
  status: "RECEIVED" | "PROCESSING" | "PROCESSED" | "FAILED";
  attempts: number;
  receivedAt: Date;
  processedAt?: Date;
  lastErrorCode?: string;
}
```

Do not retain unnecessary raw payload data indefinitely.

### 5.15 Job

```ts
type JobType =
  | "INGEST_DISCOVERY_RESULTS"
  | "QUALIFY_PROSPECT"
  | "ENRICH_PROSPECT"
  | "EVALUATE_OUTREACH_POLICY"
  | "RELEASE_CAMPAIGN_PROSPECT"
  | "PROCESS_REPLY"
  | "CLASSIFY_REPLY"
  | "RECOMPUTE_CAMPAIGN_METRICS"
  | "APPLY_RETENTION";

type JobStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "DEAD";

interface Job {
  _id: ObjectId;
  type: JobType;
  status: JobStatus;
  workspaceId: ObjectId;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  attempts: number;
  maxAttempts: number;
  runAfter: Date;
  lockedAt?: Date;
  lockedUntil?: Date;
  workerId?: string;
  lastErrorCode?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

## 6. MongoDB Indexes

Minimum indexes:

```text
adminUsers
- unique(email)

verticalProfiles
- workspaceId + updatedAt

campaigns
- workspaceId + createdAt desc
- workspaceId + status + updatedAt

prospects
- workspaceId + normalizedLinkedinUrl (unique sparse/partial)
- workspaceId + normalizedEmail (sparse)
- workspaceId + qualification.status + updatedAt
- workspaceId + contact.status + updatedAt
- workspaceId + outreach.status + updatedAt

signals
- unique(workspaceId + source.provider + source.providerSignalId)
- workspaceId + prospectId + discoveredAt desc
- workspaceId + campaignId + discoveredAt
- expiresAt TTL where applicable

campaignProspects
- unique(workspaceId + campaignId + prospectId)
- campaignId + releaseStatus

outreachPolicyEvaluations
- campaignId + prospectId + evaluatedAt desc

suppressions
- workspaceId + normalizedEmail (unique sparse/partial)
- workspaceId + prospectId (sparse)

conversations
- workspaceId + prospectId + lastMessageAt desc
- provider + providerThreadId (unique sparse)

messages
- provider + providerMessageId (unique)
- conversationId + createdAt

opportunities
- workspaceId + status + updatedAt desc
- workspaceId + prospectId + updatedAt desc

integrationEvents
- unique(provider + providerEventId)
- status + receivedAt

jobs
- unique(idempotencyKey)
- status + runAfter
- lockedUntil
```

Index definitions should use partial filters where fields are optional to avoid accidental uniqueness conflicts on null values.

## 7. Provider Interfaces

Provider contracts belong in application code; provider implementations adapt remote APIs into these contracts.

### 7.1 EngagementProvider

```ts
interface EngagementProvider {
  startPublicPostCommentDiscovery(input: {
    postUrl: string;
    callbackUrl: string;
    correlationId: string;
  }): Promise<{
    runId: string;
  }>;

  getPublicPostCommentResults(runId: string): Promise<PublicCommentResult[]>;
}
```

`PublicCommentResult` must contain a provider-stable comment identifier, comment text, and enough public identity metadata to resolve a Prospect when available.

#### Apify requirements

- only use an Actor/provider path that supports the locked public-comment behavior;
- LeadRadar must never accept/store LinkedIn passwords, cookies, or session tokens;
- if the selected Actor requires authenticated LinkedIn state, the adapter must fail with a configuration/capability error rather than requesting those credentials from the user.

### 7.2 IntelligenceProvider

```ts
interface IntelligenceProvider {
  qualifyProspect(input: QualificationInput): Promise<QualificationResult>;
  classifyReply(input: ReplyClassificationInput): Promise<ReplyClassificationResult>;
  draftSequence(input: SequenceDraftInput): Promise<SequenceDraftResult>;
  draftReply(input: ReplyDraftInput): Promise<ReplyDraftResult>;
}
```

Although four methods exist, there are three AI responsibility categories: qualification, reply intelligence, and drafting.

#### NVIDIA requirements

- server-side API key only;
- configurable model identifier;
- structured JSON/schema output for qualification and classification;
- request timeout;
- limited retry for transient or schema-format failure;
- persist model identifier and relevant prompt/schema version, not hidden reasoning;
- do not persist secrets in prompt logs;
- confidence below the configured threshold routes to `REVIEW`.

### 7.3 EnrichmentProvider

```ts
interface EnrichmentProvider {
  findBusinessEmail(input: ProspectIdentityInput): Promise<EmailLookupResult>;
  verifyEmail(email: string): Promise<EmailVerificationResult>;
}
```

Hunter is V1 implementation.

Enrichment results must preserve provider provenance and normalized verification state.

### 7.4 OutreachProvider

```ts
interface OutreachProvider {
  releaseLead(input: ReleaseLeadInput): Promise<OutreachLeadReference>;
  pauseLead(input: PauseLeadInput): Promise<void>;
  sendManualReply(input: SendReplyInput): Promise<SendReplyResult>;
  getThread?(input: GetThreadInput): Promise<ProviderThread>;
}
```

Hunter is V1 implementation.

Mailbox connection/management stays outside LeadRadar and is configured in Hunter.

## 8. API Surface

All protected endpoints are scoped to the authenticated workspace. IDs from the client must never establish authorization by themselves.

Recommended base prefix: `/api/v1`.

### 8.1 Auth

```text
POST /api/v1/auth/login
POST /api/v1/auth/logout
GET  /api/v1/auth/session
```

#### Login request

```json
{
  "email": "owner@example.com",
  "password": "..."
}
```

Response does not expose password hash or provider secrets.

### 8.2 Vertical profile

```text
GET   /api/v1/vertical-profile
PATCH /api/v1/vertical-profile
```

Updating the profile increments `version`.

Campaigns retain the profile version used for qualification/outreach context.

### 8.3 Campaigns

```text
POST /api/v1/campaigns
GET  /api/v1/campaigns
GET  /api/v1/campaigns/:campaignId
POST /api/v1/campaigns/:campaignId/generate-sequence
PATCH /api/v1/campaigns/:campaignId/sequence
POST /api/v1/campaigns/:campaignId/approve
POST /api/v1/campaigns/:campaignId/cancel
```

#### Create campaign

Request:

```json
{
  "name": "AI automation prospects",
  "linkedinPostUrl": "https://www.linkedin.com/..."
}
```

Response: `202 Accepted` or `201 Created` with campaign immediately persisted; discovery is asynchronous.

### 8.4 Campaign prospects

```text
GET  /api/v1/campaigns/:campaignId/prospects
POST /api/v1/campaigns/:campaignId/prospects/:prospectId/resolve-review
```

Manual review action accepts explicit decisions, not arbitrary hidden AI overrides.

### 8.5 Leads

```text
GET /api/v1/leads
GET /api/v1/leads/:prospectId
```

Supported V1 query filters may include:

- `q`;
- qualification status;
- contact status;
- outreach status;
- latest intent;
- opportunity status;
- campaign ID;
- pagination cursor/page.

### 8.6 Opportunities

```text
GET   /api/v1/opportunities
GET   /api/v1/opportunities/:opportunityId
PATCH /api/v1/opportunities/:opportunityId
POST  /api/v1/opportunities/:opportunityId/draft-reply
POST  /api/v1/opportunities/:opportunityId/send-reply
```

Allowed manual status transitions include `READY_TO_REPLY`, `READY_TO_BOOK`, `FOLLOW_UP_LATER`, `BOOKED`, and `CLOSED_LOST` subject to validation.

### 8.7 Dashboard

```text
GET /api/v1/dashboard
```

Returns precomputed/aggregated metrics and recent hot opportunities.

### 8.8 Webhooks

```text
POST /api/v1/webhooks/apify
POST /api/v1/webhooks/hunter
```

Webhook handlers must:

1. validate provider authenticity/signature/secret when supported;
2. obtain/derive a stable event ID;
3. insert/claim `IntegrationEvent` idempotently;
4. respond quickly;
5. enqueue processing;
6. never run long AI/enrichment work inline.

## 9. Authentication and Session Design

### 9.1 Seeded owner

Environment configuration contains the intended admin email and initial credential input used only for controlled initialization/rotation. The final implementation must ensure MongoDB stores a password hash, never plaintext.

Recommended variables:

```text
ADMIN_EMAIL
ADMIN_INITIAL_PASSWORD
SESSION_SECRET
```

Do not repeatedly overwrite a changed stored password on every restart merely because an environment value exists. Initialization must be explicit/idempotent.

### 9.2 Password hashing

Use a current password-hashing algorithm/library appropriate for Node.js, with parameters reviewed at implementation time.

### 9.3 Session cookie

Recommended properties in production:

```text
HttpOnly=true
Secure=true
SameSite=Lax
Path=/
```

The implementation must include CSRF-aware protection for state-changing requests appropriate to the cookie/session approach.

### 9.4 Authorization

Every protected query is scoped by authenticated `workspaceId` on the server.

Never perform:

```ts
Model.findById(req.params.id)
```

for a workspace-owned business record without also enforcing workspace ownership.

## 10. Job Queue Design

V1 uses MongoDB as the queue persistence layer.

### 10.1 Worker model

Heroku process types:

```text
web:    Express API + static React build
worker: background job loop
```

The worker polls/awaits eligible jobs, claims work atomically, executes it, and releases/completes the job.

### 10.2 Claim semantics

A worker claims a job only when:

- `status=PENDING`, or a prior lease expired;
- `runAfter <= now`;
- lease update succeeds atomically.

Claim update sets:

- `status=RUNNING`;
- `lockedAt`;
- `lockedUntil`;
- `workerId`;
- increments attempts at the defined execution boundary.

### 10.3 Lease recovery

If a worker crashes, another worker may reclaim only after `lockedUntil` expires.

Operations must therefore be idempotent at the domain/provider boundary.

### 10.4 Retry policy

Classify failures as:

- transient/provider rate limit;
- timeout/network;
- invalid provider response;
- validation/domain failure;
- permanent configuration failure;
- state-changing unknown outcome.

Recommended behavior:

- transient read/AI/enrichment failures: bounded exponential backoff;
- schema-invalid NVIDIA result: one bounded retry with stricter repair request, then `REVIEW`/error;
- deterministic validation failures: no automatic retry;
- state-changing send with unknown outcome: reconcile via provider/idempotency key before retrying;
- exhausted jobs: `DEAD` with visible failure state.

### 10.5 Queue abstraction

```ts
interface JobQueue {
  enqueue<T>(job: EnqueueJob<T>): Promise<void>;
  claim(workerId: string): Promise<Job | null>;
  succeed(jobId: ObjectId): Promise<void>;
  fail(jobId: ObjectId, error: JobError): Promise<void>;
}
```

This keeps a future migration to Redis/SQS possible without rewriting domain modules.

## 11. End-to-End Pipeline

### 11.1 Campaign creation

```text
POST /campaigns
→ validate URL
→ snapshot vertical profile version
→ create Campaign(DISCOVERING)
→ enqueue/start discovery operation
→ return campaign to client
```

### 11.2 Discovery start

Worker/application integration:

```text
Campaign
→ EngagementProvider.startPublicPostCommentDiscovery()
→ persist runId
→ wait for webhook or scheduled reconciliation
```

### 11.3 Apify completion

```text
Apify webhook
→ IntegrationEvent upsert/claim
→ enqueue INGEST_DISCOVERY_RESULTS
→ HTTP 2xx quickly
```

### 11.4 Ingestion

For each result:

1. normalize LinkedIn URL/name;
2. idempotently upsert Signal by provider signal ID;
3. resolve/upsert canonical Prospect;
4. idempotently upsert CampaignProspect;
5. enqueue `QUALIFY_PROSPECT` keyed by campaign/prospect/signal/profile version.

### 11.5 Qualification

```text
job
→ load campaign profile version/context
→ load Prospect + relevant Signal
→ NVIDIA structured qualification
→ validate schema
→ persist campaign/prospect qualification
```

Transitions:

```text
QUALIFIED → enqueue ENRICH_PROSPECT
REVIEW    → wait for user
REJECTED  → mark Signal temporary retention; stop
ERROR     → visible failure/review path
```

### 11.6 Enrichment

```text
QUALIFIED
→ set contact ENRICHING
→ Hunter find business email
→ verify email
→ normalize result
```

On `VERIFIED`:

```text
→ enqueue EVALUATE_OUTREACH_POLICY
```

No email guessing in LeadRadar.

### 11.7 Outreach policy

The deterministic policy evaluator uses available fields such as:

- country/region;
- company type/business classification;
- email type;
- policy configuration/version.

Result is persisted.

```text
ALLOWED → continue to suppression/release readiness
REVIEW  → user decision required
BLOCKED → mark CampaignProspect BLOCKED
```

Unknown required facts default to `REVIEW`.

### 11.8 Suppression

Immediately before prospect release:

```text
check workspace suppression
check duplicate active campaign/outreach relationship
check active conversation constraints
```

Any suppression result blocks sending.

The suppression check is repeated at actual release time even if previously checked.

### 11.9 Sequence generation

NVIDIA input includes:

- vertical profile snapshot;
- campaign source context available to LeadRadar;
- offer and goal;
- tone.

Output is validated to 2–3 sequence steps.

The user may edit them.

Editing after approval increments the sequence version and sets `REAPPROVAL_REQUIRED` until explicitly approved again.

### 11.10 Campaign approval

Approval records:

- approved sequence version;
- approval timestamp;
- identity of owner/session actor where useful;
- eligible prospect set is not required to be frozen forever, but every prospect released later must pass the approved campaign rules, current policy, and current suppression check.

No release occurs while approval status is not `APPROVED`.

### 11.11 Prospect release

For each ready CampaignProspect:

1. confirm campaign is approved;
2. confirm verified business email;
3. re-evaluate/current-check policy as required;
4. check suppression;
5. create deterministic provider/idempotency correlation key;
6. call Hunter adapter;
7. persist provider references;
8. mark released/contacted only from confirmed provider outcome or reconciled state.

### 11.12 Reply webhook

Critical ordering:

```text
Hunter reply webhook
→ validate/idempotently claim event
→ persist inbound Message
→ mark Prospect outreach REPLIED/PAUSED
→ call OutreachProvider.pauseLead()
→ create PROCESS/CLASSIFY job
→ acknowledge/retry-safe processing
```

If provider pause temporarily fails, the LeadRadar state must still show the reply and a high-priority pause failure requiring retry/reconciliation. It must not silently continue as if safe.

### 11.13 Reply classification

NVIDIA receives only the context required:

- relevant conversation messages;
- vertical profile/offer context;
- latest prospect identity/signal summary.

Validated result:

```ts
interface ReplyClassificationResult {
  intent: ReplyIntent;
  confidence: number;
  summary: string;
  recommendedAction:
    | "REPLY"
    | "BOOK_CALL"
    | "FOLLOW_UP_LATER"
    | "STOP"
    | "REVIEW";
}
```

### 11.14 Opportunity upsert

Mapping example:

```text
POSITIVE + BOOK_CALL        → OPEN/READY_TO_BOOK, HIGH
POSITIVE + REPLY            → READY_TO_REPLY, HIGH
QUESTION                    → READY_TO_REPLY, MEDIUM/HIGH
REFERRAL                    → OPEN/READY_TO_REPLY
LATER                       → FOLLOW_UP_LATER
NEGATIVE                    → CLOSED_LOST
UNSUBSCRIBE                 → CLOSED_LOST + Suppression
OUT_OF_OFFICE               → no sales opportunity unless manually promoted
REVIEW                      → review queue
```

Do not rely solely on a numeric score in V1. Explicit intent/status is easier to reason about.

### 11.15 Reply drafting and sending

NVIDIA creates editable draft text.

`POST /opportunities/:id/send-reply` requires explicit user action and uses the Hunter outreach adapter.

The server persists the confirmed outbound Message/provider reference.

### 11.16 Booking

No scheduling integration.

The user may:

```text
OPEN/READY_TO_REPLY → READY_TO_BOOK
READY_TO_BOOK       → BOOKED
```

`BOOKED` stores `bookedAt` and remains part of durable outcome history.

## 12. Deduplication Strategy

### 12.1 Prospect identity

Primary V1 key when available:

```text
workspaceId + normalized LinkedIn profile URL
```

Normalization should remove irrelevant URL variations while preserving canonical public identity.

If no profile URL exists, LeadRadar may use a conservative secondary identity resolver based on provider-stable identity/name/company, but ambiguous identity must not merge two people automatically.

Verified normalized email may later support secondary matching, but merging prospect records must remain conservative.

### 12.2 Signal identity

```text
workspaceId + provider + providerSignalId
```

### 12.3 Campaign prospect

```text
workspaceId + campaignId + prospectId
```

### 12.4 Message identity

```text
provider + providerMessageId
```

### 12.5 Integration event identity

```text
provider + providerEventId
```

### 12.6 Job identity

Each logical operation gets an idempotency key, for example:

```text
qualify:<campaignId>:<prospectId>:<signalId>:<verticalVersion>
enrich:<prospectId>:<qualificationTimestampOrVersion>
release:<campaignId>:<prospectId>:<sequenceVersion>
classify-reply:<messageId>:<classifierVersion>
```

## 13. Outreach Policy Module

This module must remain independent of qualification AI.

```ts
interface OutreachPolicyService {
  evaluate(input: OutreachPolicyInput): OutreachPolicyResult;
}
```

### Rules

- global discovery is permitted by product scope;
- policy controls only automated outreach eligibility;
- rules are deterministic/configurable/versioned;
- missing material facts => `REVIEW`;
- `BLOCKED` cannot be overridden by NVIDIA;
- suppression cannot be overridden by policy;
- human review decisions must be auditable;
- adding a jurisdiction should be a policy/config change, not a rewrite of Campaign/Prospect modules.

Before production outreach, policy content must be reviewed for target jurisdictions; this specification defines the mechanism, not jurisdiction-specific legal advice.

## 14. Suppression Module

```ts
interface SuppressionService {
  canContact(input: {
    workspaceId: ObjectId;
    prospectId: ObjectId;
    normalizedEmail: string;
    campaignId: ObjectId;
  }): Promise<{
    allowed: boolean;
    reason?: string;
  }>;

  suppress(input: CreateSuppressionInput): Promise<Suppression>;
}
```

### Mandatory behavior

- unsubscribe creates/ensures suppression before any future automated send;
- hard bounce/complaint may create suppression according to provider event semantics;
- suppression check runs at release time;
- suppression is workspace-global, not campaign-local;
- the minimal suppression record may outlive deletion/minimization of broader prospect data.

## 15. Retention

### Rejected prospects/signals

Default rejected discovery retention: 30 days.

Implementation options:

- `expiresAt` + MongoDB TTL for purely temporary Signal/provider artifacts;
- periodic `APPLY_RETENTION` job where minimization/business rules are more nuanced.

Do not TTL a canonical Prospect automatically if it has durable qualified/conversation/opportunity relationships.

### Qualified prospects

Durable unless manually deleted under a future data-management flow.

### Messages/opportunities

Durable V1 product records, subject to future retention controls.

### Provider payloads

Minimize. Avoid storing complete raw webhook/provider payloads unless required for bounded troubleshooting; prefer normalized fields + hashes/IDs.

## 16. Error Model

Use a structured API/application error shape.

```ts
interface AppErrorResponse {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: Record<string, unknown>;
  };
}
```

Suggested error families:

```text
AUTH_INVALID_CREDENTIALS
AUTH_REQUIRED
FORBIDDEN
VALIDATION_ERROR
CAMPAIGN_NOT_FOUND
PROSPECT_NOT_FOUND
INVALID_LINKEDIN_POST_URL
DISCOVERY_PROVIDER_ERROR
DISCOVERY_REQUIRES_UNSUPPORTED_AUTH
AI_PROVIDER_ERROR
AI_INVALID_RESPONSE
ENRICHMENT_PROVIDER_ERROR
EMAIL_NOT_FOUND
EMAIL_NOT_VERIFIED
OUTREACH_POLICY_REVIEW_REQUIRED
OUTREACH_POLICY_BLOCKED
PROSPECT_SUPPRESSED
CAMPAIGN_APPROVAL_REQUIRED
CAMPAIGN_REAPPROVAL_REQUIRED
OUTREACH_PROVIDER_ERROR
WEBHOOK_INVALID
WEBHOOK_DUPLICATE
JOB_FAILED
```

Client copy can be friendlier, but error codes remain stable for behavior/tests.

## 17. Webhook Security and Idempotency

For each provider:

1. use provider-supported signature/secret verification when available;
2. reject malformed requests before domain processing;
3. never trust entity IDs from webhook payloads without matching stored provider references/correlation data;
4. derive/store stable `providerEventId`;
5. unique index prevents duplicate processing;
6. acknowledge quickly after durable event/job persistence;
7. sensitive payload values are redacted from logs;
8. replay/out-of-order events must not move domain state backward incorrectly.

Where a provider does not expose a suitable signed webhook mechanism, implementation must document the compensating controls (unguessable endpoint secret/correlation, provider lookup/reconciliation, allowlisting where practical) before production use.

## 18. Rate Limits and Concurrency

Provider concurrency is independently configurable.

Recommended configuration concepts:

```text
APIFY_MAX_CONCURRENCY
NVIDIA_MAX_CONCURRENCY
HUNTER_ENRICHMENT_MAX_CONCURRENCY
HUNTER_OUTREACH_MAX_CONCURRENCY
WORKER_CONCURRENCY
```

These are operational controls, not hardcoded values in domain modules.

On provider `429` or explicit rate limit signals:

- respect `Retry-After` where provided;
- reschedule job with bounded backoff;
- do not spin rapidly;
- surface persistent provider throttling on campaign status/operations view.

## 19. NVIDIA Structured Output Contracts

### 19.1 QualificationResult

```ts
interface QualificationResult {
  decision: "QUALIFIED" | "REVIEW" | "REJECTED";
  confidence: number; // 0..1
  reason: string;
}
```

Schema constraints:

- no unknown decision values;
- confidence finite and within range;
- reason concise and suitable for user display;
- no hidden reasoning/chain-of-thought persisted.

### 19.2 ReplyClassificationResult

```ts
interface ReplyClassificationResult {
  intent:
    | "POSITIVE"
    | "QUESTION"
    | "LATER"
    | "REFERRAL"
    | "NEGATIVE"
    | "UNSUBSCRIBE"
    | "OUT_OF_OFFICE"
    | "REVIEW";
  confidence: number;
  summary: string;
  recommendedAction:
    | "REPLY"
    | "BOOK_CALL"
    | "FOLLOW_UP_LATER"
    | "STOP"
    | "REVIEW";
}
```

### 19.3 SequenceDraftResult

```ts
interface SequenceDraftResult {
  steps: Array<{
    delayDays: number;
    subject?: string;
    body: string;
  }>;
}
```

Validate `steps.length` is 2 or 3 in V1.

### 19.4 ReplyDraftResult

```ts
interface ReplyDraftResult {
  body: string;
}
```

No automatic send.

## 20. Client State and Data Fetching

Recommended pattern:

- TanStack Query for server state;
- local component state for transient form/UI state;
- Redux Toolkit only if genuinely needed for cross-screen client-only state; it is not required by default.

API logic must stay outside React components.

Campaign detail should poll/refetch while active or use a lightweight future event mechanism. V1 does not require WebSockets.

## 21. UI Route Map

Recommended routes:

```text
/login
/
/campaigns/new
/campaigns/:campaignId
/leads
/leads/:prospectId
/opportunities
/opportunities/:opportunityId
/settings/vertical
```

### Navigation

```text
Dashboard
Campaigns
Leads
Opportunities
Settings
```

`New Campaign` should be a prominent action, not necessarily a permanent nav item.

## 22. Dashboard Query Model

Dashboard response may use aggregation/precomputed snapshot:

```ts
interface DashboardSummary {
  activeCampaigns: number;
  qualifiedLeads: number;
  verifiedLeads: number;
  positiveOpportunities: number;
  readyToBook: number;
  bookedCalls: number;
  recentCampaigns: CampaignSummary[];
  hotOpportunities: OpportunitySummary[];
}
```

Prioritize outcomes over scrape/send vanity metrics.

## 23. Campaign Approval Semantics

Campaign approval is a material state gate.

Approval requires:

- sequence draft exists;
- 2–3 valid steps;
- no unresolved global campaign configuration error;
- owner explicitly submits approval action.

Prospects may continue processing asynchronously, but a prospect can only be released after:

```text
campaign sequence approved
AND qualification qualified
AND verified business email
AND outreach policy allowed (or manually cleared review)
AND suppression clear
```

Editing approved sequence content changes sequence version and prevents release of unsent prospects until re-approved.

Already-sent messages are historical and are never rewritten.

## 24. Prospect Review Semantics

Manual review must exist for uncertainty without creating a generic workflow-builder.

Review reasons include:

- NVIDIA qualification uncertainty;
- contact verification uncertainty;
- ambiguous jurisdiction/business type;
- provider-data mismatch;
- reply classification uncertainty.

The UI presents the reason and allowed decisions for that review category.

Manual decisions are persisted with timestamp/source and may override an AI `REVIEW`, but may not override deterministic suppression or `BLOCKED` outreach policy unless a future specifically authorized policy-administration flow exists.

## 25. Observability

### 25.1 Request correlation

Every API request should have a `requestId`.

### 25.2 Structured logging

Logs should include safe correlation fields:

```text
requestId
workspaceId
campaignId
prospectId
conversationId
jobId
provider
operation
errorCode
```

Do not log:

- passwords;
- session secrets;
- API keys;
- full authentication headers;
- unnecessary full conversation/provider payloads.

### 25.3 Operational metrics

Track at minimum:

- campaign discovery success/failure;
- qualification latency/failure/review rate;
- enrichment success/not-found/invalid rate;
- outreach-policy decision distribution;
- suppression blocks;
- provider 429/error rate;
- job latency/retry/dead count;
- reply classification rate/error;
- positive opportunities;
- ready-to-book/booked outcomes.

## 26. Heroku Runtime Topology

V1 target topology:

```text
Heroku app
├── web process
│   ├── serves built React client
│   ├── Express API
│   └── public webhooks
└── worker process
    └── MongoDB job processing

MongoDB Atlas
└── application data + job persistence
```

Environment configuration should include only required secrets/configuration, e.g.:

```text
NODE_ENV
PORT (Heroku supplied)
APP_URL
MONGODB_URI
SESSION_SECRET
ADMIN_EMAIL
ADMIN_INITIAL_PASSWORD
APIFY_TOKEN
APIFY_ACTOR_ID (or equivalent provider config)
APIFY_WEBHOOK_SECRET/correlation config where supported
NVIDIA_API_KEY
NVIDIA_BASE_URL
NVIDIA_MODEL
HUNTER_API_KEY
HUNTER_SEQUENCE_ID/config references
HUNTER_WEBHOOK_SECRET/correlation config where supported
```

The actual variable names may be refined during implementation, but secrets must never be committed.

## 27. Build and Runtime Model

One root package orchestrates workspaces.

Expected root scripts after implementation may include:

```text
npm run dev
npm test
npm run lint
npm run typecheck
npm run build
npm start
npm run worker
```

Heroku production build compiles client/server/shared packages. Express may serve the static Vite build so one public app URL handles UI, API, and webhooks.

## 28. Security Requirements

- HTTPS in production;
- secure session cookies;
- strong session secret;
- hashed passwords;
- login rate limiting;
- protected routes default-deny unauthenticated access;
- workspace-scoped database queries;
- input validation on all external boundaries;
- webhook authentication/correlation controls;
- server-only provider credentials;
- no LinkedIn credentials/cookies accepted or persisted;
- outbound provider calls contain minimum necessary personal data;
- suppression enforced before send;
- errors do not leak provider tokens/raw secret-bearing payloads;
- dependency/security review before production deployment.

## 29. Privacy/Data Minimization Requirements

- collect only data needed for qualification/contact/workflow;
- preserve source/provenance for material enriched data;
- rejected discovery data defaults to 30-day retention;
- avoid retaining full raw provider responses indefinitely;
- durable qualified prospects retain relevant signal/outcome history;
- support future prospect deletion/minimization without deleting required minimal suppression records;
- do not infer/store sensitive personal attributes for qualification;
- qualification is professional/commercial relevance, not sensitive-trait profiling.

## 30. Failure Scenarios

### Invalid LinkedIn URL

Reject campaign creation with `INVALID_LINKEDIN_POST_URL`.

### Public post unavailable

Campaign becomes `FAILED` or `PARTIAL_FAILURE` with actionable discovery error; no credential request fallback.

### Apify requires LinkedIn session auth

Fail with `DISCOVERY_REQUIRES_UNSUPPORTED_AUTH`; do not collect a cookie.

### Zero comments

Campaign completes discovery successfully with zero prospects; not a provider failure.

### Duplicate comment webhook/result

Unique Signal key prevents duplicate processing.

### NVIDIA timeout

Retry transiently within bounds; eventually mark review/error without enrichment progression.

### NVIDIA invalid JSON/schema

One bounded repair/retry; then review/error.

### No email found

Contact `NOT_FOUND`; stop automatic path.

### Invalid email

Contact `INVALID`; stop automatic path.

### Hunter unavailable

Job retry/backoff; no send bypass.

### Policy uncertainty

`REVIEW`; no automatic release.

### Suppressed email

Block release.

### Duplicate release job

Idempotency key + provider reconciliation prevents duplicate outreach.

### Prospect replies while pause provider call fails

Persist reply and local paused/replied state; retry/reconcile provider pause urgently; surface failure.

### Duplicate reply webhook

Unique IntegrationEvent/Message IDs prevent duplicate message/opportunity processing.

### Out-of-order webhook

Domain transition validation prevents older provider events from overwriting newer terminal/current state incorrectly.

### Unsubscribe

Persist inbound message, pause outreach, create suppression, close/suppress opportunity as appropriate before any future send.

### Out-of-office

Pause on genuine reply per V1 rule; classify as `OUT_OF_OFFICE`; do not automatically create a sales opportunity. Future resume behavior requires explicit product scope.

## 31. TDD and Verification Strategy

Implementation should proceed in vertical slices with tests around domain contracts before broad UI expansion.

### 31.1 Unit tests

Prioritize:

- URL validation;
- LinkedIn URL normalization;
- prospect dedupe resolver;
- outreach-policy evaluator;
- suppression decisions;
- state transition validation;
- NVIDIA output schema validation;
- provider-result normalization;
- job backoff/lease rules.

### 31.2 Integration tests

Use mocked/fake provider adapters to test:

```text
create campaign
→ ingest comments
→ dedupe
→ qualify
→ enrich
→ policy
→ suppression
→ approval gate
→ release
→ reply webhook
→ pause
→ classify
→ opportunity
```

### 31.3 Webhook idempotency tests

Prove:

- same Apify completion event twice does not duplicate signals/jobs;
- same Hunter reply twice does not duplicate messages/opportunities;
- concurrent duplicate deliveries are safe.

### 31.4 Queue tests

Prove:

- one job is claimed by one worker at a time;
- expired leases recover;
- retry/backoff works;
- idempotency key prevents duplicate logical jobs;
- dead jobs remain inspectable.

### 31.5 Client tests

Cover:

- login/protected routing;
- create-campaign validation;
- campaign state rendering;
- review/approval gate;
- leads filters;
- Opportunity Inbox categories;
- reply draft edit/send confirmation;
- manual booked transition.

### 31.6 Build gates

Before an implementation PR can be considered verified, run the project's available equivalent of:

```bash
npm ci
npm test
npm run lint
npm run typecheck
npm run build
```

No passing claim without actual execution evidence.

## 32. End-to-End Acceptance Scenarios

### Scenario A — successful qualified prospect

Given a public LinkedIn post with a relevant commenter,
when the comment is ingested,
then LeadRadar creates/reuses one Prospect and one Signal,
NVIDIA returns `QUALIFIED`,
Hunter returns a verified business email,
policy returns `ALLOWED`,
suppression is clear,
and the prospect becomes ready for an approved sequence.

### Scenario B — rejected prospect

Given a commenter who is outside the configured ICP and shows no relevant intent,
when NVIDIA classifies them `REJECTED`,
then no automatic enrichment/release job is created and temporary retention applies.

### Scenario C — approval gate

Given verified/eligible prospects and a generated sequence,
when the owner has not approved the campaign,
then no prospect is released to Hunter.

### Scenario D — edited approved sequence

Given an approved sequence,
when its copy is edited,
then unsent prospects are blocked until the new version is approved.

### Scenario E — genuine reply

Given a contacted prospect,
when Hunter sends a genuine inbound-reply event,
then the message is persisted idempotently and automated follow-ups are paused before NVIDIA classification.

### Scenario F — positive reply

Given an inbound reply asking to talk,
when NVIDIA classifies it as positive with `BOOK_CALL`,
then LeadRadar creates/updates a high-priority `READY_TO_BOOK` Opportunity.

### Scenario G — unsubscribe

Given an inbound unsubscribe request,
when processed,
then LeadRadar pauses outreach, creates durable suppression, and prevents that prospect/email from being automatically contacted in future campaigns.

### Scenario H — duplicate cross-campaign prospect

Given the same LinkedIn profile appears in two campaigns,
when the second signal is ingested,
then LeadRadar reuses the canonical Prospect and appends the new Signal/campaign relationship.

### Scenario I — unsupported authenticated extraction

Given the configured Apify path cannot retrieve comments without LinkedIn session credentials,
when discovery runs,
then LeadRadar fails clearly and does not ask the user to provide LinkedIn credentials/cookies.

## 33. Scalability Path

### V1

```text
1 Heroku web process
1 Heroku worker process
MongoDB Atlas
provider concurrency limits
```

### Scale workers first

Increase worker count for independent jobs without changing domain code.

### Scale web independently

Increase web process count when API/UI/webhook traffic requires it. Session state must therefore not depend on local process memory alone.

### Queue migration later

If MongoDB polling/locking becomes a measured bottleneck, replace `JobQueue` implementation with Redis/SQS/another queue. Domain job producers/handlers remain unchanged.

### Service extraction later

Only split modules into services if measured operational/team/scaling needs justify it. Provider adapters and domain boundaries should make that possible without pre-building distributed systems.

## 34. Deferred Architecture

Explicitly deferred:

- multi-tenant signup/onboarding;
- team membership/RBAC;
- billing;
- Redis/BullMQ/SQS;
- event bus/Kafka;
- WebSockets;
- vector database;
- embeddings-based qualification;
- multiple saved vertical profiles UI;
- calendar integration;
- native mailbox OAuth;
- custom delivery infrastructure;
- autonomous AI reply agents;
- reaction/like ingestion;
- additional social networks;
- advanced CRM/custom workflow engine.

## 35. Implementation Sequence

Recommended implementation order after separate execution approval:

### Slice 1 — foundation

- monorepo/workspaces;
- Express/React/shared types;
- MongoDB;
- config validation;
- admin authentication;
- one workspace + vertical profile.

### Slice 2 — campaign + discovery

- campaign creation;
- job infrastructure;
- Apify adapter;
- webhook idempotency;
- Prospect/Signal/CampaignProspect ingestion.

### Slice 3 — qualification

- NVIDIA adapter;
- structured schema;
- qualified/review/rejected UI.

### Slice 4 — enrichment + policy

- Hunter enrichment adapter;
- email verification;
- deterministic outreach policy;
- suppression.

### Slice 5 — sequence approval + outreach

- NVIDIA sequence drafting;
- editing/versioning;
- explicit approval;
- Hunter outreach adapter;
- idempotent release.

### Slice 6 — conversations + opportunities

- Hunter reply webhook;
- immediate pause;
- Message/Conversation;
- NVIDIA classification;
- Opportunity Inbox.

### Slice 7 — reply/booking + lead database

- AI reply draft;
- human send;
- `READY_TO_BOOK`/`BOOKED`;
- searchable Leads screen;
- dashboard funnel metrics.

### Slice 8 — hardening

- retention jobs;
- rate limiting;
- provider reconciliation;
- operational metrics/logging;
- full acceptance test suite;
- deployment readiness review.

## 36. Definition of Done for V1 Implementation

Implementation is not complete merely because code exists.

V1 may be considered verified only when:

- all PRD acceptance criteria are implemented or explicitly dispositioned;
- automated tests covering critical safety/idempotency paths pass;
- lint/typecheck/build pass;
- provider capability assumptions are verified against the actual configured accounts/endpoints;
- no LinkedIn credential/session-cookie path exists;
- end-to-end staging flow is exercised on the exact revision under review;
- webhook duplicate/retry behavior is demonstrated;
- suppression/approval/reply-pause gates are demonstrated;
- secrets are absent from source/client/log evidence;
- deployment and production outreach remain separate explicit approvals.

## 37. Authority and Change Control

This specification records the approved LeadRadar V1 technical design from the Architect Shared Understanding approved on 2026-08-28.

It is authoritative for future implementation planning together with `docs/PRD.md`.

If implementation discovers that a locked provider cannot satisfy a required contract (for example, public comment extraction without LinkedIn session credentials or required outbound/reply API behavior), the implementation must stop at that boundary and propose a compatible provider/contract change. It must not silently weaken the requirement.

This specification does **not** authorize implementation, dependency installation, merge, deployment, provider provisioning, mailbox connection, or live outbound campaigns. Those require separate execution authorization and evidence-based verification.
