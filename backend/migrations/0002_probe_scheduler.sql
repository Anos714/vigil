-- Probe scheduler columns and indexes.
--
-- The worker leases due monitors, performs the check, then writes the result
-- and clears the lease. If a worker crashes mid-check, the lease expires and
-- another worker can pick the monitor up again.

ALTER TABLE monitors
    ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true;

ALTER TABLE monitors
    ADD COLUMN IF NOT EXISTS last_checked_at timestamptz;

ALTER TABLE monitors
    ADD COLUMN IF NOT EXISTS next_check_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE monitors
    ADD COLUMN IF NOT EXISTS lease_until timestamptz;

CREATE INDEX IF NOT EXISTS monitors_due_idx
    ON monitors (next_check_at)
    WHERE enabled;
