# Changelog

All notable changes to this project are documented here.

## [1.0.0] - 2026-05-12

### Released
- Published **tenant-access-control-plane** as the flagship full-stack access-governance repo in the portfolio.
- Brought together GraphQL contracts, role-aware workflows, identity-boundary reasoning, and production delivery assets in one control-plane story.
- Positioned the repo around the real operating problem: access decisions are often explainability problems before they are UI problems.

### Why this mattered
- Many modern stacks can approve access requests. Far fewer can explain tenant-boundary risk, reviewer accountability, and control intent in a way platform and compliance teams can trust.
- Existing IGA workflows often pushed critical context into tickets, spreadsheets, or tribal memory.
- This release made the repo credible as a product-style control plane rather than a stack checklist.

## [0.1.0] - 2026-03-03

### Shipped
- Cut the first coherent model for tenants, roles, requests, approvals, and review pressure.
- Added the first end-to-end operator surfaces for explaining why a request should move, pause, or escalate.

## [Prototype] - 2025-06-17

### Built
- Prototyped tenant-scoped request evaluation and boundary-sensitive routing logic.
- Proved the concept against familiar failure modes such as least-privilege drift and cross-tenant review ambiguity.

## [Design Phase] - 2024-02-08

### Designed
- Chose a control-plane framing instead of another CRUD admin app.
- Anchored the design in tenant isolation, access evidence, and approval explainability.
- Kept delivery assets close to the repo so the system felt production-minded from the start.

## [Idea Origin] - 2023-05-11

### Observed
- The idea emerged from repeated enterprise cases where access requests were technically processed but operationally under-explained.
- The missing layer was a fast, legible access-control surface for platform and governance teams.