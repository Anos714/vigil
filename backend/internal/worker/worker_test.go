package worker

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/vigil-monitor/vigil/backend/internal/probe"
	"github.com/vigil-monitor/vigil/backend/internal/store"
)

type fakeStore struct {
	mu       sync.Mutex
	monitors []store.Monitor
	results  []store.CheckResult
	outcome  store.CheckOutcome
}

func (f *fakeStore) ClaimDueMonitors(_ context.Context, _ int) ([]store.Monitor, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.monitors) == 0 {
		return nil, nil
	}
	monitor := f.monitors[0]
	f.monitors = f.monitors[1:]
	return []store.Monitor{monitor}, nil
}

func (f *fakeStore) RecordCheck(_ context.Context, _ store.Monitor, result store.CheckResult) (store.CheckOutcome, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.results = append(f.results, result)
	return f.outcome, nil
}

func (f *fakeStore) snapshot() []store.CheckResult {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := make([]store.CheckResult, len(f.results))
	copy(out, f.results)
	return out
}

type fakeDispatcher struct {
	mu     sync.Mutex
	events []store.IncidentEvent
	err    error
}

func (f *fakeDispatcher) Dispatch(_ context.Context, event store.IncidentEvent) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.events = append(f.events, event)
	return f.err
}

func (f *fakeDispatcher) snapshot() []store.IncidentEvent {
	f.mu.Lock()
	defer f.mu.Unlock()
	out := make([]store.IncidentEvent, len(f.events))
	copy(out, f.events)
	return out
}

func testWorker(st Store) *Worker {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	return New(st, probe.New("VigilTest/1.0"), logger, 2, time.Millisecond)
}

func TestRunPassRecordsSuccess(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	st := &fakeStore{monitors: []store.Monitor{{
		ID:              "mon_test",
		Name:            "Test API",
		URL:             server.URL,
		Method:          http.MethodGet,
		ExpectedStatus:  http.StatusOK,
		IntervalSeconds: 30,
		TimeoutSeconds:  2,
		Region:          "test",
	}}}
	worker := testWorker(st)

	if err := worker.runPass(context.Background()); err != nil {
		t.Fatalf("run pass: %v", err)
	}

	results := st.snapshot()
	if len(results) != 1 {
		t.Fatalf("results = %d, want 1", len(results))
	}
	if !results[0].Success {
		t.Fatalf("expected success, got %#v", results[0])
	}
	if results[0].StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", results[0].StatusCode)
	}
	if snapshot := worker.Snapshot(); snapshot.Checks != 1 || snapshot.Failures != 0 {
		t.Fatalf("unexpected worker status: %#v", snapshot)
	}
}

func TestRunPassRetriesThenSucceeds(t *testing.T) {
	var calls int
	var mu sync.Mutex
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		mu.Lock()
		calls++
		attempt := calls
		mu.Unlock()
		if attempt == 1 {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	st := &fakeStore{monitors: []store.Monitor{{
		ID:              "mon_retry",
		Name:            "Retry API",
		URL:             server.URL,
		Method:          http.MethodGet,
		ExpectedStatus:  http.StatusOK,
		IntervalSeconds: 30,
		TimeoutSeconds:  2,
		Retries:         1,
		Region:          "test",
	}}}
	worker := testWorker(st)

	if err := worker.runPass(context.Background()); err != nil {
		t.Fatalf("run pass: %v", err)
	}

	results := st.snapshot()
	if len(results) != 1 || !results[0].Success {
		t.Fatalf("expected one successful result, got %#v", results)
	}
	mu.Lock()
	defer mu.Unlock()
	if calls != 2 {
		t.Fatalf("calls = %d, want 2", calls)
	}
}

func TestRunPassDispatchesIncidentEvents(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	event := store.IncidentEvent{
		IncidentID:  "inc_test",
		MonitorID:   "mon_test",
		MonitorName: "Test API",
		Event:       "resolved",
	}
	st := &fakeStore{
		monitors: []store.Monitor{{
			ID:              "mon_test",
			Name:            "Test API",
			URL:             server.URL,
			Method:          http.MethodGet,
			ExpectedStatus:  http.StatusOK,
			IntervalSeconds: 30,
			TimeoutSeconds:  2,
			Region:          "test",
		}},
		outcome: store.CheckOutcome{Events: []store.IncidentEvent{event}},
	}
	dispatcher := &fakeDispatcher{}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	worker := New(st, probe.New("VigilTest/1.0"), logger, 2, time.Millisecond, WithAlertDispatcher(dispatcher))

	if err := worker.runPass(context.Background()); err != nil {
		t.Fatalf("run pass: %v", err)
	}
	events := dispatcher.snapshot()
	if len(events) != 1 || events[0].IncidentID != "inc_test" {
		t.Fatalf("dispatched events = %#v", events)
	}
}

func TestRunPassRecordsFailure(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	st := &fakeStore{monitors: []store.Monitor{{
		ID:              "mon_fail",
		Name:            "Failing API",
		URL:             server.URL,
		Method:          http.MethodGet,
		ExpectedStatus:  http.StatusOK,
		IntervalSeconds: 30,
		TimeoutSeconds:  2,
		Region:          "test",
	}}}
	worker := testWorker(st)

	if err := worker.runPass(context.Background()); err != nil {
		t.Fatalf("run pass: %v", err)
	}

	results := st.snapshot()
	if len(results) != 1 || results[0].Success {
		t.Fatalf("expected one failed result, got %#v", results)
	}
	if results[0].Error == "" {
		t.Fatal("expected failure error")
	}
	if snapshot := worker.Snapshot(); snapshot.Checks != 1 || snapshot.Failures != 1 {
		t.Fatalf("unexpected worker status: %#v", snapshot)
	}
}
