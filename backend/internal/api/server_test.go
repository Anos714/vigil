package api

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/vigil-monitor/vigil/backend/internal/config"
	"github.com/vigil-monitor/vigil/backend/internal/store"
)

type fakeStore struct {
	created store.CreateMonitorParams
}

func (f *fakeStore) Ready(context.Context) (store.Readiness, error) {
	return store.Readiness{Postgres: "ok", Redis: "ok"}, nil
}

func (f *fakeStore) ListMonitors(context.Context) ([]store.Monitor, error) {
	return []store.Monitor{}, nil
}

func (f *fakeStore) GetMonitor(_ context.Context, id string) (store.Monitor, error) {
	if id == "mon_test" {
		return store.Monitor{ID: "mon_test", Name: "Search API"}, nil
	}
	return store.Monitor{}, store.ErrNotFound
}

func (f *fakeStore) CreateMonitor(_ context.Context, params store.CreateMonitorParams) (store.Monitor, error) {
	f.created = params
	return store.Monitor{
		ID:              "mon_test",
		Name:            params.Name,
		URL:             params.URL,
		Method:          params.Method,
		ExpectedStatus:  params.ExpectedStatus,
		IntervalSeconds: params.IntervalSeconds,
		TimeoutSeconds:  params.TimeoutSeconds,
		Retries:         params.Retries,
		Region:          params.Region,
		IsPublic:        params.IsPublic,
	}, nil
}

func (f *fakeStore) ListChecks(context.Context, string, int) ([]store.Check, error) {
	status := http.StatusOK
	return []store.Check{{
		ID:         1,
		MonitorID:  "mon_test",
		StatusCode: &status,
		LatencyMS:  42,
		Success:    true,
	}}, nil
}

func (f *fakeStore) MonitorRollup(context.Context, string, time.Time) (store.MonitorRollup, error) {
	average := 42.0
	p50 := 40.0
	p95 := 55.0
	p99 := 60.0
	return store.MonitorRollup{
		Checks:       10,
		Successes:    9,
		Failures:     1,
		UptimePct:    90,
		AvgLatencyMS: &average,
		P50LatencyMS: &p50,
		P95LatencyMS: &p95,
		P99LatencyMS: &p99,
	}, nil
}

func (f *fakeStore) ListIncidents(context.Context, string, int) ([]store.Incident, error) {
	return []store.Incident{{
		ID:        "inc_test",
		MonitorID: "mon_test",
		Title:     "Search API is failing",
		Severity:  "major",
		Status:    "open",
	}}, nil
}

func (f *fakeStore) ProbeSummary(context.Context) (store.ProbeSummary, error) {
	return store.ProbeSummary{ChecksLastHour: 12, ChecksTotal: 120, OpenIncidents: 1}, nil
}

func (f *fakeStore) ListAlertDeliveries(context.Context, int) ([]store.AlertDelivery, error) {
	return []store.AlertDelivery{{
		ID:          1,
		IncidentID:  "inc_test",
		MonitorID:   "mon_test",
		MonitorName: "Search API",
		Event:       "opened",
		Channel:     "email",
		Status:      "sent",
		Attempts:    1,
	}}, nil
}

func testServer(st Store) http.Handler {
	cfg := config.Config{
		Version:        "test",
		AllowedOrigins: []string{"http://localhost:3000"},
	}
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	return New(cfg, st, logger).Handler()
}

func TestHealth(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	response := httptest.NewRecorder()

	testServer(nil).ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
	}
	var body map[string]any
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body["status"] != "ok" || body["service"] != "vigil-api" {
		t.Fatalf("unexpected health body: %#v", body)
	}
}

func TestReadyWithoutDependencies(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	response := httptest.NewRecorder()

	testServer(nil).ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
	}
	var body map[string]any
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body["status"] != "scaffold" {
		t.Fatalf("status = %v, want scaffold", body["status"])
	}
	if body["postgres"] != "not_configured" || body["redis"] != "not_configured" {
		t.Fatalf("unexpected readiness body: %#v", body)
	}
}

func TestMonitorsWithoutStorage(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/v1/monitors", nil)
	response := httptest.NewRecorder()

	testServer(nil).ServeHTTP(response, request)

	if response.Code != http.StatusNotImplemented {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusNotImplemented)
	}
	if !strings.Contains(response.Body.String(), "storage_not_configured") {
		t.Fatalf("unexpected body: %s", response.Body.String())
	}
}

func TestCreateMonitorUsesDefaults(t *testing.T) {
	fake := &fakeStore{}
	request := httptest.NewRequest(http.MethodPost, "/api/v1/monitors", strings.NewReader(`{
		"name": "Search API",
		"url": "https://search.example.com/health"
	}`))
	response := httptest.NewRecorder()

	testServer(fake).ServeHTTP(response, request)

	if response.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d; body: %s", response.Code, http.StatusCreated, response.Body.String())
	}
	if fake.created.Method != http.MethodGet {
		t.Fatalf("method = %q, want GET", fake.created.Method)
	}
	if fake.created.ExpectedStatus != http.StatusOK {
		t.Fatalf("expected status = %d, want 200", fake.created.ExpectedStatus)
	}
	if fake.created.IntervalSeconds != 30 || fake.created.TimeoutSeconds != 10 {
		t.Fatalf("unexpected defaults: %#v", fake.created)
	}
	if !fake.created.IsPublic {
		t.Fatal("isPublic should default to true")
	}
	if location := response.Header().Get("Location"); location != "/api/v1/monitors/mon_test" {
		t.Fatalf("location = %q", location)
	}
}

