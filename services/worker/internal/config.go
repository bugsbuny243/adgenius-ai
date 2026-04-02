package internal

import "adgenius-ai/internal/shared/config"

type Config struct {
	ServiceName   string
	LogLevel      string
	NATSURL       string
	ClickHouseDSN string
	PostgresDSN   string
	GeminiAPIKey  string
}

func LoadConfig() Config {
	return Config{
		ServiceName:   "worker",
		LogLevel:      config.String("LOG_LEVEL", "info"),
		NATSURL:       config.String("NATS_URL", "nats://localhost:4222"),
		ClickHouseDSN: config.String("CLICKHOUSE_DSN", "clickhouse://default:@localhost:9000/default"),
		PostgresDSN:   config.String("POSTGRES_DSN", "postgres://postgres:postgres@localhost:5432/adgenius?sslmode=disable"),
		GeminiAPIKey:  config.String("GEMINI_API_KEY", ""),
	}
}
