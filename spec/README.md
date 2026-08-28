# LeadRadar Ticket Specifications

`spec/` contains the repository-grounded technical contract for an approved/ready implementation ticket. This directory is distinct from the product-level V1 specification at `docs/SPEC.md`.

Each ticket spec references its source ticket and defines the smallest technical solution that fits the current repository and the locked V1 product/architecture contract. Inspect current code/tests before specifying. Do not implement runtime code while writing a spec.

A spec ready for `/plan` has no blocking technical question. Material user-owned scope/safety decisions return to `/ticket`; repository-answerable technical choices are resolved in the spec.

Prefer the same basename as the source ticket, e.g. `spec/001-foundation.md`.
