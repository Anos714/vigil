package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// AlertDelivery is the persisted delivery state for one incident transition
// and channel. The unique constraint on (incident_id, event, channel) makes
// enqueueing idempotent across worker restarts.
type AlertDelivery struct {
	ID                int64      `json:"id"`
	IncidentID        string     `json:"incidentId"`
	MonitorID         string     `json:"monitorId"`
	MonitorName       string     `json:"monitorName"`
	Event             string     `json:"event"`
	Channel           string     `json:"channel"`
	Status            string     `json:"status"`
	Attempts          int        `json:"attempts"`
	ProviderMessageID string     `json:"providerMessageId,omitempty"`
	LastError         string     `json:"lastError,omitempty"`
	QueuedAt          time.Time  `json:"queuedAt"`
	SentAt            *time.Time `json:"sentAt,omitempty"`
	UpdatedAt         time.Time  `json:"updatedAt"`
}

// CreateAlertDelivery inserts a queued delivery unless the same incident
// transition and channel was already queued. The bool reports whether a new
// row was created.
func (s *Store) CreateAlertDelivery(ctx context.Context, event IncidentEvent, channel string) (AlertDelivery, bool, error) {
	if s.pool == nil {
		return AlertDelivery{}, false, ErrNotConfigured
	}

	row := s.pool.QueryRow(ctx, `
		INSERT INTO alert_deliveries (
			incident_id, monitor_id, event, channel, status
		)
		VALUES ($1, $2, $3, $4, 'queued')
		ON CONFLICT (incident_id, event, channel) DO NOTHING
		RETURNING id, incident_id, monitor_id,
		          (SELECT name FROM monitors WHERE id = monitor_id),
		          event, channel, status, attempts,
		          COALESCE(provider_message_id, ''), COALESCE(last_error, ''),
		          queued_at, sent_at, updated_at
	`, event.IncidentID, event.MonitorID, event.Event, channel)

	delivery, err := scanAlertDelivery(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return AlertDelivery{}, false, nil
	}
	if err != nil {
		return AlertDelivery{}, false, fmt.Errorf("create alert delivery: %w", err)
	}
	return delivery, true, nil
}

// GetAlertDelivery returns one delivery or ErrNotFound.
func (s *Store) GetAlertDelivery(ctx context.Context, id int64) (AlertDelivery, error) {
	if s.pool == nil {
		return AlertDelivery{}, ErrNotConfigured
	}

	row := s.pool.QueryRow(ctx, `
		SELECT a.id, a.incident_id, a.monitor_id, m.name, a.event, a.channel,
		       a.status, a.attempts, COALESCE(a.provider_message_id, ''),
		       COALESCE(a.last_error, ''), a.queued_at, a.sent_at, a.updated_at
		FROM alert_deliveries a
		JOIN monitors m ON m.id = a.monitor_id
		WHERE a.id = $1
	`, id)

	delivery, err := scanAlertDelivery(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return AlertDelivery{}, ErrNotFound
	}
	if err != nil {
		return AlertDelivery{}, fmt.Errorf("get alert delivery: %w", err)
	}
	return delivery, nil
}

// ListAlertDeliveries returns recent delivery attempts, newest first.
func (s *Store) ListAlertDeliveries(ctx context.Context, limit int) ([]AlertDelivery, error) {
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
		SELECT a.id, a.incident_id, a.monitor_id, m.name, a.event, a.channel,
		       a.status, a.attempts, COALESCE(a.provider_message_id, ''),
		       COALESCE(a.last_error, ''), a.queued_at, a.sent_at, a.updated_at
		FROM alert_deliveries a
		JOIN monitors m ON m.id = a.monitor_id
		ORDER BY a.queued_at DESC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, fmt.Errorf("list alert deliveries: %w", err)
	}
	defer rows.Close()

	deliveries := make([]AlertDelivery, 0)
	for rows.Next() {
		delivery, err := scanAlertDelivery(rows)
		if err != nil {
			return nil, fmt.Errorf("scan alert delivery: %w", err)
		}
		deliveries = append(deliveries, delivery)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate alert deliveries: %w", err)
	}
	return deliveries, nil
}

// MarkAlertDeliverySent records a successful provider send.
func (s *Store) MarkAlertDeliverySent(ctx context.Context, id int64, providerMessageID string) error {
	if s.pool == nil {
		return ErrNotConfigured
	}

	tag, err := s.pool.Exec(ctx, `
		UPDATE alert_deliveries
		SET status = 'sent',
		    attempts = attempts + 1,
		    provider_message_id = NULLIF($2, ''),
		    last_error = NULL,
		    sent_at = now(),
		    updated_at = now()
		WHERE id = $1
	`, id, providerMessageID)
	if err != nil {
		return fmt.Errorf("mark alert delivery sent: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// MarkAlertDeliveryFailed records a failed provider attempt. Asynq may retry
// the task; the row remains retryable and its attempt counter increments.
func (s *Store) MarkAlertDeliveryFailed(ctx context.Context, id int64, reason string) error {
	if s.pool == nil {
		return ErrNotConfigured
	}

	tag, err := s.pool.Exec(ctx, `
		UPDATE alert_deliveries
		SET status = 'failed',
		    attempts = attempts + 1,
		    last_error = $2,
		    updated_at = now()
		WHERE id = $1
	`, id, reason)
	if err != nil {
		return fmt.Errorf("mark alert delivery failed: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func scanAlertDelivery(row rowScanner) (AlertDelivery, error) {
	var delivery AlertDelivery
	var sentAt pgtype.Timestamptz

	if err := row.Scan(
		&delivery.ID,
		&delivery.IncidentID,
		&delivery.MonitorID,
		&delivery.MonitorName,
		&delivery.Event,
		&delivery.Channel,
		&delivery.Status,
		&delivery.Attempts,
		&delivery.ProviderMessageID,
		&delivery.LastError,
		&delivery.QueuedAt,
		&sentAt,
		&delivery.UpdatedAt,
	); err != nil {
		return AlertDelivery{}, err
	}
	if sentAt.Valid {
		value := sentAt.Time
		delivery.SentAt = &value
	}
	return delivery, nil
}