func TestCreateMonitorValidation(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/api/v1/monitors", strings.NewReader(`{
		"name": "Bad URL",
		"url": "not-a-url"
	}`))
	response := httptest.NewRecorder()

	testServer(&fakeStore{}).ServeHTTP(response, request)

	if response.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusUnprocessableEntity)
	}
	if !strings.Contains(response.Body.String(), "validation_failed") {
		t.Fatalf("unexpected body: %s", response.Body.String())
	}
}

func TestValidateMonitorRejectsBadTimeout(t *testing.T) {
	_, err := validateMonitor(createMonitorRequest{
		Name:            "Slow API",
		URL:             "https://example.com/health",
		IntervalSeconds: 5,
		TimeoutSeconds:  10,
	})
	if err == nil {
		t.Fatal("expected timeout validation error")
	}
}

func TestCORS(t *testing.T) {
	request := httptest.NewRequest(http.MethodOptions, "/api/v1/monitors", nil)
	request.Header.Set("Origin", "http://localhost:3000")
	response := httptest.NewRecorder()

	testServer(nil).ServeHTTP(response, request)

	if response.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusNoContent)
	}
	if got := response.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:3000" {
		t.Fatalf("allow origin = %q", got)
	}
}

func TestProbeSummaryWithoutStorage(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/v1/probes", nil)
	response := httptest.NewRecorder()

	testServer(nil).ServeHTTP(response, request)

	if response.Code != http.StatusNotImplemented {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusNotImplemented)
	}
	if !strings.Contains(response.Body.String(), "storage_not_configured") {
		t.Fatalf("unexpected body: %s", response.Body.String())
	}
}

func TestProbeSummaryWithStorage(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/v1/probes", nil)
	response := httptest.NewRecorder()

	testServer(&fakeStore{}).ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body: %s", response.Code, http.StatusOK, response.Body.String())
	}
	var body map[string]any
	if err := json.NewDecoder(response.Body).Decode(&body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body["scheduler"] != "vigil-worker" {
		t.Fatalf("unexpected body: %#v", body)
	}
}

func TestListChecks(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/v1/monitors/mon_test/checks", nil)
	response := httptest.NewRecorder()

	testServer(&fakeStore{}).ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body: %s", response.Code, http.StatusOK, response.Body.String())
	}
	if !strings.Contains(response.Body.String(), `"count":1`) {
		t.Fatalf("unexpected body: %s", response.Body.String())
	}
}

func TestMonitorRollup(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/v1/monitors/mon_test/rollup?window=7d", nil)
	response := httptest.NewRecorder()

	testServer(&fakeStore{}).ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body: %s", response.Code, http.StatusOK, response.Body.String())
	}
	body := response.Body.String()
	if !strings.Contains(body, `"window":"7d"`) {
		t.Fatalf("unexpected window: %s", body)
	}
	if !strings.Contains(body, `"uptimePct":90`) {
		t.Fatalf("unexpected uptime: %s", body)
	}
	if !strings.Contains(body, `"p95LatencyMs":55`) {
		t.Fatalf("unexpected latency: %s", body)
	}
}

func TestMonitorRollupRejectsBadWindow(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/v1/monitors/mon_test/rollup?window=forever", nil)
	response := httptest.NewRecorder()

	testServer(&fakeStore{}).ServeHTTP(response, request)

	if response.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusUnprocessableEntity)
	}
}

func TestMonitorRollupNotFound(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/v1/monitors/mon_missing/rollup", nil)
	response := httptest.NewRecorder()

	testServer(&fakeStore{}).ServeHTTP(response, request)

	if response.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusNotFound)
	}
}

func TestMonitorRollupWithoutStorage(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/v1/monitors/mon_test/rollup", nil)
	response := httptest.NewRecorder()

	testServer(nil).ServeHTTP(response, request)

	if response.Code != http.StatusNotImplemented {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusNotImplemented)
	}
}

func TestParseRollupWindow(t *testing.T) {
	for _, input := range []string{"", "1h", "6h", "24h", "7d", "30d", "90d", " 7D "} {
		if _, canonical, err := parseRollupWindow(input); err != nil {
			t.Fatalf("parse %q: %v", input, err)
		} else if canonical == "" {
			t.Fatalf("parse %q returned an empty canonical window", input)
		}
	}
	if _, _, err := parseRollupWindow("2d"); err == nil {
		t.Fatal("expected invalid window error")
	}
}

func TestListIncidents(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/v1/incidents?status=open", nil)
	response := httptest.NewRecorder()

	testServer(&fakeStore{}).ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body: %s", response.Code, http.StatusOK, response.Body.String())
	}
	if !strings.Contains(response.Body.String(), `"count":1`) {
		t.Fatalf("unexpected body: %s", response.Body.String())
	}
}

func TestListIncidentsRejectsBadStatus(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/v1/incidents?status=broken", nil)
	response := httptest.NewRecorder()

	testServer(&fakeStore{}).ServeHTTP(response, request)

	if response.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusUnprocessableEntity)
	}
}

func TestListAlerts(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/v1/alerts", nil)
	response := httptest.NewRecorder()

	testServer(&fakeStore{}).ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body: %s", response.Code, http.StatusOK, response.Body.String())
	}
	if !strings.Contains(response.Body.String(), `"count":1`) {
		t.Fatalf("unexpected body: %s", response.Body.String())
	}
	if !strings.Contains(response.Body.String(), `"status":"sent"`) {
		t.Fatalf("unexpected body: %s", response.Body.String())
	}
}

func TestListAlertsWithoutStorage(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/api/v1/alerts", nil)
	response := httptest.NewRecorder()

	testServer(nil).ServeHTTP(response, request)

	if response.Code != http.StatusNotImplemented {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusNotImplemented)
	}
	if !strings.Contains(response.Body.String(), "storage_not_configured") {
		t.Fatalf("unexpected body: %s", response.Body.String())
	}
}

func TestUnknownRoute(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/does-not-exist", nil)
	response := httptest.NewRecorder()

	testServer(nil).ServeHTTP(response, request)

	if response.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusNotFound)
	}
}

func TestRequestLoggerCapturesStatusAndRequestID(t *testing.T) {
	var logs bytes.Buffer
	cfg := config.Config{
		Version:        "test",
		AllowedOrigins: []string{"http://localhost:3000"},
	}
	logger := slog.New(slog.NewJSONHandler(&logs, nil))
	handler := New(cfg, nil, logger).Handler()

	request := httptest.NewRequest(http.MethodGet, "/does-not-exist", nil)
	request.Header.Set("X-Request-ID", "req-test-123")
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if got := response.Header().Get("X-Request-ID"); got != "req-test-123" {
		t.Fatalf("request id header = %q, want %q", got, "req-test-123")
	}

	var entry map[string]any
	if err := json.Unmarshal(bytes.TrimSpace(logs.Bytes()), &entry); err != nil {
		t.Fatalf("decode log: %v", err)
	}
	if entry["request_id"] != "req-test-123" {
		t.Fatalf("logged request_id = %v", entry["request_id"])
	}
	if entry["status"] != float64(http.StatusNotFound) {
		t.Fatalf("logged status = %v, want %d", entry["status"], http.StatusNotFound)
	}
	if entry["method"] != http.MethodGet || entry["path"] != "/does-not-exist" {
		t.Fatalf("unexpected request log: %#v", entry)
	}
}

func TestRequestLoggerGeneratesRequestID(t *testing.T) {
	var logs bytes.Buffer
	cfg := config.Config{Version: "test"}
	logger := slog.New(slog.NewJSONHandler(&logs, nil))
	handler := New(cfg, nil, logger).Handler()

	request := httptest.NewRequest(http.MethodGet, "/does-not-exist", nil)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	requestID := response.Header().Get("X-Request-ID")
	if requestID == "" {
		t.Fatal("request id header is empty")
	}

	var entry map[string]any
	if err := json.Unmarshal(bytes.TrimSpace(logs.Bytes()), &entry); err != nil {
		t.Fatalf("decode log: %v", err)
	}
	if entry["request_id"] != requestID {
		t.Fatalf("logged request_id = %v, header = %q", entry["request_id"], requestID)
	}
}

func TestRequestLoggerKeepsHealthChecksQuietAtInfo(t *testing.T) {
	var logs bytes.Buffer
	cfg := config.Config{Version: "test"}
	logger := slog.New(slog.NewJSONHandler(&logs, nil))
	handler := New(cfg, nil, logger).Handler()

	request := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
	}
	if logs.Len() != 0 {
		t.Fatalf("health check wrote log at info level: %s", logs.String())
	}
}

func TestRecovererLogsPanicAndRequestStatus(t *testing.T) {
	var logs bytes.Buffer
	cfg := config.Config{Version: "test"}
	logger := slog.New(slog.NewJSONHandler(&logs, nil))
	server := New(cfg, nil, logger)
	handler := server.requestLogger(server.recoverer(http.HandlerFunc(
		func(http.ResponseWriter, *http.Request) {
			panic("boom")
		},
	)))

	request := httptest.NewRequest(http.MethodGet, "/panic", nil)
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)

	if response.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusInternalServerError)
	}
	if !strings.Contains(logs.String(), "panic recovered") {
		t.Fatalf("panic log missing: %s", logs.String())
	}
	if !strings.Contains(logs.String(), `"status":500`) {
		t.Fatalf("request status log missing: %s", logs.String())
	}
}
