# Vigil API + workers

This is the Go HTTP API, standalone probe worker, and alert notifier for Vigil.
It stores monitors, checks, incidents, and alert delivery state in PostgreSQL 17.
Redis 8 is used for readiness and for the Asynq-backed email alert queue.

The Next.js dashboard still reads deterministic sample data and does not call
this API yet. The API, worker, queue, and Brevo email path are real
infrastructure; full UI-to-API wiring and webhook delivery are not implemented.

## What runs

- Go 1.27 HTTP API using the standard library
- `GET /healthz` liveness
- `GET /readyz` PostgreSQL/Redis readiness (or an honest `scaffold` status)
- `GET /api/v1` endpoint index
- `GET /api/v1/monitors` list persisted monitors
- `POST /api/v1/monitors` create a monitor
- `GET /api/v1/monitors/{id}` read one monitor
- `GET /api/v1/monitors/{id}/checks?limit=50` recent probe results
- `GET /api/v1/monitors/{id}/rollup?window=24h` windowed uptime/latency rollup
- `GET /api/v1/probes` check/incident summary
- `GET /api/v1/incidents?status=open` incident list
- `GET /api/v1/alerts?limit=50` persisted alert delivery attempts
- `GET /healthz` and `GET /readyz` on the worker health server
- `GET /healthz` and `GET /readyz` on the notifier health server

The worker is a separate process (`cmd/vigil-worker`). It:

1. leases due monitors from PostgreSQL using `next_check_at` and a 15-minute
   `lease_until` guard;
2. executes HTTP probes with a bounded worker pool and per-monitor timeout;
3. measures DNS, TCP, TLS, TTFB, and total latency;
4. retries according to the monitor policy and records only the final result;
5. writes the check into the partitioned `checks` table;
6. opens one incident when a monitor starts failing and resolves it on recovery;
7. enqueues one deduplicated email alert for each incident transition when
   `ALERT_EMAIL_ENABLED=true`;
8. serves liveness and readiness endpoints on `VIGIL_WORKER_HEALTH_ADDR`.

The notifier is a separate process (`cmd/vigil-notifier`). It consumes the
`alerts` queue with Asynq, sends Brevo transactional email over the HTTP API,
and records delivery state in `alert_deliveries`. The unique constraint on
`(incident_id, event, channel)` is the deduplication boundary; Asynq retries
failed sends with backoff. Delivery is at-least-once: a crash after Brevo
accepts a message but before the `sent` state is written can resend it.

Email delivery is disabled by default. Set `ALERT_EMAIL_ENABLED=true` and
provide `BREVO_API_KEY`, `ALERT_FROM_EMAIL`, and `ALERT_TO_EMAIL` to enable it.
`BREVO_API_URL` can point at a local mock for testing. Nodemailer is Node-only
and BullMQ is Node-only, so this Go service uses Brevo's HTTP API and Asynq on
the existing Redis service instead of adding a second runtime.

## Run without dependencies

```bash
go run ./cmd/vigil
curl http://localhost:8080/healthz
curl http://localhost:8080/readyz
```

`/readyz` reports `status: "scaffold"` and `not_configured` for PostgreSQL and
Redis when no URLs are set. Monitor endpoints return `501` instead of faking a
database.

## Run with PostgreSQL and Redis

Apply the migrations first:

```bash
psql "$DATABASE_URL" -f migrations/0001_init.sql
psql "$DATABASE_URL" -f migrations/0002_probe_scheduler.sql
psql "$DATABASE_URL" -f migrations/0003_alert_deliveries.sql
```

Start the API:

```bash
DATABASE_URL='postgres://vigil:vigil@localhost:5433/vigil?sslmode=disable' \
REDIS_URL='redis://localhost:6380/0' \
go run ./cmd/vigil
```

Start the worker in another shell:

```bash
DATABASE_URL='postgres://vigil:vigil@localhost:5433/vigil?sslmode=disable' \
REDIS_URL='redis://localhost:6380/0' \
ALERT_EMAIL_ENABLED=false \
go run ./cmd/vigil-worker
```

Start the notifier only when email is configured:

```bash
DATABASE_URL='postgres://vigil:vigil@localhost:5433/vigil?sslmode=disable' \
REDIS_URL='redis://localhost:6380/0' \
ALERT_EMAIL_ENABLED=true \
BREVO_API_KEY='...' \
ALERT_FROM_EMAIL='alerts@example.com' \
ALERT_TO_EMAIL='ops@example.com' \
go run ./cmd/vigil-notifier
```

