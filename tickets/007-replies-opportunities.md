---
ticket_schema: 1
status: ready
---

# 007 — Reply ingestion and opportunity workflow

## Outcome
Hunter reply events are idempotently ingested, genuine replies pause automated follow-ups before AI classification, and conversations/opportunities support human-reviewed replies through READY_TO_BOOK and BOOKED.

## Acceptance criteria
- IntegrationEvent, Conversation, Message, and Opportunity models/indexes match SPEC intent.
- Provider events are idempotently claimed before processing.
- Genuine inbound reply persists and pauses outreach deterministically before NVIDIA classification.
- NVIDIA maps to the locked reply intents with REVIEW fallback on invalid/uncertain output.
- Relevant commercial replies create/update an Opportunity and recommended action.
- NVIDIA may draft a response, but no conversational reply is sent without explicit human action.
- Opportunity Inbox and prospect/conversation detail expose required states.
- Manual READY_TO_BOOK and BOOKED controls persist correctly.
- UNSUBSCRIBE creates durable suppression before any later release.
- Tests prove pause-before-classification, webhook idempotency, suppression, and human send boundary.
