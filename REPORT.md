# Vigil — Project Report Notes

**Know before they notice.**

Vigil is a self-hosted API performance and uptime monitor. This submission
implements the product frontend and authentication MVP, plus a real Go API,
standalone probe worker, Asynq/Brevo email alert notifier, PostgreSQL/Redis
storage, and a Docker Compose stack. The dashboard uses deterministic sample
data with one live API status card. It does **not** claim that full UI-to-API
wiring or webhook delivery is complete. Email delivery is implemented behind
`ALERT_EMAIL_ENABLED`; real Brevo delivery still needs credentials.

## Abstract

Modern API teams need to know when an endpoint is slow or unavailable before
their customers do. Vigil is designed as a self-hosted alternative to hosted
synthetic-monitoring tools: a Go collector, PostgreSQL storage, a Redis-backed
Asynq alert queue, and a Next.js operator console. This submission delivers the
operator experience, Google-only authentication, the database schema, a
scheduled HTTP probe worker, incident creation/resolution, deduplicated Brevo
email alerts, and the service packaging. The dashboard and status page still
use deterministic sample data so the UI can be evaluated independently of the
API, except for a live status card on the dashboard that reads real API counts.

## Objectives

1. Design a clear, distinctive operator experience for API monitoring.
2. Build a responsive Next.js dashboard, public status page, and documentation.
3. Add Google-only authentication with Better Auth and a local preview store.
4. Define a PostgreSQL schema for monitors, checks, incidents, and subscriptions.
5. Build a Go API and standalone probe worker with scheduled HTTP checks,
   latency-phase measurement, check writes, and incident creation/resolution.
6. Build a deduplicated email alert path using Asynq on Redis and Brevo's
   transactional email HTTP API.
7. Package the web, API, worker, notifier, PostgreSQL, and Redis services with
   Docker Compose.
8. Label sample data and unbuilt backend behavior honestly.

## Implemented scope

### Frontend

- Next.js 16 App Router with React Compiler and Tailwind CSS 4.
- shadcn/ui and Base UI primitives with the “Paper & Signal” design language.
- Motion reveals with reduced-motion support.
- EvilCharts/Recharts latency and request-volume charts.
- Landing page, dashboard, monitor inventory/detail/create/edit, incident log,
  settings, public status page, login, and in-app documentation.
- Live API status card that reads `/api/v1/probes` and `/api/v1/monitors` with
  an offline fallback; the rest of the dashboard remains sample data.
- Responsive layouts at desktop and mobile widths.
- Command palette, filters, forms, and local-only preview interactions.

### Authentication

- Better Auth with Google as the only provider.
- No email/password route.
- SQLite preview store at `web/.data/vigil-auth.db`.
- `AUTH_REQUIRED=false` keeps the sample workspace reachable by default.
- `AUTH_REQUIRED=true` redirects unauthenticated dashboard requests to `/login`.
- Full OAuth callback behavior requires real Google credentials.

### Backend and probe worker

- Go 1.27 standard-library HTTP API.
- `GET /healthz` liveness and `GET /readyz` PostgreSQL/Redis readiness.
- `GET/POST /api/v1/monitors` and `GET /api/v1/monitors/{id}`.
- `GET /api/v1/monitors/{id}/checks`, `GET /api/v1/incidents`, and
  `GET /api/v1/probes` for recent checks and scheduler summaries.
- `GET /api/v1/alerts` for persisted email delivery attempts.
- `GET /api/v1/monitors/{id}/rollup?window=24h` for windowed check counts,
  uptime, average latency, and p50/p95/p99 latency.
- Input validation for monitor URLs, methods, intervals, timeouts, and retries.
- CORS, JSON errors, request logging, panic recovery, and graceful shutdown.
- Standalone `vigil-worker` process with a bounded pool and configurable poll
  interval.
- Worker `/healthz` and `/readyz` endpoints on port `8081`, with a Compose
  healthcheck.
