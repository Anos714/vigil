package store

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

var (
	// ErrNotConfigured means the process is running without a DATABASE_URL.
	ErrNotConfigured = errors.New("storage not configured")
	// ErrNotFound means the requested record does not exist.
	ErrNotFound = errors.New("not found")
)

// Monitor is the persisted monitor shape. The probe worker uses the schedule
// columns to lease due monitors and record the next run.
type Monitor struct {
	ID              string     `json:"id"`
	Name            string     `json:"name"`
	URL             string     `json:"url"`
	Method          string     `json:"method"`
	ExpectedStatus  int        `json:"expectedStatus"`
	IntervalSeconds int        `json:"intervalSeconds"`
	TimeoutSeconds  int        `json:"timeoutSeconds"`
	Retries         int        `json:"retries"`
	Region          string     `json:"region"`
	IsPublic        bool       `json:"isPublic"`
	Enabled         bool       `json:"enabled"`
	LastCheckedAt   *time.Time `json:"lastCheckedAt,omitempty"`
	NextCheckAt     time.Time  `json:"nextCheckAt"`
	LeaseUntil      *time.Time `json:"-"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

// CreateMonitorParams is the validated input for creating a monitor.
type CreateMonitorParams struct {
	Name            string
	URL             string
	Method          string
	ExpectedStatus  int
	IntervalSeconds int
	TimeoutSeconds  int
	Retries         int
	Region          string
	IsPublic        bool
}

// Readiness reports the state of the optional dependencies.
type Readiness struct {
	Postgres string `json:"postgres"`
	Redis    string `json:"redis"`
}

// Store owns the optional PostgreSQL pool and Redis client. Either dependency
// may be nil while the scaffold is being exercised locally.
type Store struct {
	pool  *pgxpool.Pool
	redis *redis.Client
}

// Open connects to configured dependencies. It retries briefly so Docker
// Compose can start the API alongside healthy PostgreSQL and Redis services.
func Open(ctx context.Context, databaseURL, redisURL string) (*Store, error) {
	s := &Store{}

	if databaseURL != "" {
		pool, err := openPostgres(ctx, databaseURL)
		if err != nil {
			return nil, err
		}
		s.pool = pool
	}

	if redisURL != "" {
		client, err := openRedis(ctx, redisURL)
		if err != nil {
			s.Close()
			return nil, err
		}
		s.redis = client
	}

	return s, nil
}

func openPostgres(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse DATABASE_URL: %w", err)
	}
	cfg.MaxConns = 8
	cfg.MinConns = 1
	cfg.MaxConnLifetime = 30 * time.Minute
	cfg.MaxConnIdleTime = 5 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("create postgres pool: %w", err)
	}

	if err := pingUntilReady(ctx, 30*time.Second, func(pingCtx context.Context) error {
		return pool.Ping(pingCtx)
	}); err != nil {
		pool.Close()
		return nil, fmt.Errorf("postgres readiness: %w", err)
	}

	return pool, nil
}

func openRedis(ctx context.Context, redisURL string) (*redis.Client, error) {
	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parse REDIS_URL: %w", err)
	}
	client := redis.NewClient(opts)

	if err := pingUntilReady(ctx, 30*time.Second, func(pingCtx context.Context) error {
		return client.Ping(pingCtx).Err()
	}); err != nil {
		_ = client.Close()
		return nil, fmt.Errorf("redis readiness: %w", err)
	}

	return client, nil
}

func pingUntilReady(ctx context.Context, timeout time.Duration, ping func(context.Context) error) error {
	deadline := time.Now().Add(timeout)
	var lastErr error

	for {
		pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
		lastErr = ping(pingCtx)
		cancel()

		if lastErr == nil {
			return nil
		}
		if time.Now().After(deadline) {
			return lastErr
		}

		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(750 * time.Millisecond):
		}
	}
}

// Ready pings configured dependencies. Missing dependencies are reported as
// "not_configured" rather than treated as a crash.
func (s *Store) Ready(ctx context.Context) (Readiness, error) {
	readiness := Readiness{Postgres: "not_configured", Redis: "not_configured"}
	var errs []error

	if s.pool != nil {
		pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
		if err := s.pool.Ping(pingCtx); err != nil {
			readiness.Postgres = "error"
			errs = append(errs, fmt.Errorf("postgres: %w", err))
		} else {
			readiness.Postgres = "ok"
		}
		cancel()
	}

	if s.redis != nil {
		pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
		if err := s.redis.Ping(pingCtx).Err(); err != nil {
			readiness.Redis = "error"
			errs = append(errs, fmt.Errorf("redis: %w", err))
		} else {
			readiness.Redis = "ok"
		}
		cancel()
	}

	return readiness, errors.Join(errs...)
}

// ListMonitors returns monitors ordered by newest first.
func (s *Store) ListMonitors(ctx context.Context) ([]Monitor, error) {
	if s.pool == nil {
		return nil, ErrNotConfigured
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id, name, url, method, expected_status, interval_seconds,
		       timeout_seconds, retries, region, is_public, enabled,
		       last_checked_at, next_check_at, lease_until, created_at, updated_at
		FROM monitors
		ORDER BY created_at DESC
	`)
	if err != nil {
		return nil, fmt.Errorf("list monitors: %w", err)
	}
	defer rows.Close()

	monitors := make([]Monitor, 0)
	for rows.Next() {
		monitor, err := scanMonitor(rows)
		if err != nil {
			return nil, err
		}
		monitors = append(monitors, monitor)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate monitors: %w", err)
	}

	return monitors, nil
}

