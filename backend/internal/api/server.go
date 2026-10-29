package api

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/vigil-monitor/vigil/backend/internal/config"
	"github.com/vigil-monitor/vigil/backend/internal/store"
)

// Store is the subset of storage behavior the HTTP layer needs.
type Store interface {
	Ready(context.Context) (store.Readiness, error)
	ListMonitors(context.Context) ([]store.Monitor, error)
	GetMonitor(context.Context, string) (store.Monitor, error)
	CreateMonitor(context.Context, store.CreateMonitorParams) (store.Monitor, error)
	ListChecks(context.Context, string, int) ([]store.Check, error)
	MonitorRollup(context.Context, string, time.Time) (store.MonitorRollup, error)
	ListIncidents(context.Context, string, int) ([]store.Incident, error)
	ProbeSummary(context.Context) (store.ProbeSummary, error)
	ListAlertDeliveries(context.Context, int) ([]store.AlertDelivery, error)
}

// Server is the Vigil HTTP API scaffold.
type Server struct {
	cfg    config.Config
	store  Store
	logger *slog.Logger
}

// New creates an API server. A nil store is valid: the API then reports that
// storage is not configured instead of pretending to persist data.
func New(cfg config.Config, st Store, logger *slog.Logger) *Server {
	if logger == nil {
		logger = slog.Default()
	}
	return &Server{cfg: cfg, store: st, logger: logger}
}

// Handler returns the fully wrapped HTTP handler.
func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /{$}", s.handleIndex)
	mux.HandleFunc("GET /healthz", s.handleHealth)
	mux.HandleFunc("GET /readyz", s.handleReady)
	mux.HandleFunc("GET /api/v1", s.handleIndex)
	mux.HandleFunc("GET /api/v1/monitors", s.handleListMonitors)
	mux.HandleFunc("POST /api/v1/monitors", s.handleCreateMonitor)
	mux.HandleFunc("GET /api/v1/monitors/{id}/checks", s.handleListChecks)
	mux.HandleFunc("GET /api/v1/monitors/{id}/rollup", s.handleMonitorRollup)
	mux.HandleFunc("GET /api/v1/monitors/{id}", s.handleGetMonitor)
	mux.HandleFunc("GET /api/v1/probes", s.handleProbeSummary)
	mux.HandleFunc("GET /api/v1/incidents", s.handleListIncidents)
	mux.HandleFunc("GET /api/v1/alerts", s.handleListAlerts)

	return s.requestLogger(s.recoverer(s.cors(mux)))
}

func (s *Server) handleIndex(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"service":        "vigil-api",
		"version":        s.cfg.Version,
		"status":         "scaffold",
		"probeScheduler": "vigil-worker",
		"alertDelivery":  "email_queue",
		"endpoints": []string{
			"GET /healthz",
			"GET /readyz",
			"GET /api/v1/monitors",
			"POST /api/v1/monitors",
			"GET /api/v1/monitors/{id}",
			"GET /api/v1/monitors/{id}/checks",
			"GET /api/v1/monitors/{id}/rollup",
			"GET /api/v1/probes",
			"GET /api/v1/incidents",
			"GET /api/v1/alerts",
		},
	})
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":  "ok",
		"service": "vigil-api",
		"version": s.cfg.Version,
		"time":    time.Now().UTC(),
	})
}

func (s *Server) handleReady(w http.ResponseWriter, r *http.Request) {
	readiness := store.Readiness{Postgres: "not_configured", Redis: "not_configured"}
	var err error
	if s.store != nil {
		readiness, err = s.store.Ready(r.Context())
	}

	status := "scaffold"
	code := http.StatusOK
	if err != nil {
		status = "degraded"
		code = http.StatusServiceUnavailable
	} else if readiness.Postgres == "ok" && readiness.Redis == "ok" {
		status = "ready"
	}

	writeJSON(w, code, map[string]any{
		"status":         status,
		"postgres":       readiness.Postgres,
		"redis":          readiness.Redis,
		"probeScheduler": "vigil-worker",
	})
}

func (s *Server) handleListMonitors(w http.ResponseWriter, r *http.Request) {
	if s.store == nil {
		writeStorageNotConfigured(w)
		return
	}

	monitors, err := s.store.ListMonitors(r.Context())
	if errors.Is(err, store.ErrNotConfigured) {
		writeStorageNotConfigured(w)
		return
	}
	if err != nil {
		s.logger.Error("list monitors failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal_error"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"monitors": monitors,
		"count":    len(monitors),
	})
}

