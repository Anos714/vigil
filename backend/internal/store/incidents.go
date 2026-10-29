package store

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

// Incident is the operator-facing incident record. Alert delivery is not part
// of this layer; incidents are created and resolved from probe outcomes.
type Incident struct {
	ID         string     `json:"id"`
	MonitorID  string     `json:"monitorId"`
	Title      string     `json:"title"`
	Cause      string     `json:"cause,omitempty"`
	StatusCode *int       `json:"statusCode,omitempty"`
	Severity   string     `json:"severity"`
	Status     string     `json:"status"`
	StartedAt  time.Time  `json:"startedAt"`
	ResolvedAt *time.Time `json:"resolvedAt,omitempty"`
	CreatedAt  time.Time  `json:"createdAt"`
}

// ListIncidents returns incidents newest first, optionally filtered by status.
func (s *Store) ListIncidents(ctx context.Context, status string, limit int) ([]Incident, error) {
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
		SELECT id, monitor_id, title, COALESCE(cause, ''), status_code,
		       severity, status, started_at, resolved_at, created_at
		FROM incidents
		WHERE ($1 = '' OR status = $1)
		ORDER BY started_at DESC
		LIMIT $2
	`, status, limit)
	if err != nil {
		return nil, fmt.Errorf("list incidents: %w", err)
	}
	defer rows.Close()

	incidents := make([]Incident, 0)
	for rows.Next() {
		var incident Incident
		var statusCode pgtype.Int4
		var resolvedAt pgtype.Timestamptz
		if err := rows.Scan(
			&incident.ID,
			&incident.MonitorID,
			&incident.Title,
			&incident.Cause,
			&statusCode,
			&incident.Severity,
			&incident.Status,
			&incident.StartedAt,
			&resolvedAt,
			&incident.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan incident: %w", err)
		}
		if statusCode.Valid {
			value := int(statusCode.Int32)
			incident.StatusCode = &value
		}
		if resolvedAt.Valid {
			value := resolvedAt.Time
			incident.ResolvedAt = &value
		}
		incidents = append(incidents, incident)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate incidents: %w", err)
	}

	return incidents, nil
}