- Due-monitor leasing with `next_check_at` and a 15-minute `lease_until` guard.
- HTTP probing with DNS, TCP, TLS, TTFB, and total latency measurements.
- Retry policy; only the final attempt is persisted.
- Writes to the partitioned `checks` table and advances the next check time.
- Opens one incident per failing monitor and resolves it on recovery.
- Enqueues one deduplicated email job per incident transition when
  `ALERT_EMAIL_ENABLED=true`.
- PostgreSQL 17 migrations for:
  - `monitors`
  - time-partitioned `checks` plus default partition
  - `incidents`
  - `status_subscriptions`
  - scheduler columns and due index (`0002_probe_scheduler.sql`)
  - `alert_deliveries` with unique `(incident_id, event, channel)` deduplication
    (`0003_alert_deliveries.sql`)
- Redis 8 connection for readiness and the Asynq `alerts` queue.
- Standalone `vigil-notifier` process consuming the queue and sending Brevo
  transactional email over HTTP.
- Delivery states `queued`, `sent`, `failed`, and `skipped`, with provider
  message ID, attempts, and last error persisted.
- Notifier `/healthz` and `/readyz` on port `8082`, with a Compose healthcheck.
- Email alerting is disabled by default; `ALERT_EMAIL_ENABLED=true` plus
  `BREVO_API_KEY`, `ALERT_FROM_EMAIL`, and `ALERT_TO_EMAIL` enable it.

### Packaging

- `backend/Dockerfile` builds `vigil`, `vigil-worker`, and `vigil-notifier`.
- `web/Dockerfile` builds the Next.js app.
- `docker-compose.yml` for web, API, worker, notifier, PostgreSQL, and Redis.
- Host ports: web `3000`, API `8080`, worker health `8081`, notifier health
  `8082`, PostgreSQL `5433`, Redis `6380`.
- Idempotent auth database initializer in `web/scripts/init-auth-db.mjs`.

## Architecture

```text
Browser
  |
  v
Next.js web (3000) ── Better Auth ── SQLite preview store
  |
  |  sample data + live API card; full wiring next
  v
Go API (8080) ───────────────┐
  |                          |
  v                          v
PostgreSQL 17             Redis 8 (6380)
(5433)                    Asynq "alerts" queue
  ^                          |
  |  leases monitors,        v
  |  writes checks/     Go notifier (8082) ── Brevo HTTP API
  |  incidents               |
  |                          v
Go probe worker (8081)   alert_deliveries state
```

The web app's live API status card calls `/api/v1/probes` and
`/api/v1/monitors`; the rest of the UI reads deterministic sample data from
`web/src/lib/monitors.ts`. The API stores monitors, exposes recent
checks/incidents, serves windowed SQL rollups, and lists alert delivery state.
The worker leases due monitors, performs HTTP probes, writes the final retry
result plus incident state to PostgreSQL, and enqueues deduplicated alert jobs.
The notifier consumes those jobs from Redis, sends Brevo email, and records the
result in `alert_deliveries`. Webhook routing, alert-history UI, and full
UI-to-API wiring are still future work.

## Verification performed

```bash
cd web
pnpm lint
pnpm build

cd ../backend
go test ./...
go vet ./...

cd ..
docker compose config --quiet
```

Additional checks:

- `docker compose up --build` brought web, API, worker, notifier, PostgreSQL,
  and Redis up; the API, web, worker, notifier, PostgreSQL, and Redis
  healthchecks passed.
- `/healthz` returned `200` and `/readyz` returned `ready` with PostgreSQL and
  Redis connected.
- API smoke test created, read, and listed a monitor.
- Worker end-to-end test created a success monitor at `http://api:8080/healthz`
  and a failure monitor at `http://api:8080/nope`; checks appeared under
  `/api/v1/monitors/{id}/checks`.
- The failing monitor opened one incident; after its URL was corrected to
  `/healthz`, the worker resolved that incident and recorded successful checks.
- `/api/v1/probes` returned the check/incident summary; `/api/v1/alerts`
  returned persisted delivery attempts (empty before the alert test).
- With `ALERT_EMAIL_ENABLED=false`, the notifier health endpoint returned
  `200` with `{"status":"disabled","email":"disabled"}`.
