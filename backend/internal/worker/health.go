package worker

import (
	"encoding/json"
	"net/http"
	"time"
)

// NewHealthHandler returns liveness and readiness handlers for the standalone
// worker. Liveness only proves the process is serving; readiness additionally
// requires the scheduler loop to be running and the last pass to be clean.
func NewHealthHandler(runner *Worker) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeHealthJSON(w, http.StatusOK, map[string]any{
			"status":  "ok",
			"service": "vigil-worker",
			"time":    time.Now().UTC(),
		})
	})
	mux.HandleFunc("GET /readyz", func(w http.ResponseWriter, _ *http.Request) {
		if runner == nil {
			writeHealthJSON(w, http.StatusServiceUnavailable, map[string]any{
				"status":  "not_configured",
				"service": "vigil-worker",
			})
			return
		}

		snapshot := runner.Snapshot()
		status := "ready"
		code := http.StatusOK
		if !snapshot.Running {
			status = "starting"
			code = http.StatusServiceUnavailable
		} else if snapshot.LastError != "" {
			status = "degraded"
			code = http.StatusServiceUnavailable
		}

		writeHealthJSON(w, code, map[string]any{
			"status":  status,
			"service": "vigil-worker",
			"time":    time.Now().UTC(),
			"worker":  snapshot,
		})
	})
	return mux
}

func writeHealthJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
