-- Vigil initial schema.
--
-- This migration creates the storage contract for the monitor inventory and
-- the probe/incident data that the Go collector will write. It does not create
-- any probe scheduler or alert dispatcher by itself.

CREATE TABLE IF NOT EXISTS monitors (
    id               text PRIMARY KEY,
    name             text NOT NULL,
    url              text NOT NULL,
    method           text NOT NULL DEFAULT 'GET',
    expected_status  integer NOT NULL DEFAULT 200,
    interval_seconds integer NOT NULL DEFAULT 30,
    timeout_seconds  integer NOT NULL DEFAULT 10,
    retries          integer NOT NULL DEFAULT 2,
    region           text NOT NULL DEFAULT 'ap-south-1',
    is_public        boolean NOT NULL DEFAULT true,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT monitors_expected_status_check
        CHECK (expected_status BETWEEN 100 AND 599),
    CONSTRAINT monitors_interval_check
        CHECK (interval_seconds BETWEEN 5 AND 3600),
    CONSTRAINT monitors_timeout_check
        CHECK (timeout_seconds BETWEEN 1 AND 120)
);

CREATE INDEX IF NOT EXISTS monitors_created_at_idx
    ON monitors (created_at DESC);

-- Checks are partitioned by time so the collector can write at high volume
-- without turning the table into an unbounded heap. The default partition is
-- enough for the scaffold; production partitions should be created ahead of
-- each week/month.
CREATE TABLE IF NOT EXISTS checks (
    id          bigserial,
    monitor_id  text NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    checked_at  timestamptz NOT NULL,
    region      text NOT NULL,
    status_code integer,
    latency_ms  integer,
    dns_ms      integer,
    tcp_ms      integer,
    tls_ms      integer,
    ttfb_ms     integer,
    success     boolean NOT NULL,
    error       text,
    PRIMARY KEY (id, checked_at)
) PARTITION BY RANGE (checked_at);

CREATE TABLE IF NOT EXISTS checks_default
    PARTITION OF checks DEFAULT;

CREATE INDEX IF NOT EXISTS checks_monitor_checked_at_idx
    ON checks (monitor_id, checked_at DESC);

CREATE INDEX IF NOT EXISTS checks_checked_at_idx
    ON checks (checked_at DESC);

CREATE TABLE IF NOT EXISTS incidents (
    id          text PRIMARY KEY,
    monitor_id  text NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    title       text NOT NULL,
    cause       text,
    status_code integer,
    severity    text NOT NULL DEFAULT 'major',
    status      text NOT NULL DEFAULT 'open',
    started_at  timestamptz NOT NULL,
    resolved_at timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT incidents_severity_check
        CHECK (severity IN ('minor', 'major', 'critical')),
    CONSTRAINT incidents_status_check
        CHECK (status IN ('open', 'monitoring', 'resolved'))
);

CREATE INDEX IF NOT EXISTS incidents_monitor_started_at_idx
    ON incidents (monitor_id, started_at DESC);

CREATE INDEX IF NOT EXISTS incidents_status_started_at_idx
    ON incidents (status, started_at DESC);

CREATE TABLE IF NOT EXISTS status_subscriptions (
    id          bigserial PRIMARY KEY,
    page_key    text NOT NULL,
    email       text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    confirmed_at timestamptz,
    UNIQUE (page_key, email)
);

CREATE OR REPLACE FUNCTION vigil_set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS monitors_set_updated_at ON monitors;
CREATE TRIGGER monitors_set_updated_at
    BEFORE UPDATE ON monitors
    FOR EACH ROW
    EXECUTE FUNCTION vigil_set_updated_at();