- The dashboard live API status card loaded real monitor/probe counts at
  1440px and 390px. The API returned `Access-Control-Allow-Origin:
  http://localhost:3000`, and aborting API requests showed the offline fallback.
- `/api/v1/monitors/{id}/rollup?window=24h` returned real check counts, uptime,
  and latency percentiles for the seeded monitors.
- Worker `/healthz` returned `200` and `/readyz` returned `ready` with the
  scheduler loop running.
- Alert end-to-end test against a fake Brevo HTTP endpoint: enabled the worker
  and notifier, created a failing `Alert Test API`, observed the `opened`
  delivery sent, corrected the monitor URL, observed the `resolved` delivery
  sent, and confirmed `/api/v1/alerts` returned both rows with `status: sent`
  and fake provider message IDs. This verifies queueing, request shape, and
  state transitions; retry behavior is covered by unit tests, and this is not a
  real Brevo send.
- Structured logging is enabled for the API, worker, and notifier. API request
  logs include `request_id`, status, bytes, and duration; health checks log at
  `debug` to avoid Compose healthcheck noise. Worker probe logs include attempts
  and the failure reason. `VIGIL_LOG_LEVEL` controls all three services.
- Final Playwright checks at 1440px and 390px found no console errors, page
  errors, horizontal overflow, or hidden reveals on the landing, dashboard,
  monitors, monitor detail/create/edit, incidents, settings, status, login,
  register, and docs routes.
- The final web image was smoke-tested on port `3002` because another local
  project was using port `3000`; it served the updated docs copy successfully.
- A reduced-motion audit found that `Reveal` content could remain hidden with
  `prefers-reduced-motion: reduce`; the component now forces the visible state,
  and the final smoke check confirms all reveal content is visible.
- Screenshots in `web/docs/screenshots/` were refreshed from the final
  production build after scrolling through the Motion reveals.
- A Docker-specific hydration mismatch on the incidents page was fixed by
  pinning display formatting to `Asia/Kolkata`.

## Limitations

- The rollup endpoint is not yet used by the dashboard charts; only the live
  status card calls the API for summary counts.
- No webhook alert delivery; the schema reserves the `webhook` channel.
- Email delivery is disabled by default and real Brevo sending requires
  `BREVO_API_KEY`, a verified sender, and recipients. The tested path used a
  local fake provider.
- Delivery is at-least-once: a crash after Brevo accepts a message but before
  `sent` is written can resend it.
- Only the live API status card is wired; the dashboard tables, charts, alert
  history, status page, and forms remain sample data.
- Redis is used for readiness and the Asynq alert queue; rate limiting and
  broader queue use are not implemented.
- No production authentication between the web app and API.
- Google OAuth cannot be fully exercised without `GOOGLE_CLIENT_ID` and
  `GOOGLE_CLIENT_SECRET`.
- Compose uses a local preview secret; production must supply a strong
  `BETTER_AUTH_SECRET`.
- The landing-page benchmark band is explicitly labelled as report/reference
  figures, not live production numbers.

## Next milestone

1. Verify one real Brevo opened/resolved alert when credentials are available,
   then add webhook delivery and an alert-history UI.
2. Replace the remaining sample selectors with typed API calls and persisted
   forms, including the rollup endpoint.
3. Add authentication between the web app and the API.
4. Add rate limiting, broader Redis queue use, and worker throughput/error
   metrics beyond the liveness and readiness endpoints.

## Demo

```bash
# Full stack
docker compose up --build
# http://localhost:3000
# http://localhost:8080/healthz
# http://localhost:8080/api/v1/probes

# Frontend only
cd web
pnpm install
pnpm auth:init
cp .env.example .env.local
pnpm dev
```

The worker runs as the `worker` Compose service; the notifier runs as the
`notifier` Compose service and is disabled until email credentials are set. The
worker logs show each probe and queued alert, and the API exposes recent checks,
incidents, and alert delivery attempts for inspection.

Screenshots are in `web/docs/screenshots/`.
