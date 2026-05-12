# Architecture

## Goal

`tenant-access-control-plane` is a mainstream full-stack flagship. It is meant to show that the portfolio can do more than isolated language demos or static frontends. It combines:

- product shell quality
- API contract quality
- data model quality
- operational quality
- deploy story quality

## Runtime model

The app has two runtime modes.

### Local-first mode

- no external database required
- no external cache required
- PGlite stores a local Postgres-compatible dataset under `.data/`
- cache falls back to in-memory TTL storage
- demo sessions are signed locally with `jose`

### Production-shaped mode

- `DATABASE_URL` switches the app to real PostgreSQL
- `REDIS_URL` switches the app to Redis
- `OIDC_ISSUER` advertises external identity readiness
- Docker, raw Kubernetes manifests, and Helm chart are included

## Data model

The core entities are:

- `tenants`
- `memberships`
- `access_requests`
- `policy_events`

This gives the UI and GraphQL layer enough structure to show:

- tenant posture
- approval drag
- privileged request pressure
- cached policy coverage
- request-by-request event chronology

## API surface

### REST-style routes

- `/`
- `/docs`
- `/api/auth/demo-login`
- `/api/auth/logout`

### GraphQL

- `/api/graphql`

Key operations:

- `dashboardSummary`
- `tenants`
- `requests`
- `request(id)`
- `updateRequestStatus`

## Frontend shell

The UI is built to feel like a control room rather than a form app.

Primary modes:

- `Overview`
- `GraphQL`
- `Deploy`
- `Anatomy`

Zustand is used for:

- selected request state
- active surface mode

## Testing and delivery

- Vitest covers domain logic and cache behavior
- Playwright covers homepage and docs smoke flows
- GitHub Actions runs lint, unit tests, e2e, and build
- Dockerfile and Compose support a containerized local stack
- Kubernetes and Helm artifacts support platform review
