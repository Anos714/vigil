package store

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

// MonitorRollup is a windowed aggregate over persisted checks. Latency
// percentiles use successful checks only so failures do not pull the
// distribution toward zero.
type MonitorRollup struct {
	Checks       int64      `json:"checks"`
	Successes    int64      `json:"successes"`
	Failures     int64      `json:"failures"`
	UptimePct    float64    `json:"uptimePct"`
	AvgLatencyMS *float64   `json:"avgLatencyMs,omitempty"`
	P50LatencyMS *float64   `json:"p50LatencyMs,omitempty"`
	P95LatencyMS *float64   `json:"p95LatencyMs,omitempty"`
	P99LatencyMS *float64   `json:"p99LatencyMs,omitempty"`
	LastCheckAt  *time.Time `json:"lastCheckAt,omitempty"`
}

// MonitorRollup aggregates one monitor's checks since the supplied instant.
// It returns a zero-valued rollup when the window contains no checks.
func (s *Store) MonitorRollup(ctx context.Context, monitorID string, since time.Time) (MonitorRollup, error) {
	if s.pool == nil {
		return MonitorRollup{}, ErrNotConfigured
	}

	var rollup MonitorRollup
	var average pgtype.Float8
	var p50 pgtype.Float8
	var p95 pgtype.Float8
	var p99 pgtype.Float8
	var lastCheck pgtype.Timestamptz

	if err := s.pool.QueryRow(ctx, `
		SELECT count(*),
		       count(*) FILTER (WHERE success),
		       count(*) FILTER (WHERE NOT success),
		       (avg(latency_ms) FILTER (WHERE success))::double precision,
		       percentile_cont(0.50) WITHIN GROUP (ORDER BY latency_ms)
		           FILTER (WHERE success),
		       percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)
		           FILTER (WHERE success),
		       percentile_cont(0.99) WITHIN GROUP (ORDER BY latency_ms)
		           FILTER (WHERE success),
		       max(checked_at)
		FROM checks
		WHERE monitor_id = $1 AND checked_at >= $2
	`, monitorID, since).Scan(
		&rollup.Checks,
		&rollup.Successes,
		&rollup.Failures,
		&average,
		&p50,
		&p95,
		&p99,
		&lastCheck,
	); err != nil {
		return MonitorRollup{}, fmt.Errorf("monitor rollup: %w", err)
	}

	if rollup.Checks > 0 {
		rollup.UptimePct = roundTo(float64(rollup.Successes)/float64(rollup.Checks)*100, 2)
	}
	rollup.AvgLatencyMS = roundedFloat(average, 1)
	rollup.P50LatencyMS = roundedFloat(p50, 1)
	rollup.P95LatencyMS = roundedFloat(p95, 1)
	rollup.P99LatencyMS = roundedFloat(p99, 1)
	if lastCheck.Valid {
		value := lastCheck.Time
		rollup.LastCheckAt = &value
	}

	return rollup, nil
}

func roundedFloat(value pgtype.Float8, places int) *float64 {
	if !value.Valid {
		return nil
	}
	rounded := roundTo(value.Float64, places)
	return &rounded
}

func roundTo(value float64, places int) float64 {
	factor := math.Pow10(places)
	return math.Round(value*factor) / factor
}