func (s *Server) handleGetMonitor(w http.ResponseWriter, r *http.Request) {
	if s.store == nil {
		writeStorageNotConfigured(w)
		return
	}

	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid_monitor_id"})
		return
	}

	monitor, err := s.store.GetMonitor(r.Context(), id)
	if errors.Is(err, store.ErrNotConfigured) {
		writeStorageNotConfigured(w)
		return
	}
	if errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "monitor_not_found"})
		return
	}
	if err != nil {
		s.logger.Error("get monitor failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal_error"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{"monitor": monitor})
}

func (s *Server) handleListChecks(w http.ResponseWriter, r *http.Request) {
	if s.store == nil {
		writeStorageNotConfigured(w)
		return
	}

	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid_monitor_id"})
		return
	}

	if _, err := s.store.GetMonitor(r.Context(), id); errors.Is(err, store.ErrNotConfigured) {
		writeStorageNotConfigured(w)
		return
	} else if errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "monitor_not_found"})
		return
	} else if err != nil {
		s.logger.Error("get monitor for checks failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal_error"})
		return
	}

	checks, err := s.store.ListChecks(r.Context(), id, queryLimit(r, 50, 200))
	if errors.Is(err, store.ErrNotConfigured) {
		writeStorageNotConfigured(w)
		return
	}
	if err != nil {
		s.logger.Error("list checks failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal_error"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"checks": checks,
		"count":  len(checks),
	})
}

func (s *Server) handleMonitorRollup(w http.ResponseWriter, r *http.Request) {
	if s.store == nil {
		writeStorageNotConfigured(w)
		return
	}

	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" {
		writeJSON(w, http.StatusBadRequest, errorResponse{Error: "invalid_monitor_id"})
		return
	}

	window, canonicalWindow, err := parseRollupWindow(r.URL.Query().Get("window"))
	if err != nil {
		writeJSON(w, http.StatusUnprocessableEntity, errorResponse{
			Error:  "validation_failed",
			Detail: err.Error(),
		})
		return
	}

	if _, err := s.store.GetMonitor(r.Context(), id); errors.Is(err, store.ErrNotConfigured) {
		writeStorageNotConfigured(w)
		return
	} else if errors.Is(err, store.ErrNotFound) {
		writeJSON(w, http.StatusNotFound, errorResponse{Error: "monitor_not_found"})
		return
	} else if err != nil {
		s.logger.Error("get monitor for rollup failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal_error"})
		return
	}

	until := time.Now().UTC()
	since := until.Add(-window)
	rollup, err := s.store.MonitorRollup(r.Context(), id, since)
	if errors.Is(err, store.ErrNotConfigured) {
		writeStorageNotConfigured(w)
		return
	}
	if err != nil {
		s.logger.Error("monitor rollup failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal_error"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"monitorId": id,
		"window":    canonicalWindow,
		"since":     since,
		"until":     until,
		"rollup":    rollup,
	})
}

func parseRollupWindow(raw string) (time.Duration, string, error) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "", "24h":
		return 24 * time.Hour, "24h", nil
	case "1h":
		return time.Hour, "1h", nil
	case "6h":
		return 6 * time.Hour, "6h", nil
	case "7d":
		return 7 * 24 * time.Hour, "7d", nil
	case "30d":
		return 30 * 24 * time.Hour, "30d", nil
	case "90d":
		return 90 * 24 * time.Hour, "90d", nil
	default:
		return 0, "", errors.New("window must be one of 1h, 6h, 24h, 7d, 30d, or 90d")
	}
}

func (s *Server) handleListIncidents(w http.ResponseWriter, r *http.Request) {
	if s.store == nil {
		writeStorageNotConfigured(w)
		return
	}

	status := strings.TrimSpace(r.URL.Query().Get("status"))
	switch status {
	case "", "open", "monitoring", "resolved":
	default:
		writeJSON(w, http.StatusUnprocessableEntity, errorResponse{
			Error:  "validation_failed",
			Detail: "status must be open, monitoring, or resolved",
		})
		return
	}

	incidents, err := s.store.ListIncidents(r.Context(), status, queryLimit(r, 50, 200))
	if errors.Is(err, store.ErrNotConfigured) {
		writeStorageNotConfigured(w)
		return
	}
	if err != nil {
		s.logger.Error("list incidents failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal_error"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"incidents": incidents,
		"count":     len(incidents),
	})
}

