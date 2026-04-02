package internal

import (
	"fmt"

	"adgenius-ai/internal/shared/config"
)

type Config struct {
	ServiceName  string
	HTTPPort     int
	LogLevel     string
	PostgresDSN  string
	NATSURL      string
	RedisAddr    string
	RedisPass    string
	GeminiAPIKey string
	AIServiceURL string
}

func LoadConfig() (Config, error) {
	port, err := config.Int("API_GATEWAY_PORT", 8080)
	if err != nil {
		return Config{}, err
	}
	cfg := Config{
		ServiceName:  "api-gateway",
		HTTPPort:     port,
		LogLevel:     config.String("LOG_LEVEL", "info"),
		PostgresDSN:  config.String("POSTGRES_DSN", "postgres://postgres:postgres@localhost:5432/adgenius?sslmode=disable"),
		NATSURL:      config.String("NATS_URL", "nats://localhost:4222"),
		RedisAddr:    config.String("REDIS_ADDR", "localhost:6379"),
		RedisPass:    config.String("REDIS_PASSWORD", ""),
		GeminiAPIKey: config.String("GEMINI_API_KEY", ""),
		AIServiceURL: config.String("AI_SERVICE_URL", "http://localhost:8090"),
	}
	if cfg.GeminiAPIKey == "" {
		return Config{}, fmt.Errorf("GEMINI_API_KEY must be set")
	}
	return cfg, nil
}
