package alert

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/hibiken/asynq"
	"github.com/vigil-monitor/vigil/backend/internal/store"
)

type fakeNotifierStore struct {
	delivery     store.AlertDelivery
	getErr       error
	sentID       int64
	sentProvider string
	failedID     int64
	failedReason string
}

func (f *fakeNotifierStore) GetAlertDelivery(_ context.Context, id int64) (store.AlertDelivery, error) {
	if f.getErr != nil {
		return store.AlertDelivery{}, f.getErr
	}
	delivery := f.delivery
	delivery.ID = id
	return delivery, nil
}

func (f *fakeNotifierStore) MarkAlertDeliverySent(_ context.Context, id int64, providerMessageID string) error {
	f.sentID = id
	f.sentProvider = providerMessageID
	return nil
}

func (f *fakeNotifierStore) MarkAlertDeliveryFailed(_ context.Context, id int64, reason string) error {
	f.failedID = id
	f.failedReason = reason
	return nil
}

type fakeSender struct {
	message Email
	id      string
	err     error
	calls   int
}

func (f *fakeSender) Send(_ context.Context, message Email) (string, error) {
	f.calls++
	f.message = message
	return f.id, f.err
}

func testNotifier(st NotifierStore, sender Sender) *Notifier {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	notifier, err := NewNotifier(st, sender, []string{"ops@example.com"}, "http://localhost:3000", logger)
	if err != nil {
		panic(err)
	}
	return notifier
}

func testEmailTask(t *testing.T, job Job) *asynq.Task {
	t.Helper()
	payload, err := json.Marshal(job)
	if err != nil {
		t.Fatalf("encode job: %v", err)
	}
	return asynq.NewTask(TaskEmail, payload)
}

func TestNotifierSendsAndMarksDeliverySent(t *testing.T) {
	started := time.Date(2026, 10, 29, 10, 0, 0, 0, time.UTC)
	event := store.IncidentEvent{
		IncidentID:  "inc_test",
		MonitorID:   "mon_test",
		MonitorName: "Search API",
		Event:       "opened",
		Severity:    "major",
		StatusCode:  503,
		Cause:       "connection refused",
		StartedAt:   started,
		OccurredAt:  started,
	}
	deliveryStore := &fakeNotifierStore{
		delivery: store.AlertDelivery{
			Channel: ChannelEmail,
			Status:  "queued",
		},
	}
	sender := &fakeSender{id: "msg_test"}
	notifier := testNotifier(deliveryStore, sender)

	task := testEmailTask(t, Job{DeliveryID: 77, Event: event})
	if err := notifier.HandleEmail(context.Background(), task); err != nil {
		t.Fatalf("handle email: %v", err)
	}
	if deliveryStore.sentID != 77 || deliveryStore.sentProvider != "msg_test" {
		t.Fatalf("sent state = id %d provider %q", deliveryStore.sentID, deliveryStore.sentProvider)
	}
	if sender.calls != 1 {
		t.Fatalf("sender calls = %d", sender.calls)
	}
	if len(sender.message.To) != 1 || sender.message.To[0] != "ops@example.com" {
		t.Fatalf("recipients = %#v", sender.message.To)
	}
	if sender.message.Subject == "" || sender.message.HTML == "" || sender.message.Text == "" {
		t.Fatalf("message was not rendered: %#v", sender.message)
	}
}

func TestNotifierSkipsAlreadySentDelivery(t *testing.T) {
	deliveryStore := &fakeNotifierStore{
		delivery: store.AlertDelivery{
			Channel: ChannelEmail,
			Status:  "sent",
		},
	}
	sender := &fakeSender{id: "should-not-send"}
	notifier := testNotifier(deliveryStore, sender)

	event := testIncidentEvent()
	task := testEmailTask(t, Job{DeliveryID: 78, Event: event})
	if err := notifier.HandleEmail(context.Background(), task); err != nil {
		t.Fatalf("handle email: %v", err)
	}
	if sender.calls != 0 {
		t.Fatalf("sender calls = %d, want 0", sender.calls)
	}
}

func TestNotifierMarksFailedWhenProviderFails(t *testing.T) {
	deliveryStore := &fakeNotifierStore{
		delivery: store.AlertDelivery{
			Channel: ChannelEmail,
			Status:  "queued",
		},
	}
	sender := &fakeSender{err: errors.New("brevo unavailable")}
	notifier := testNotifier(deliveryStore, sender)

	event := testIncidentEvent()
	task := testEmailTask(t, Job{DeliveryID: 79, Event: event})
	err := notifier.HandleEmail(context.Background(), task)
	if err == nil {
		t.Fatal("expected provider error")
	}
	if deliveryStore.failedID != 79 || deliveryStore.failedReason != "brevo unavailable" {
		t.Fatalf("failed state = id %d reason %q", deliveryStore.failedID, deliveryStore.failedReason)
	}
}

func TestNotifierDropsMissingDelivery(t *testing.T) {
	deliveryStore := &fakeNotifierStore{getErr: store.ErrNotFound}
	sender := &fakeSender{}
	notifier := testNotifier(deliveryStore, sender)

	task := testEmailTask(t, Job{DeliveryID: 80, Event: testIncidentEvent()})
	if err := notifier.HandleEmail(context.Background(), task); err != nil {
		t.Fatalf("handle email: %v", err)
	}
	if sender.calls != 0 {
		t.Fatalf("sender calls = %d, want 0", sender.calls)
	}
}

func TestNotifierRejectsMalformedJob(t *testing.T) {
	notifier := testNotifier(&fakeNotifierStore{}, &fakeSender{})
	task := asynq.NewTask(TaskEmail, []byte(`{"deliveryId":0}`))
	if err := notifier.HandleEmail(context.Background(), task); err == nil {
		t.Fatal("expected malformed job error")
	}
}