Worker environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | required | PostgreSQL connection string |
| `REDIS_URL` | empty | Redis connection; required when email alerts are enabled |
| `VIGIL_WORKER_HEALTH_ADDR` | `:8081` | Worker liveness/readiness listener |
| `VIGIL_WORKER_CONCURRENCY` | `4` | Maximum concurrent probes |
| `VIGIL_WORKER_TICK` | `2s` | Poll interval for due monitors |
| `VIGIL_WORKER_USER_AGENT` | `VigilProbe/0.1 (+self-hosted)` | Probe `User-Agent` |
| `ALERT_EMAIL_ENABLED` | `false` | Enqueue deduplicated email alerts on incident changes |
| `VIGIL_LOG_LEVEL` | `info` | JSON log level: `debug`, `info`, `warn`, or `error` |

Notifier environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | required | PostgreSQL connection string for delivery state |
| `REDIS_URL` | required | Redis connection for the Asynq queue |
| `VIGIL_NOTIFIER_HEALTH_ADDR` | `:8082` | Notifier liveness/readiness listener |
| `VIGIL_NOTIFIER_CONCURRENCY` | `4` | Concurrent alert tasks |
| `ALERT_EMAIL_ENABLED` | `false` | Start the queue consumer and Brevo sender |
| `BREVO_API_KEY` | empty | Brevo transactional email API key |
| `BREVO_API_URL` | `https://api.brevo.com/v3/smtp/email` | Override for a local mock |
| `ALERT_FROM_EMAIL` | empty | Verified Brevo sender address |
| `ALERT_FROM_NAME` | `Vigil` | Sender display name |
| `ALERT_REPLY_TO` | empty | Optional reply-to address |
| `ALERT_TO_EMAIL` | empty | Recipient list; comma-separated addresses are accepted |
| `VIGIL_APP_URL` | `http://localhost:3000` | Dashboard base URL in alert links |
| `VIGIL_LOG_LEVEL` | `info` | JSON log level |

The API accepts the same `VIGIL_LOG_LEVEL`. All services write structured JSON
to stdout. API request logs include a request ID, status, response bytes, and
duration; `/healthz` and `/readyz` are logged at `debug` so Compose healthchecks
do not flood the log.

## Tests

```bash
gofmt -l .
go test ./...
go vet ./...
```

The probe tests use `httptest` servers for success, status mismatch, timeout,
and invalid URL handling. Worker tests cover success, retry-then-success,
failure recording, alert dispatch, and health/readiness behavior. API tests
cover monitor validation, rollup windows, checks, incidents, alert deliveries,
and storage-not-configured responses. Alert tests cover Brevo request/response
handling, HTML escaping, queue deduplication, enqueue failures, and notifier
sent/failed/duplicate paths.

## Docker Compose

From the repository root:

```bash
docker compose up --build
```

- Web preview: `http://localhost:3000`
- API: `http://localhost:8080`
- Worker health: `http://localhost:8081/healthz`
- Notifier health: `http://localhost:8082/healthz`
- PostgreSQL: `localhost:5433` (container port `5432`)
- Redis: `localhost:6380` (container port `6379`)

The stack has six services: `web`, `api`, `worker`, `notifier`, `postgres`, and
`redis`. The notifier starts in disabled mode unless `ALERT_EMAIL_ENABLED=true`.
The Compose stack mounts `migrations/` into PostgreSQL's init directory, so a
fresh volume gets all three migrations automatically. To recreate the schema
from scratch (and discard the local database volume):

```bash
docker compose down -v
docker compose up --build
```

For an existing volume, apply `migrations/0002_probe_scheduler.sql` and
`migrations/0003_alert_deliveries.sql` manually. To enable email delivery,
export the Brevo variables before starting the stack:

```bash
export ALERT_EMAIL_ENABLED=true
export BREVO_API_KEY='...'
export ALERT_FROM_EMAIL='alerts@example.com'
export ALERT_TO_EMAIL='ops@example.com'
docker compose up --build
```

## Rollup endpoint

The rollup endpoint aggregates persisted checks for one monitor. Supported
windows are `1h`, `6h`, `24h` (default), `7d`, `30d`, and `90d`:

```bash
curl 'http://localhost:8080/api/v1/monitors/<monitor-id>/rollup?window=24h'
```

It returns check counts, uptime percentage, average latency, p50/p95/p99
latency, and the latest check timestamp. Latency percentiles use successful
checks only; an empty window returns zero counts and no latency fields.

## Not implemented yet

- Webhook alert delivery (the schema reserves the `webhook` channel)
- Rate limiting and broader Redis queue usage
- Authentication between the web app and this API
- Wiring the Next.js dashboard to this API

The dashboard remains on labelled deterministic sample data. The API can create
monitors and expose rollups, the worker writes checks and incidents to
PostgreSQL, and the notifier records email delivery attempts, but the UI does
not display those records yet.
