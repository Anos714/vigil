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

type fakeDispatcherStore struct {
	created    bool
	createErr  error
	delivery   store.AlertDelivery
	failedIDs  []int64
	failReason string
}

func (f *fakeDispatcherStore) CreateAlertDelivery(_ context.Context, event store.IncidentEvent, _ string) (store.AlertDelivery, bool, error) {
	if f.createErr != nil {
		return store.AlertDelivery{}, false, f.createErr
	}
	if !f.created {
		return store.AlertDelivery{}, false, nil
	}
	delivery := f.delivery
	delivery.IncidentID = event.IncidentID
	return delivery, true, nil
}

func (f *fakeDispatcherStore) MarkAlertDeliveryFailed(_ context.Context, id int64, reason string) error {
	f.failedIDs = append(f.failedIDs, id)
	f.failReason = reason
	return nil
}

type fakeEnqueuer struct {
	tasks  []*asynq.Task
	info   *asynq.TaskInfo
	err    error
	closed bool
}

func (f *fakeEnqueuer) EnqueueContext(_ context.Context, task *asynq.Task, _ ...asynq.Option) (*asynq.TaskInfo, error) {
	f.tasks = append(f.tasks, task)
	if f.err != nil {
		return nil, f.err
	}
	if f.info != nil {
		return f.info, nil
	}
	return &asynq.TaskInfo{ID: "task_test", Queue: QueueName}, nil
}

func (f *fakeEnqueuer) Close() error {
	f.closed = true
	return nil
}

func testDispatcher(store DispatcherStore, enqueuer TaskEnqueuer) *Dispatcher {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	return NewDispatcher(store, enqueuer, logger)
}

func testIncidentEvent() store.IncidentEvent {
	return store.IncidentEvent{
		IncidentID:  "inc_test",
		MonitorID:   "mon_test",
		MonitorName: "Search API",
		Event:       "opened",
		Title:       "Search API is failing",
		Severity:    "major",
		StatusCode:  503,
		StartedAt:   time.Date(2026, 10, 29, 10, 0, 0, 0, time.UTC),
		OccurredAt:  time.Date(2026, 10, 29, 10, 0, 0, 0, time.UTC),
	}
}

func TestDispatcherCreatesAndEnqueuesEmail(t *testing.T) {
	deliveryStore := &fakeDispatcherStore{
		created:  true,
		delivery: store.AlertDelivery{ID: 42},
	}
	enqueuer := &fakeEnqueuer{}
	dispatcher := testDispatcher(deliveryStore, enqueuer)

	if err := dispatcher.Dispatch(context.Background(), testIncidentEvent()); err != nil {
		t.Fatalf("dispatch: %v", err)
	}
	if len(enqueuer.tasks) != 1 {
		t.Fatalf("tasks = %d, want 1", len(enqueuer.tasks))
	}
	task := enqueuer.tasks[0]
	if task.Type() != TaskEmail {
		t.Fatalf("task type = %q", task.Type())
	}
	var job Job
	if err := json.Unmarshal(task.Payload(), &job); err != nil {
		t.Fatalf("decode payload: %v", err)
	}
	if job.DeliveryID != 42 || job.Event.IncidentID != "inc_test" {
		t.Fatalf("job = %#v", job)
	}
}

func TestDispatcherSkipsDuplicateDelivery(t *testing.T) {
	deliveryStore := &fakeDispatcherStore{created: false}
	enqueuer := &fakeEnqueuer{}
	dispatcher := testDispatcher(deliveryStore, enqueuer)

	if err := dispatcher.Dispatch(context.Background(), testIncidentEvent()); err != nil {
		t.Fatalf("dispatch: %v", err)
	}
	if len(enqueuer.tasks) != 0 {
		t.Fatalf("tasks = %d, want 0", len(enqueuer.tasks))
	}
}

func TestDispatcherMarksFailedWhenEnqueueFails(t *testing.T) {
	deliveryStore := &fakeDispatcherStore{
		created:  true,
		delivery: store.AlertDelivery{ID: 43},
	}
	enqueuer := &fakeEnqueuer{err: errors.New("redis down")}
	dispatcher := testDispatcher(deliveryStore, enqueuer)

	err := dispatcher.Dispatch(context.Background(), testIncidentEvent())
	if err == nil {
		t.Fatal("expected enqueue error")
	}
	if len(deliveryStore.failedIDs) != 1 || deliveryStore.failedIDs[0] != 43 {
		t.Fatalf("failed ids = %#v", deliveryStore.failedIDs)
	}
	if deliveryStore.failReason != "redis down" {
		t.Fatalf("fail reason = %q", deliveryStore.failReason)
	}
}

func TestDispatcherClose(t *testing.T) {
	enqueuer := &fakeEnqueuer{}
	dispatcher := testDispatcher(&fakeDispatcherStore{}, enqueuer)
	if err := dispatcher.Close(); err != nil {
		t.Fatalf("close: %v", err)
	}
	if !enqueuer.closed {
		t.Fatal("enqueuer was not closed")
	}
}
