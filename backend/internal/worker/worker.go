package worker

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"sync/atomic"
	"time"

	"github.com/vigil-monitor/vigil/backend/internal/probe"
	"github.com/vigil-monitor/vigil/backend/internal/store"
)

// Store is the storage contract the worker needs.
type Store interface {
	ClaimDueMonitors(context.Context, int) ([]store.Monitor, error)
	RecordCheck(context.Context, store.Monitor, store.CheckResult) (store.CheckOutcome, error)
}

// AlertDispatcher enqueues a deduplicated alert for an incident transition.
type AlertDispatcher interface {
	Dispatch(context.Context, store.IncidentEvent) error
}

// Option customizes a worker without changing the existing constructor shape.
type Option func(*Worker)

// WithAlertDispatcher enables alert enqueueing after check writes.
func WithAlertDispatcher(dispatcher AlertDispatcher) Option {
	return func(w *Worker) {
		w.alerts = dispatcher
	}
}

// Worker leases due monitors, executes HTTP probes, and writes the results.
type Worker struct {
	store       Store
	prober      *probe.Prober
	logger      *slog.Logger
	alerts      AlertDispatcher
	concurrency int
	tick        time.Duration

	checks   atomic.Int64
	failures atomic.Int64
	running  atomic.Bool

	mu         sync.RWMutex
	lastPassAt time.Time
	lastError  string
}

// Status is a point-in-time worker snapshot for logs or a future metrics page.
type Status struct {
	Running     bool       `json:"running"`
	Checks      int64      `json:"checks"`
	Failures    int64      `json:"failures"`
	LastPassAt  *time.Time `json:"lastPassAt,omitempty"`
	LastError   string     `json:"lastError,omitempty"`
	Concurrency int        `json:"concurrency"`
	Tick        string     `json:"tick"`
}

// New creates a worker. Invalid concurrency/tick values fall back to safe
// defaults rather than preventing startup.
func New(st Store, prober *probe.Prober, logger *slog.Logger, concurrency int, tick time.Duration, opts ...Option) *Worker {
	if logger == nil {
		logger = slog.Default()
	}
	if prober == nil {
		prober = probe.New("")
	}
	if concurrency < 1 {
		concurrency = 1
	}
	if tick <= 0 {
		tick = 2 * time.Second
	}
	worker := &Worker{
		store:       st,
		prober:      prober,
		logger:      logger,
		concurrency: concurrency,
		tick:        tick,
	}
	for _, opt := range opts {
		opt(worker)
	}
	return worker
}

// Run polls for due monitors until the context is cancelled.
func (w *Worker) Run(ctx context.Context) error {
	w.running.Store(true)
	defer w.running.Store(false)

	w.logger.Info("probe worker started",
		"concurrency", w.concurrency,
		"tick", w.tick.String(),
	)

	for {
		err := w.runPass(ctx)
		w.mu.Lock()
		w.lastPassAt = time.Now().UTC()
		if err != nil {
			w.lastError = err.Error()
		} else {
			w.lastError = ""
		}
		w.mu.Unlock()

		if err != nil && ctx.Err() == nil {
			w.logger.Error("probe pass failed", "error", err)
		}

		select {
		case <-ctx.Done():
			w.logger.Info("probe worker stopped")
			return nil
		case <-time.After(w.tick):
		}
	}
}

func (w *Worker) runPass(ctx context.Context) error {
	for {
		monitors, err := w.store.ClaimDueMonitors(ctx, w.concurrency*4)
		if err != nil {
			return err
		}
		if len(monitors) == 0 {
			return nil
		}

		w.process(ctx, monitors)
		if ctx.Err() != nil {
			return nil
		}
	}
}

func (w *Worker) process(ctx context.Context, monitors []store.Monitor) {
	sem := make(chan struct{}, w.concurrency)
	var waitGroup sync.WaitGroup

loop:
	for _, monitor := range monitors {
		select {
		case <-ctx.Done():
			break loop
		case sem <- struct{}{}:
		}

		waitGroup.Add(1)
		go func(monitor store.Monitor) {
			defer waitGroup.Done()
			defer func() { <-sem }()
			w.check(ctx, monitor)
		}(monitor)
	}

	waitGroup.Wait()
}

func (w *Worker) check(ctx context.Context, monitor store.Monitor) {
	target := probe.Target{
		URL:            monitor.URL,
		Method:         monitor.Method,
		ExpectedStatus: monitor.ExpectedStatus,
		TimeoutSeconds: monitor.TimeoutSeconds,
	}

	attempts := monitor.Retries + 1
	if attempts < 1 {
		attempts = 1
	}

	var result probe.Result
	for attempt := 1; attempt <= attempts; attempt++ {
		result = w.prober.Probe(ctx, target)
		if result.Success || ctx.Err() != nil {
			break
		}
		if attempt < attempts {
			w.logger.Debug("probe retry",
				"monitor", monitor.ID,
				"name", monitor.Name,
				"attempt", attempt,
				"attempts", attempts,
				"error", result.Error,
			)
			timer := time.NewTimer(300 * time.Millisecond)
			select {
			case <-ctx.Done():
				timer.Stop()
				return
			case <-timer.C:
			}
		}
	}

	if ctx.Err() != nil {
		return
	}
	if !result.Success && attempts > 1 {
		result.Error = fmt.Sprintf("%s (after %d attempts)", result.Error, attempts)
	}

	storeResult := store.CheckResult{
		CheckedAt:  result.CheckedAt,
		StatusCode: result.StatusCode,
		LatencyMS:  result.LatencyMS,
		DNSMS:      result.DNSMS,
		TCPMS:      result.TCPMS,
		TLSMS:      result.TLSMS,
		TTFBMS:     result.TTFBMS,
		Success:    result.Success,
		Error:      result.Error,
	}
	outcome, err := w.store.RecordCheck(ctx, monitor, storeResult)
	if err != nil {
		w.logger.Error("record probe check failed",
			"monitor", monitor.ID,
			"name", monitor.Name,
			"error", err,
		)
		return
	}

	if w.alerts != nil {
		for _, event := range outcome.Events {
			if err := w.alerts.Dispatch(ctx, event); err != nil {
				w.logger.Error("enqueue alert failed",
					"incident", event.IncidentID,
					"monitor", event.MonitorID,
					"event", event.Event,
					"error", err,
				)
			}
		}
	}

	w.checks.Add(1)
	if !result.Success {
		w.failures.Add(1)
	}

	attrs := []any{
		"monitor", monitor.ID,
		"name", monitor.Name,
		"attempts", attempts,
		"success", result.Success,
		"status", result.StatusCode,
		"latency_ms", result.LatencyMS,
	}
	if result.Error != "" {
		attrs = append(attrs, "error", result.Error)
	}
	w.logger.Info("probe check", attrs...)
}

// Snapshot returns a copy of the worker's in-memory status.
func (w *Worker) Snapshot() Status {
	w.mu.RLock()
	defer w.mu.RUnlock()

	status := Status{
		Running:     w.running.Load(),
		Checks:      w.checks.Load(),
		Failures:    w.failures.Load(),
		LastError:   w.lastError,
		Concurrency: w.concurrency,
		Tick:        w.tick.String(),
	}
	if !w.lastPassAt.IsZero() {
		value := w.lastPassAt
		status.LastPassAt = &value
	}
	return status
}
