package probe

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestProbeSuccess(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("method = %s, want POST", r.Method)
		}
		if r.Header.Get("User-Agent") != "VigilTest/1.0" {
			t.Errorf("user agent = %q", r.Header.Get("User-Agent"))
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()

	prober := New("VigilTest/1.0")
	result := prober.Probe(context.Background(), Target{
		URL:            server.URL,
		Method:         http.MethodPost,
		ExpectedStatus: http.StatusNoContent,
		TimeoutSeconds: 2,
	})

	if !result.Success {
		t.Fatalf("expected success, got %#v", result)
	}
	if result.StatusCode != http.StatusNoContent {
		t.Fatalf("status = %d, want 204", result.StatusCode)
	}
	if result.CheckedAt.IsZero() {
		t.Fatal("checkedAt should be set")
	}
	if result.LatencyMS < 0 {
		t.Fatalf("latency = %d", result.LatencyMS)
	}
}

func TestProbeStatusMismatch(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer server.Close()

	result := New("VigilTest/1.0").Probe(context.Background(), Target{
		URL:            server.URL,
		Method:         http.MethodGet,
		ExpectedStatus: http.StatusOK,
		TimeoutSeconds: 2,
	})

	if result.Success {
		t.Fatal("expected status mismatch to fail")
	}
	if result.StatusCode != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503", result.StatusCode)
	}
	if !strings.Contains(result.Error, "unexpected status 503") {
		t.Fatalf("error = %q", result.Error)
	}
}

func TestProbeTimeout(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		time.Sleep(1500 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	result := New("VigilTest/1.0").Probe(context.Background(), Target{
		URL:            server.URL,
		Method:         http.MethodGet,
		ExpectedStatus: http.StatusOK,
		TimeoutSeconds: 1,
	})

	if result.Success {
		t.Fatal("expected timeout to fail")
	}
	if result.Error == "" {
		t.Fatal("expected timeout error")
	}
}

func TestProbeInvalidURL(t *testing.T) {
	result := New("VigilTest/1.0").Probe(context.Background(), Target{
		URL:            "://not-a-url",
		ExpectedStatus: http.StatusOK,
		TimeoutSeconds: 1,
	})

	if result.Success || result.Error == "" {
		t.Fatalf("expected invalid URL error, got %#v", result)
	}
}
