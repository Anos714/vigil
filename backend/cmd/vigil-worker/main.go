package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/vigil-monitor/vigil/backend/internal/alert"
	"github.com/vigil-monitor/vigil/backend/internal/config"
	"github.com/vigil-monitor/vigil/backend/internal/probe"
	"github.com/vigil-monitor/vigil/backend/internal/store"
	"github.com/vigil-monitor/vigil/backend/internal/worker"
)

func main() {
	cfg := config.LoadWorker()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: cfg.LogLevel,
	}))
	slog.SetDefault(logger)

	if err := run(logger, cfg); err != nil {
		logger.Error("vigil worker exited", "error", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger, cfg config.WorkerConfig) error {
	if cfg.DatabaseURL == "" {
		return errors.New("DATABASE_URL is required for the probe worker")
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	st, err := store.Open(ctx, cfg.DatabaseURL, cfg.RedisURL)
	if err != nil {
		return err
	}
	defer st.Close()

	var dispatcher *alert.Dispatcher
	if cfg.AlertEmailEnabled {
		dispatcher, err = alert.NewAsynqDispatcher(st, cfg.RedisURL, logger)
		if err != nil {
			return fmt.Errorf("configure alert dispatcher: %w", err)
		}
		defer func() {
			if err := dispatcher.Close(); err != nil {
				logger.Warn("close alert dispatcher failed", "error", err)
			}
		}()
	}

	prober := probe.New(cfg.UserAgent)
	options := make([]worker.Option, 0, 1)
	if dispatcher != nil {
		options = append(options, worker.WithAlertDispatcher(dispatcher))
	}
	runner := worker.New(st, prober, logger, cfg.Concurrency, cfg.Tick, options...)

	healthServer := &http.Server{
		Addr:              cfg.HealthAddr,
		Handler:           worker.NewHealthHandler(runner),
		ReadHeaderTimeout: 5 * time.Second,
	}
	healthErr := make(chan error, 1)
	go func() {
		logger.Info("worker health server listening", "addr", cfg.HealthAddr)
		if err := healthServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			healthErr <- err
		}
	}()

	runErrCh := make(chan error, 1)
	go func() {
		runErrCh <- runner.Run(ctx)
	}()

	logger.Info("vigil worker configured",
		"concurrency", cfg.Concurrency,
		"tick", cfg.Tick.String(),
		"user_agent", cfg.UserAgent,
		"health_addr", cfg.HealthAddr,
		"alerts_email", cfg.AlertEmailEnabled,
	)

	var runErr error
	select {
	case runErr = <-runErrCh:
	case err := <-healthErr:
		stop()
		runErr = <-runErrCh
		if runErr == nil {
			runErr = fmt.Errorf("worker health server: %w", err)
		} else {
			runErr = errors.Join(runErr, fmt.Errorf("worker health server: %w", err))
		}
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := healthServer.Shutdown(shutdownCtx); err != nil && !errors.Is(err, context.Canceled) {
		logger.Error("worker health server shutdown failed", "error", err)
	}

	return runErr
}
