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

	"github.com/hibiken/asynq"
	"github.com/vigil-monitor/vigil/backend/internal/alert"
	"github.com/vigil-monitor/vigil/backend/internal/config"
	"github.com/vigil-monitor/vigil/backend/internal/store"
)

func main() {
	cfg := config.LoadNotifier()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: cfg.LogLevel,
	}))
	slog.SetDefault(logger)

	if err := run(logger, cfg); err != nil {
		logger.Error("vigil notifier exited", "error", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger, cfg config.NotifierConfig) error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if !cfg.EmailEnabled {
		logger.Info("alert email delivery disabled",
			"hint", "set ALERT_EMAIL_ENABLED=true and configure Brevo to enable it",
			"health_addr", cfg.HealthAddr,
		)
		return runHealthOnly(ctx, logger, cfg.HealthAddr, alert.HealthHandler{})
	}

	if cfg.DatabaseURL == "" {
		return errors.New("DATABASE_URL is required when ALERT_EMAIL_ENABLED=true")
	}
	if cfg.RedisURL == "" {
		return errors.New("REDIS_URL is required when ALERT_EMAIL_ENABLED=true")
	}
	if len(cfg.ToEmails) == 0 {
		return errors.New("ALERT_TO_EMAIL is required when ALERT_EMAIL_ENABLED=true")
	}

	st, err := store.Open(ctx, cfg.DatabaseURL, cfg.RedisURL)
	if err != nil {
		return err
	}
	defer st.Close()

	sender, err := alert.NewBrevoSender(
		cfg.BrevoAPIKey,
		cfg.FromEmail,
		cfg.FromName,
		cfg.ReplyTo,
		cfg.BrevoAPIURL,
		nil,
	)
	if err != nil {
		return err
	}
	notifier, err := alert.NewNotifier(st, sender, cfg.ToEmails, cfg.AppURL, logger)
	if err != nil {
		return err
	}

	redisOpt, err := asynq.ParseRedisURI(cfg.RedisURL)
	if err != nil {
		return fmt.Errorf("parse REDIS_URL for notifier: %w", err)
	}
	queueServer := asynq.NewServer(redisOpt, asynq.Config{
		Concurrency:     cfg.Concurrency,
		Queues:          map[string]int{alert.QueueName: 1},
		Logger:          alert.NewAsynqLogger(logger),
		LogLevel:        asynq.InfoLevel,
		ShutdownTimeout: 20 * time.Second,
		HealthCheckFunc: func(err error) {
			if err != nil {
				logger.Warn("notifier redis health check failed", "error", err)
			}
		},
	})

	mux := asynq.NewServeMux()
	mux.HandleFunc(alert.TaskEmail, notifier.HandleEmail)

	healthHandler := alert.HealthHandler{
		EmailEnabled: true,
		Check: func(checkCtx context.Context) error {
			if err := queueServer.Ping(); err != nil {
				return fmt.Errorf("alert queue: %w", err)
			}
			readiness, err := st.Ready(checkCtx)
			if err != nil {
				return err
			}
			if readiness.Postgres != "ok" || readiness.Redis != "ok" {
				return fmt.Errorf("dependencies: postgres=%s redis=%s", readiness.Postgres, readiness.Redis)
			}
			return nil
		},
	}
	healthServer, healthErr := startHealthServer(logger, cfg.HealthAddr, healthHandler.Handler())
	defer shutdownHealthServer(logger, healthServer)

	if err := queueServer.Start(mux); err != nil {
		return fmt.Errorf("start notifier queue: %w", err)
	}
	logger.Info("vigil notifier started",
		"concurrency", cfg.Concurrency,
		"queue", alert.QueueName,
		"recipients", len(cfg.ToEmails),
		"from", cfg.FromEmail,
		"health_addr", cfg.HealthAddr,
	)

	var runErr error
	select {
	case <-ctx.Done():
		logger.Info("shutdown signal received")
	case err := <-healthErr:
		stop()
		runErr = fmt.Errorf("notifier health server: %w", err)
	}

	queueServer.Shutdown()
	logger.Info("vigil notifier stopped")
	return runErr
}

func runHealthOnly(ctx context.Context, logger *slog.Logger, addr string, handler alert.HealthHandler) error {
	server, errCh := startHealthServer(logger, addr, handler.Handler())
	defer shutdownHealthServer(logger, server)

	select {
	case <-ctx.Done():
		logger.Info("shutdown signal received")
		return nil
	case err := <-errCh:
		return fmt.Errorf("notifier health server: %w", err)
	}
}

func startHealthServer(logger *slog.Logger, addr string, handler http.Handler) (*http.Server, <-chan error) {
	server := &http.Server{
		Addr:              addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}
	errCh := make(chan error, 1)
	go func() {
		logger.Info("notifier health server listening", "addr", addr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()
	return server, errCh
}

func shutdownHealthServer(logger *slog.Logger, server *http.Server) {
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil && !errors.Is(err, context.Canceled) {
		logger.Error("notifier health server shutdown failed", "error", err)
	}
}
