# LeadRadar Browser Review Checklist

Use for user-facing tickets when browser tooling is available. Report only what was actually inspected.

## Viewports

- Desktop width relevant to the application shell/data tables.
- Mobile width with navigation, forms, tables/cards, and action controls usable without hidden critical actions.

## Core screens when affected

- Login
- Dashboard
- New Campaign
- Campaign Detail
- Leads
- Opportunities Inbox
- Prospect / Conversation Detail
- Vertical Settings

## States

Check the applicable:

- loading;
- empty/no-results;
- validation error;
- provider/job processing;
- partial failure/retry visibility;
- manual review state;
- campaign approval/reapproval state;
- suppression/policy blocked or review state;
- success/completion state.

## Safety UX

When outreach/reply flows are affected, verify that:

- first outbound cannot occur before explicit campaign approval;
- blocked/suppressed/unverified records cannot be released automatically;
- a genuine reply produces an immediate deterministic pause before classification;
- AI-drafted conversational replies require human review/edit/send;
- uncertain policy/qualification/reply cases visibly route to review rather than being silently auto-approved.

## Quality checks

- Keyboard navigation and visible focus where applicable.
- Accessible labels/names for inputs and controls.
- Clear status/error language without relying only on colour.
- Console errors.
- Failed/unexpected network requests.
- No secrets/private provider payloads rendered to the client.

Application browser verification is currently `Not run` because runtime implementation has not started.
