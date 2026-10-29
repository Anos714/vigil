package alert

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/hibiken/asynq"
	"github.com/vigil-monitor/vigil/backend/internal/store"
)

// NotifierStore is the subset of storage needed by the email handler.
type NotifierStore interface {
	GetAlertDelivery(context.Context, int64) (store.AlertDelivery, error)
	MarkAlertDeliverySent(context.Context, int64, string) error
	MarkAlertDeliveryFailed(context.Context, int64, string) error
}

// Notifier consumes alert jobs and sends them through the configured sender.
type Notifier struct {
	store      NotifierStore
	sender     Sender
	recipients []string
	appURL     string
	logger     *slog.Logger
}

// NewNotifier validates recipients and creates the Asynq email handler.
func NewNotifier(st NotifierStore, sender Sender, recipients []string, appURL string, logger *slog.Logger) (*Notifier, error) {
	if st == nil {
		return nil, errors.New("alert delivery store is required")
	}
	if sender == nil {
		return nil, errors.New("alert email sender is required")
	}
	if len(recipients) == 0 {
		return nil, errors.New("ALERT_TO_EMAIL must contain at least one recipient")
	}
	if logger == nil {
		logger = slog.Default()
	}
	return &Notifier{
		store:      st,
		sender:     sender,
		recipients: append([]string(nil), recipients...),
		appURL:     appURL,
		logger:     logger,
	}, nil
}

// HandleEmail processes one Asynq email task. Returning an error makes Asynq
// retry with its configured backoff; the delivery row records each attempt.
func (n *Notifier) HandleEmail(ctx context.Context, task *asynq.Task) error {
	var job Job
	if err := json.Unmarshal(task.Payload(), &job); err != nil {
		return fmt.Errorf("decode alert job: %w", err)
	}
	if job.DeliveryID <= 0 || job.Event.IncidentID == "" {
		return fmt.Errorf("invalid alert job: delivery=%d incident=%q", job.DeliveryID, job.Event.IncidentID)
	}
	if job.Event.Event != "opened" && job.Event.Event != "resolved" {
		return fmt.Errorf("invalid alert event %q", job.Event.Event)
	}

	delivery, err := n.store.GetAlertDelivery(ctx, job.DeliveryID)
	if errors.Is(err, store.ErrNotFound) {
		n.logger.Warn("alert delivery disappeared; dropping task",
			"delivery", job.DeliveryID,
			"incident", job.Event.IncidentID,
		)
		return nil
	}
	if err != nil {
		return fmt.Errorf("load alert delivery %d: %w", job.DeliveryID, err)
	}
	if delivery.Channel != ChannelEmail {
		n.logger.Warn("alert delivery has unexpected channel; dropping task",
			"delivery", job.DeliveryID,
			"channel", delivery.Channel,
		)
		return nil
	}
	if delivery.Status == "sent" || delivery.Status == "skipped" {
		n.logger.Debug("alert delivery already finalized",
			"delivery", job.DeliveryID,
			"status", delivery.Status,
		)
		return nil
	}

	message := BuildEmail(job.Event, n.appURL)
	message.To = n.recipients
	messageID, err := n.sender.Send(ctx, message)
	if err != nil {
		markErr := n.markFailed(ctx, job.DeliveryID, err)
		n.logger.Error("alert email failed",
			"delivery", job.DeliveryID,
			"incident", job.Event.IncidentID,
			"monitor", job.Event.MonitorID,
			"event", job.Event.Event,
			"error", err,
			"mark_error", markErr,
		)
		return err
	}

	if err := n.store.MarkAlertDeliverySent(ctx, job.DeliveryID, messageID); err != nil {
		n.logger.Error("mark alert delivery sent failed",
			"delivery", job.DeliveryID,
			"incident", job.Event.IncidentID,
			"error", err,
		)
		return err
	}

	n.logger.Info("alert email sent",
		"delivery", job.DeliveryID,
		"incident", job.Event.IncidentID,
		"monitor", job.Event.MonitorID,
		"event", job.Event.Event,
		"message_id", messageID,
	)
	return nil
}

func (n *Notifier) markFailed(ctx context.Context, id int64, cause error) error {
	markCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()
	return n.store.MarkAlertDeliveryFailed(markCtx, id, cause.Error())
}
