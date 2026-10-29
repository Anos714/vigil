package alert

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/hibiken/asynq"
	"github.com/vigil-monitor/vigil/backend/internal/store"
)

const (
	// ChannelEmail is the persisted alert channel name for transactional email.
	ChannelEmail = "email"
	// TaskEmail is the Asynq task type consumed by the notifier.
	TaskEmail = "alert:email"
	// QueueName keeps alert work separate from any future probe/queue traffic.
	QueueName = "alerts"
)

// Job is the Asynq payload for one persisted alert delivery.
type Job struct {
	DeliveryID int64               `json:"deliveryId"`
	Event      store.IncidentEvent `json:"event"`
}

// DeliveryStore is the subset of storage needed by the dispatcher.
type DispatcherStore interface {
	CreateAlertDelivery(context.Context, store.IncidentEvent, string) (store.AlertDelivery, bool, error)
	MarkAlertDeliveryFailed(context.Context, int64, string) error
}

// TaskEnqueuer is the Asynq client surface used by the dispatcher. Keeping it
// as an interface lets tests assert enqueue behavior without Redis.
type TaskEnqueuer interface {
	EnqueueContext(context.Context, *asynq.Task, ...asynq.Option) (*asynq.TaskInfo, error)
	Close() error
}

// Dispatcher persists a delivery row and enqueues its email task. The DB
// unique constraint makes duplicate incident transitions harmless.
type Dispatcher struct {
	store    DispatcherStore
	enqueuer TaskEnqueuer
	logger   *slog.Logger
}

// NewDispatcher creates a dispatcher with an explicit task enqueuer.
func NewDispatcher(st DispatcherStore, enqueuer TaskEnqueuer, logger *slog.Logger) *Dispatcher {
	if logger == nil {
		logger = slog.Default()
	}
	return &Dispatcher{store: st, enqueuer: enqueuer, logger: logger}
}

// NewAsynqDispatcher connects a dispatcher to the existing Redis service.
func NewAsynqDispatcher(st DispatcherStore, redisURL string, logger *slog.Logger) (*Dispatcher, error) {
	if redisURL == "" {
		return nil, errors.New("REDIS_URL is required when ALERT_EMAIL_ENABLED=true")
	}
	redisOpt, err := asynq.ParseRedisURI(redisURL)
	if err != nil {
		return nil, fmt.Errorf("parse REDIS_URL for alert queue: %w", err)
	}
	return NewDispatcher(st, asynq.NewClient(redisOpt), logger), nil
}

// Dispatch creates the delivery row and enqueues the email task. If Redis is
// unavailable the row is marked failed and the error is returned so the probe
// worker can log it without failing the check write.
func (d *Dispatcher) Dispatch(ctx context.Context, event store.IncidentEvent) error {
	if d == nil || d.store == nil || d.enqueuer == nil {
		return nil
	}

	delivery, created, err := d.store.CreateAlertDelivery(ctx, event, ChannelEmail)
	if err != nil {
		return fmt.Errorf("create alert delivery for incident %s: %w", event.IncidentID, err)
	}
	if !created {
		d.logger.Debug("alert delivery already exists",
			"incident", event.IncidentID,
			"event", event.Event,
			"channel", ChannelEmail,
		)
		return nil
	}

	payload, err := json.Marshal(Job{DeliveryID: delivery.ID, Event: event})
	if err != nil {
		_ = d.markFailed(ctx, delivery.ID, err)
		return fmt.Errorf("encode alert job: %w", err)
	}

	task := asynq.NewTask(
		TaskEmail,
		payload,
		asynq.Queue(QueueName),
		asynq.MaxRetry(5),
		asynq.Timeout(20*time.Second),
	)
	info, err := d.enqueuer.EnqueueContext(ctx, task)
	if err != nil {
		_ = d.markFailed(ctx, delivery.ID, err)
		return fmt.Errorf("enqueue alert delivery %d: %w", delivery.ID, err)
	}

	d.logger.Info("alert queued",
		"delivery", delivery.ID,
		"incident", event.IncidentID,
		"monitor", event.MonitorID,
		"event", event.Event,
		"channel", ChannelEmail,
		"queue", info.Queue,
		"task", info.ID,
	)
	return nil
}

func (d *Dispatcher) markFailed(ctx context.Context, id int64, cause error) error {
	markCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()
	return d.store.MarkAlertDeliveryFailed(markCtx, id, cause.Error())
}

// Close releases the Asynq client.
func (d *Dispatcher) Close() error {
	if d == nil || d.enqueuer == nil {
		return nil
	}
	return d.enqueuer.Close()
}

// AsynqLogger adapts Asynq's logger interface to structured slog output.
type AsynqLogger struct {
	Logger *slog.Logger
}

func NewAsynqLogger(logger *slog.Logger) AsynqLogger {
	if logger == nil {
		logger = slog.Default()
	}
	return AsynqLogger{Logger: logger}
}

func (l AsynqLogger) Debug(args ...interface{}) {
	l.Logger.Debug(fmt.Sprint(args...))
}

func (l AsynqLogger) Info(args ...interface{}) {
	l.Logger.Info(fmt.Sprint(args...))
}

func (l AsynqLogger) Warn(args ...interface{}) {
	l.Logger.Warn(fmt.Sprint(args...))
}

func (l AsynqLogger) Error(args ...interface{}) {
	l.Logger.Error(fmt.Sprint(args...))
}

func (l AsynqLogger) Fatal(args ...interface{}) {
	l.Logger.Error("asynq fatal", "message", fmt.Sprint(args...))
	os.Exit(1)
}