func (s *Server) handleListAlerts(w http.ResponseWriter, r *http.Request) {
	if s.store == nil {
		writeStorageNotConfigured(w)
		return
	}

	deliveries, err := s.store.ListAlertDeliveries(r.Context(), queryLimit(r, 50, 200))
	if errors.Is(err, store.ErrNotConfigured) {
		writeStorageNotConfigured(w)
		return
	}
	if err != nil {
		s.logger.Error("list alert deliveries failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal_error"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"deliveries": deliveries,
		"count":      len(deliveries),
	})
}

func (s *Server) handleProbeSummary(w http.ResponseWriter, r *http.Request) {
	if s.store == nil {
		writeStorageNotConfigured(w)
		return
	}

	summary, err := s.store.ProbeSummary(r.Context())
	if errors.Is(err, store.ErrNotConfigured) {
		writeStorageNotConfigured(w)
		return
	}
	if err != nil {
		s.logger.Error("probe summary failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal_error"})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"scheduler": "vigil-worker",
		"summary":   summary,
	})
}

type createMonitorRequest struct {
	Name            string `json:"name"`
	URL             string `json:"url"`
	Method          string `json:"method"`
	ExpectedStatus  int    `json:"expectedStatus"`
	IntervalSeconds int    `json:"intervalSeconds"`
	TimeoutSeconds  int    `json:"timeoutSeconds"`
	Retries         int    `json:"retries"`
	Region          string `json:"region"`
	IsPublic        *bool  `json:"isPublic"`
}

func (s *Server) handleCreateMonitor(w http.ResponseWriter, r *http.Request) {
	if s.store == nil {
		writeStorageNotConfigured(w)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	var input createMonitorRequest
	if err := decoder.Decode(&input); err != nil {
		writeJSON(w, http.StatusBadRequest, errorResponse{
			Error:  "invalid_json",
			Detail: "Provide a JSON object with name and url.",
		})
		return
	}

	params, err := validateMonitor(input)
	if err != nil {
		writeJSON(w, http.StatusUnprocessableEntity, errorResponse{
			Error:  "validation_failed",
			Detail: err.Error(),
		})
		return
	}

	monitor, err := s.store.CreateMonitor(r.Context(), params)
	if errors.Is(err, store.ErrNotConfigured) {
		writeStorageNotConfigured(w)
		return
	}
	if err != nil {
		s.logger.Error("create monitor failed", "error", err)
		writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal_error"})
		return
	}

	w.Header().Set("Location", "/api/v1/monitors/"+monitor.ID)
	writeJSON(w, http.StatusCreated, map[string]any{"monitor": monitor})
}

func validateMonitor(input createMonitorRequest) (store.CreateMonitorParams, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return store.CreateMonitorParams{}, errors.New("name is required")
	}
	if len(name) > 120 {
		return store.CreateMonitorParams{}, errors.New("name must be 120 characters or fewer")
	}

	rawURL := strings.TrimSpace(input.URL)
	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return store.CreateMonitorParams{}, errors.New("url must be an absolute http or https URL")
	}

	method := strings.ToUpper(strings.TrimSpace(input.Method))
	if method == "" {
		method = http.MethodGet
	}
	switch method {
	case http.MethodGet, http.MethodHead, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
	default:
		return store.CreateMonitorParams{}, fmt.Errorf("unsupported method %q", method)
	}

	expectedStatus := input.ExpectedStatus
	if expectedStatus == 0 {
		expectedStatus = http.StatusOK
	}
	if expectedStatus < 100 || expectedStatus > 599 {
		return store.CreateMonitorParams{}, errors.New("expectedStatus must be between 100 and 599")
	}

	interval := input.IntervalSeconds
	if interval == 0 {
		interval = 30
	}
	if interval < 5 || interval > 3600 {
		return store.CreateMonitorParams{}, errors.New("intervalSeconds must be between 5 and 3600")
	}

	timeout := input.TimeoutSeconds
	if timeout == 0 {
		timeout = 10
	}
	if timeout < 1 || timeout > 120 {
		return store.CreateMonitorParams{}, errors.New("timeoutSeconds must be between 1 and 120")
	}
	if timeout > interval {
		return store.CreateMonitorParams{}, errors.New("timeoutSeconds cannot exceed intervalSeconds")
	}

	retries := input.Retries
	if retries < 0 || retries > 5 {
		return store.CreateMonitorParams{}, errors.New("retries must be between 0 and 5")
	}

	region := strings.TrimSpace(input.Region)
	if region == "" {
		region = "ap-south-1"
	}

	isPublic := true
	if input.IsPublic != nil {
		isPublic = *input.IsPublic
	}

	return store.CreateMonitorParams{
		Name:            name,
		URL:             rawURL,
		Method:          method,
		ExpectedStatus:  expectedStatus,
		IntervalSeconds: interval,
		TimeoutSeconds:  timeout,
		Retries:         retries,
		Region:          region,
		IsPublic:        isPublic,
	}, nil
}

