-- Alert delivery state.
--
-- One row is created for each incident transition and channel. The unique
-- constraint is the deduplication boundary: retries reuse the existing row and
-- update its status instead of enqueueing another notification.

CREATE TABLE IF NOT EXISTS alert_deliveries (
    id                  bigserial PRIMARY KEY,
    incident_id         text NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    monitor_id          text NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
    event               text NOT NULL,
    channel             text NOT NULL,
    status              text NOT NULL DEFAULT 'queued',
    attempts            integer NOT NULL DEFAULT 0,
    provider_message_id text,
    last_error          text,
    queued_at           timestamptz NOT NULL DEFAULT now(),
    sent_at             timestamptz,
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT alert_deliveries_event_check
        CHECK (event IN ('opened', 'resolved')),
    CONSTRAINT alert_deliveries_channel_check
        CHECK (channel IN ('email', 'webhook')),
    CONSTRAINT alert_deliveries_status_check
        CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
    CONSTRAINT alert_deliveries_incident_event_channel_key
        UNIQUE (incident_id, event, channel)
);

CREATE INDEX IF NOT EXISTS alert_deliveries_queued_at_idx
    ON alert_deliveries (queued_at DESC);

CREATE INDEX IF NOT EXISTS alert_deliveries_status_idx
    ON alert_deliveries (status, queued_at DESC);

DROP TRIGGER IF EXISTS alert_deliveries_set_updated_at ON alert_deliveries;
CREATE TRIGGER alert_deliveries_set_updated_at
    BEFORE UPDATE ON alert_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION vigil_set_updated_at();
