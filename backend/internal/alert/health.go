package alert

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"time"
)

// HealthHandler serves liveness and readiness for the notifier process.
type HealthHandler struct {
	EmailEnabled bool
	Check        func(context.Context) error
}

// Handler returns the notifier's HTTP health mux.
func (h HealthHandler) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		state := "disabled"
		if h.EmailEnabled {
			state = "enabled"
		}
		writeHealthJSON(w, http.StatusOK, map[string]any{
			"status":  "ok",
			"service": "vigil-notifier",
			"email":   state,
			"time":    time.Now().UTC(),
		})
	})
	mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, r *http.Request) {
		if !h.EmailEnabled {
			writeHealthJSON(w, http.StatusOK, map[string]any{
				"status":  "disabled",
				"service": "vigil-notifier",
				"email":   "disabled",
			})
			return
		}
		if h.Check != nil {
			if err := h.Check(r.Context()); err != nil {
				slog.Default().Warn("notifier readiness failed", "error", err)
				writeHealthJSON(w, http.StatusServiceUnavailable, map[string]any{
					"status":  "degraded",
					"service": "vigil-notifier",
					"email":   "enabled",
					"error":   err.Error(),
				})
				return
			}
		}
		writeHealthJSON(w, http.StatusOK, map[string]any{
			"status":  "ready",
			"service": "vigil-notifier",
			"email":   "enabled",
		})
	})
	return mux
}

func writeHealthJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		slog.Default().Error("write notifier health response failed", "error", err)
	}
}