func writeStorageNotConfigured(w http.ResponseWriter) {
	writeJSON(w, http.StatusNotImplemented, errorResponse{
		Error:  "storage_not_configured",
		Detail: "Set DATABASE_URL and run the migrations before using monitor storage.",
	})
}

func queryLimit(r *http.Request, fallback, max int) int {
	raw := strings.TrimSpace(r.URL.Query().Get("limit"))
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return fallback
	}
	if value > max {
		return max
	}
	return value
}

type errorResponse struct {
	Error  string `json:"error"`
	Detail string `json:"detail,omitempty"`
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		slog.Default().Error("write json response failed", "error", err)
	}
}

func (s *Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && s.originAllowed(origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			w.Header().Set("Access-Control-Expose-Headers", "X-Request-ID")
			w.Header().Set("Access-Control-Max-Age", "600")
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) originAllowed(origin string) bool {
	for _, allowed := range s.cfg.AllowedOrigins {
		if origin == allowed {
			return true
		}
	}
	return false
}

type responseRecorder struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (w *responseRecorder) WriteHeader(status int) {
	if w.status != 0 {
		return
	}
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}

func (w *responseRecorder) Write(data []byte) (int, error) {
	if w.status == 0 {
		w.status = http.StatusOK
	}
	written, err := w.ResponseWriter.Write(data)
	w.bytes += written
	return written, err
}

func (w *responseRecorder) Unwrap() http.ResponseWriter {
	return w.ResponseWriter
}

func newRequestID() string {
	var buf [8]byte
	if _, err := rand.Read(buf[:]); err == nil {
		return hex.EncodeToString(buf[:])
	}
	return strconv.FormatInt(time.Now().UnixNano(), 36)
}

func (s *Server) requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		requestID := strings.TrimSpace(r.Header.Get("X-Request-ID"))
		if requestID == "" {
			requestID = newRequestID()
		}
		if len(requestID) > 128 {
			requestID = requestID[:128]
		}
		w.Header().Set("X-Request-ID", requestID)

		recorder := &responseRecorder{ResponseWriter: w}
		next.ServeHTTP(recorder, r)

		status := recorder.status
		if status == 0 {
			status = http.StatusOK
		}
		attrs := []any{
			"request_id", requestID,
			"method", r.Method,
			"path", r.URL.Path,
			"status", status,
			"bytes", recorder.bytes,
			"duration_ms", float64(time.Since(start).Microseconds()) / 1000,
			"remote_addr", r.RemoteAddr,
			"user_agent", r.UserAgent(),
		}
		switch {
		case status >= http.StatusInternalServerError:
			s.logger.Error("http request", attrs...)
		case status >= http.StatusBadRequest:
			s.logger.Warn("http request", attrs...)
		case r.URL.Path == "/healthz" || r.URL.Path == "/readyz":
			s.logger.Debug("http request", attrs...)
		default:
			s.logger.Info("http request", attrs...)
		}
	})
}

func (s *Server) recoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				s.logger.Error("panic recovered",
					"request_id", w.Header().Get("X-Request-ID"),
					"panic", recovered,
					"method", r.Method,
					"path", r.URL.Path,
				)
				writeJSON(w, http.StatusInternalServerError, errorResponse{Error: "internal_error"})
			}
		}()
		next.ServeHTTP(w, r)
	})
}