// GetMonitor returns a single monitor or ErrNotFound.
func (s *Store) GetMonitor(ctx context.Context, id string) (Monitor, error) {
	if s.pool == nil {
		return Monitor{}, ErrNotConfigured
	}

	row := s.pool.QueryRow(ctx, `
		SELECT id, name, url, method, expected_status, interval_seconds,
		       timeout_seconds, retries, region, is_public, enabled,
		       last_checked_at, next_check_at, lease_until, created_at, updated_at
		FROM monitors
		WHERE id = $1
	`, id)

	monitor, err := scanMonitor(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return Monitor{}, ErrNotFound
	}
	if err != nil {
		return Monitor{}, fmt.Errorf("get monitor: %w", err)
	}
	return monitor, nil
}

// CreateMonitor persists a monitor and returns the stored record.
func (s *Store) CreateMonitor(ctx context.Context, params CreateMonitorParams) (Monitor, error) {
	if s.pool == nil {
		return Monitor{}, ErrNotConfigured
	}

	id, err := newID("mon")
	if err != nil {
		return Monitor{}, fmt.Errorf("generate monitor id: %w", err)
	}

	monitor := Monitor{
		ID:              id,
		Name:            params.Name,
		URL:             params.URL,
		Method:          params.Method,
		ExpectedStatus:  params.ExpectedStatus,
		IntervalSeconds: params.IntervalSeconds,
		TimeoutSeconds:  params.TimeoutSeconds,
		Retries:         params.Retries,
		Region:          params.Region,
		IsPublic:        params.IsPublic,
		Enabled:         true,
	}

	row := s.pool.QueryRow(ctx, `
		INSERT INTO monitors (
			id, name, url, method, expected_status, interval_seconds,
			timeout_seconds, retries, region, is_public
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING next_check_at, created_at, updated_at
	`,
		monitor.ID,
		monitor.Name,
		monitor.URL,
		monitor.Method,
		monitor.ExpectedStatus,
		monitor.IntervalSeconds,
		monitor.TimeoutSeconds,
		monitor.Retries,
		monitor.Region,
		monitor.IsPublic,
	)
	if err := row.Scan(&monitor.NextCheckAt, &monitor.CreatedAt, &monitor.UpdatedAt); err != nil {
		return Monitor{}, fmt.Errorf("insert monitor: %w", err)
	}

	return monitor, nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanMonitor(row rowScanner) (Monitor, error) {
	var monitor Monitor
	var lastCheckedAt pgtype.Timestamptz
	var leaseUntil pgtype.Timestamptz

	err := row.Scan(
		&monitor.ID,
		&monitor.Name,
		&monitor.URL,
		&monitor.Method,
		&monitor.ExpectedStatus,
		&monitor.IntervalSeconds,
		&monitor.TimeoutSeconds,
		&monitor.Retries,
		&monitor.Region,
		&monitor.IsPublic,
		&monitor.Enabled,
		&lastCheckedAt,
		&monitor.NextCheckAt,
		&leaseUntil,
		&monitor.CreatedAt,
		&monitor.UpdatedAt,
	)
	if err != nil {
		return Monitor{}, err
	}
	if lastCheckedAt.Valid {
		value := lastCheckedAt.Time
		monitor.LastCheckedAt = &value
	}
	if leaseUntil.Valid {
		value := leaseUntil.Time
		monitor.LeaseUntil = &value
	}
	return monitor, nil
}

func newID(prefix string) (string, error) {
	var bytes [12]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return "", err
	}
	return prefix + "_" + hex.EncodeToString(bytes[:]), nil
}

// Close releases configured dependencies.
func (s *Store) Close() {
	if s.pool != nil {
		s.pool.Close()
	}
	if s.redis != nil {
		_ = s.redis.Close()
	}
}
