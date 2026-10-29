package config

import (
	"log/slog"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config is the runtime configuration for the Vigil API scaffold.
type Config struct {
	Addr            string
	DatabaseURL     string
	RedisURL        string
	AllowedOrigins  []string
	Version         string
	ShutdownTimeout time.Duration
	LogLevel        slog.Level
}

// WorkerConfig is the runtime configuration for the standalone probe worker.
type WorkerConfig struct {
	DatabaseURL       string
	RedisURL          string
	HealthAddr        string
	Concurrency       int
	Tick              time.Duration
	UserAgent         string
	AlertEmailEnabled bool
	LogLevel          slog.Level
}

// NotifierConfig is the runtime configuration for the alert delivery worker.
type NotifierConfig struct {
	DatabaseURL string
	RedisURL    string
	HealthAddr  string
	Concurrency int

	EmailEnabled bool
	BrevoAPIKey  string
	BrevoAPIURL  string
	FromEmail    string
	FromName     string
	ReplyTo      string
	ToEmails     []string
	AppURL       string

	LogLevel slog.Level
}

// Load reads configuration from the environment. Database and Redis URLs are
// optional: without them the API runs in an honest "scaffold" mode so the
// health endpoints can still be exercised locally.
func Load() Config {
	return Config{
		Addr:            envOr("VIGIL_ADDR", ":8080"),
		DatabaseURL:     os.Getenv("DATABASE_URL"),
		RedisURL:        os.Getenv("REDIS_URL"),
		AllowedOrigins:  splitList(envOr("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001")),
		Version:         envOr("VIGIL_VERSION", "0.1.0"),
		ShutdownTimeout: 10 * time.Second,
		LogLevel:        parseLogLevel(envOr("VIGIL_LOG_LEVEL", "info")),
	}
}

// LoadWorker reads the standalone worker configuration. The worker requires a
// database URL; Redis is required when email alerting is enabled.
func LoadWorker() WorkerConfig {
	return WorkerConfig{
		DatabaseURL:       os.Getenv("DATABASE_URL"),
		RedisURL:          os.Getenv("REDIS_URL"),
		HealthAddr:        envOr("VIGIL_WORKER_HEALTH_ADDR", ":8081"),
		Concurrency:       envInt("VIGIL_WORKER_CONCURRENCY", 4),
		Tick:              envDuration("VIGIL_WORKER_TICK", 2*time.Second),
		UserAgent:         envOr("VIGIL_WORKER_USER_AGENT", "VigilProbe/0.1 (+self-hosted)"),
		AlertEmailEnabled: envBool("ALERT_EMAIL_ENABLED", false),
		LogLevel:          parseLogLevel(envOr("VIGIL_LOG_LEVEL", "info")),
	}
}

// LoadNotifier reads the standalone alert delivery worker configuration.
func LoadNotifier() NotifierConfig {
	return NotifierConfig{
		DatabaseURL: os.Getenv("DATABASE_URL"),
		RedisURL:    os.Getenv("REDIS_URL"),
		HealthAddr:  envOr("VIGIL_NOTIFIER_HEALTH_ADDR", ":8082"),
		Concurrency: envInt("VIGIL_NOTIFIER_CONCURRENCY", 4),

		EmailEnabled: envBool("ALERT_EMAIL_ENABLED", false),
		BrevoAPIKey:  os.Getenv("BREVO_API_KEY"),
		BrevoAPIURL:  envOr("BREVO_API_URL", "https://api.brevo.com/v3/smtp/email"),
		FromEmail:    os.Getenv("ALERT_FROM_EMAIL"),
		FromName:     envOr("ALERT_FROM_NAME", "Vigil"),
		ReplyTo:      os.Getenv("ALERT_REPLY_TO"),
		ToEmails:     splitList(os.Getenv("ALERT_TO_EMAIL")),
		AppURL:       envOr("VIGIL_APP_URL", "http://localhost:3000"),

		LogLevel: parseLogLevel(envOr("VIGIL_LOG_LEVEL", "info")),
	}
}

func parseLogLevel(value string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

func envOr(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func envInt(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func envBool(key string, fallback bool) bool {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func envDuration(key string, fallback time.Duration) time.Duration {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func splitList(value string) []string {
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}
