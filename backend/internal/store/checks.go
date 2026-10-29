package store

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

// CheckResult is the measured outcome of one probe attempt. The worker records
// only the final attempt after its retry policy is applied.
type CheckResult struct {
	CheckedAt  time.Time
	StatusCode int
	LatencyMS  int
	DNSMS      int
	TCPMS      int
	TLSMS      int
	TTFBMS     int
	Success    bool
	Error      string
}

// IncidentEvent is an incident transition returned by RecordCheck. The worker
// uses it to enqueue a deduplicated alert after the check transaction commits.
type IncidentEvent struct {
	IncidentID  string     `json:"incidentId"`
	MonitorID   string     `json:"monitorId"`
	MonitorName string     `json:"monitorName"`
	Event       string     `json:"event"`
	Title       string     `json:"title"`
	Cause       string     `json:"cause,omitempty"`
	StatusCode  int        `json:"statusCode,omitempty"`
	Severity    string     `json:"severity"`
	StartedAt   time.Time  `json:"startedAt"`
	ResolvedAt  *time.Time `json:"resolvedAt,omitempty"`
	OccurredAt  time.Time  `json:"occurredAt"`
}

// CheckOutcome reports incident transitions caused by one persisted check.
type CheckOutcome struct {
	Events []IncidentEvent `json:"events,omitempty"`
}

// Check is a persisted probe result.
type Check struct {
	ID         int64     `json:"id"`
	MonitorID  string    `json:"monitorId"`
	CheckedAt  time.Time `json:"checkedAt"`
	Region     string    `json:"region"`
	StatusCode *int      `json:"statusCode,omitempty"`
	LatencyMS  int       `json:"latencyMs"`
	DNSMS      int       `json:"dnsMs"`
	TCPMS      int       `json:"tcpMs"`
	TLSMS      int       `json:"tlsMs"`
	TTFBMS     int       `json:"ttfbMs"`
	Success    bool      `json:"success"`
	Error      string    `json:"error,omitempty"`
}

// ProbeSummary is the lightweight scheduler/check summary exposed by the API.
type ProbeSummary struct {
	ChecksLastHour int64      `json:"checksLastHour"`
	ChecksTotal    int64      `json:"checksTotal"`
	OpenIncidents  int64      `json:"openIncidents"`
	LastCheckAt    *time.Time `json:"lastCheckAt,omitempty"`
}

