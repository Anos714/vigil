package worker

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func testHealthWorker() *Worker {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	return New(nil, nil, logger, 1, time.Second)
}

func TestHealthz(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	response := httptest.NewRecorder()

	NewHealthHandler(nil).ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
	}
	if !strings.Contains(response.Body.String(), `"service":"vigil-worker"`) {
		t.Fatalf("unexpected body: %s", response.Body.String())
	}
}

func TestReadyzStarting(t *testing.T) {
	request := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	response := httptest.NewRecorder()

	NewHealthHandler(testHealthWorker()).ServeHTTP(response, request)

	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusServiceUnavailable)
	}
	if !strings.Contains(response.Body.String(), `"status":"starting"`) {
		t.Fatalf("unexpected body: %s", response.Body.String())
	}
}

func TestReadyzReady(t *testing.T) {
	runner := testHealthWorker()
	runner.running.Store(true)

	request := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	response := httptest.NewRecorder()

	NewHealthHandler(runner).ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d; body: %s", response.Code, http.StatusOK, response.Body.String())
	}
	if !strings.Contains(response.Body.String(), `"status":"ready"`) {
		t.Fatalf("unexpected body: %s", response.Body.String())
	}
}

func TestReadyzDegraded(t *testing.T) {
	runner := testHealthWorker()
	runner.running.Store(true)
	runner.lastError = "database unavailable"

	request := httptest.NewRequest(http.MethodGet, "/readyz", nil)
	response := httptest.NewRecorder()

	NewHealthHandler(runner).ServeHTTP(response, request)

	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusServiceUnavailable)
	}
	if !strings.Contains(response.Body.String(), `"status":"degraded"`) {
		t.Fatalf("unexpected body: %s", response.Body.String())
	}
}