// ClaimDueMonitors leases monitors whose next check is due. The lease prevents
// multiple worker processes from claiming the same monitor concurrently.
func (s *Store) ClaimDueMonitors(ctx context.Context, limit int) ([]Monitor, error) {
	if s.pool == nil {
		return nil, ErrNotConfigured
	}
	if limit <= 0 {
		limit = 1
	}

	rows, err := s.pool.Query(ctx, `
		WITH due AS (
			SELECT id
			FROM monitors
			WHERE enabled
			  AND next_check_at <= now()
			  AND (lease_until IS NULL OR lease_until < now())
			ORDER BY next_check_at
			LIMIT $1
			FOR UPDATE SKIP LOCKED
		)
		UPDATE monitors m
		SET lease_until = now() + interval '15 minutes',
		    updated_at = now()
		FROM due
		WHERE m.id = due.id
		RETURNING m.id, m.name, m.url, m.method, m.expected_status,
		          m.interval_seconds, m.timeout_seconds, m.retries, m.region,
		          m.is_public, m.enabled, m.last_checked_at, m.next_check_at,
		          m.lease_until, m.created_at, m.updated_at
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("claim due monitors: %w", err)
	}
	defer rows.Close()

	monitors := make([]Monitor, 0)
	for rows.Next() {
		monitor, err := scanMonitor(rows)
		if err != nil {
			return nil, fmt.Errorf("scan claimed monitor: %w", err)
		}
		monitors = append(monitors, monitor)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate claimed monitors: %w", err)
	}

	return monitors, nil
}

// RecordCheck stores a probe result, advances the monitor schedule, and keeps
// one open incident per failing monitor. It returns the incident transitions
// caused by this check so the caller can enqueue alerts after commit.
func (s *Store) RecordCheck(ctx context.Context, monitor Monitor, result CheckResult) (CheckOutcome, error) {
	outcome := CheckOutcome{}
	if s.pool == nil {
		return outcome, ErrNotConfigured
	}

	checkedAt := result.CheckedAt
	if checkedAt.IsZero() {
		checkedAt = time.Now().UTC()
	}
	interval := monitor.IntervalSeconds
	if interval <= 0 {
		interval = 30
	}
	nextCheckAt := time.Now().UTC().Add(time.Duration(interval) * time.Second)

	var statusCode any
	if result.StatusCode > 0 {
		statusCode = result.StatusCode
	}
	var errorText any
	if result.Error != "" {
		errorText = result.Error
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return outcome, fmt.Errorf("begin check transaction: %w", err)
	}
	defer func() {
		_ = tx.Rollback(ctx)
	}()

	if _, err := tx.Exec(ctx, `
		INSERT INTO checks (
			monitor_id, checked_at, region, status_code, latency_ms,
			dns_ms, tcp_ms, tls_ms, ttfb_ms, success, error
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`,
		monitor.ID,
		checkedAt,
		monitor.Region,
		statusCode,
		result.LatencyMS,
		result.DNSMS,
		result.TCPMS,
		result.TLSMS,
		result.TTFBMS,
		result.Success,
		errorText,
	); err != nil {
		return outcome, fmt.Errorf("insert check: %w", err)
	}

	if _, err := tx.Exec(ctx, `
		UPDATE monitors
		SET last_checked_at = $2,
		    next_check_at = $3,
		    lease_until = NULL,
		    updated_at = now()
		WHERE id = $1
	`, monitor.ID, checkedAt, nextCheckAt); err != nil {
		return outcome, fmt.Errorf("advance monitor schedule: %w", err)
	}

	if result.Success {
		rows, err := tx.Query(ctx, `
			UPDATE incidents
			SET status = 'resolved', resolved_at = $2
			WHERE monitor_id = $1 AND status <> 'resolved'
			RETURNING id, title, COALESCE(cause, ''), status_code,
			          severity, started_at, resolved_at
		`, monitor.ID, checkedAt)
		if err != nil {
			return outcome, fmt.Errorf("resolve incidents: %w", err)
		}
		for rows.Next() {
			event, err := scanIncidentEvent(rows, monitor, "resolved", checkedAt)
			if err != nil {
				rows.Close()
				return outcome, fmt.Errorf("scan resolved incident: %w", err)
			}
			outcome.Events = append(outcome.Events, event)
		}
		if err := rows.Err(); err != nil {
			rows.Close()
			return outcome, fmt.Errorf("iterate resolved incidents: %w", err)
		}
		rows.Close()
	} else {
		var openIncidents int
		if err := tx.QueryRow(ctx, `
			SELECT count(*)
			FROM incidents
			WHERE monitor_id = $1 AND status <> 'resolved'
		`, monitor.ID).Scan(&openIncidents); err != nil {
			return outcome, fmt.Errorf("count open incidents: %w", err)
		}

		if openIncidents == 0 {
			incidentID, err := newID("inc")
			if err != nil {
				return outcome, fmt.Errorf("generate incident id: %w", err)
			}
			cause := result.Error
			if cause == "" {
				cause = "check failed"
			}
			severity := "major"
			if result.StatusCode == 0 {
				severity = "critical"
			}
			title := monitor.Name + " is failing"
			if _, err := tx.Exec(ctx, `
				INSERT INTO incidents (
					id, monitor_id, title, cause, status_code, severity,
					status, started_at
				)
				VALUES ($1, $2, $3, $4, $5, $6, 'open', $7)
			`, incidentID, monitor.ID, title, cause, statusCode, severity, checkedAt); err != nil {
				return outcome, fmt.Errorf("open incident: %w", err)
			}
			outcome.Events = append(outcome.Events, IncidentEvent{
				IncidentID:  incidentID,
				MonitorID:   monitor.ID,
				MonitorName: monitor.Name,
				Event:       "opened",
				Title:       title,
				Cause:       cause,
				StatusCode:  result.StatusCode,
				Severity:    severity,
				StartedAt:   checkedAt,
				OccurredAt:  checkedAt,
			})
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return outcome, fmt.Errorf("commit check transaction: %w", err)
	}
	return outcome, nil
}

func scanIncidentEvent(row rowScanner, monitor Monitor, event string, occurredAt time.Time) (IncidentEvent, error) {
	var result IncidentEvent
	var statusCode pgtype.Int4
	var resolvedAt pgtype.Timestamptz

	if err := row.Scan(
		&result.IncidentID,
		&result.Title,
		&result.Cause,
		&statusCode,
		&result.Severity,
		&result.StartedAt,
		&resolvedAt,
	); err != nil {
		return IncidentEvent{}, err
	}

	result.MonitorID = monitor.ID
	result.MonitorName = monitor.Name
	result.Event = event
	result.OccurredAt = occurredAt
	if statusCode.Valid {
		result.StatusCode = int(statusCode.Int32)
	}
	if resolvedAt.Valid {
		value := resolvedAt.Time
		result.ResolvedAt = &value
	}
	return result, nil
}

// ListChecks returns recent checks for one monitor, newest first.
func (s *Store) ListChecks(ctx context.Context, monitorID string, limit int) ([]Check, error) {
	if s.pool == nil {
		return nil, ErrNotConfigured
	}
	if limit <= 0 {
		limit = 50
	}
	if limit > 500 {
		limit = 500
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id, monitor_id, checked_at, region, status_code,
		       COALESCE(latency_ms, 0), COALESCE(dns_ms, 0),
		       COALESCE(tcp_ms, 0), COALESCE(tls_ms, 0),
		       COALESCE(ttfb_ms, 0), success, COALESCE(error, '')
		FROM checks
		WHERE monitor_id = $1
		ORDER BY checked_at DESC
		LIMIT $2
	`, monitorID, limit)
	if err != nil {
		return nil, fmt.Errorf("list checks: %w", err)
	}
	defer rows.Close()

	checks := make([]Check, 0)
	for rows.Next() {
		var check Check
		var statusCode pgtype.Int4
		if err := rows.Scan(
			&check.ID,
			&check.MonitorID,
			&check.CheckedAt,
			&check.Region,
			&statusCode,
			&check.LatencyMS,
			&check.DNSMS,
			&check.TCPMS,
			&check.TLSMS,
			&check.TTFBMS,
			&check.Success,
			&check.Error,
		); err != nil {
			return nil, fmt.Errorf("scan check: %w", err)
		}
		if statusCode.Valid {
			value := int(statusCode.Int32)
			check.StatusCode = &value
		}
		checks = append(checks, check)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate checks: %w", err)
	}

	return checks, nil
}

// ProbeSummary returns aggregate check and incident counts for the API.
func (s *Store) ProbeSummary(ctx context.Context) (ProbeSummary, error) {
	if s.pool == nil {
		return ProbeSummary{}, ErrNotConfigured
	}

	var summary ProbeSummary
	var lastCheck pgtype.Timestamptz
	if err := s.pool.QueryRow(ctx, `
		SELECT count(*) FILTER (WHERE checked_at >= now() - interval '1 hour'),
		       count(*),
		       max(checked_at)
		FROM checks
	`).Scan(&summary.ChecksLastHour, &summary.ChecksTotal, &lastCheck); err != nil {
		return ProbeSummary{}, fmt.Errorf("summarize checks: %w", err)
	}
	if lastCheck.Valid {
		value := lastCheck.Time
		summary.LastCheckAt = &value
	}

	if err := s.pool.QueryRow(ctx, `
		SELECT count(*) FROM incidents WHERE status <> 'resolved'
	`).Scan(&summary.OpenIncidents); err != nil {
		return ProbeSummary{}, fmt.Errorf("summarize incidents: %w", err)
	}

	return summary, nil
}
