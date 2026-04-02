package internal

import "adgenius-ai/internal/shared/config"

type Config struct {
	ServiceName string
	HTTPPort    int
	LogLevel    string
	NATSURL     string
	RedisAddr   string
	RedisPass   string
}

func LoadConfig() (Config, error) {
	port, err := config.Int("SERVING_PORT", 8081)
	if err != nil {
		return Config{}, err
	}
	return Config{
		ServiceName: "serving",
		HTTPPort:    port,
		LogLevel:    config.String("LOG_LEVEL", "info"),
		NATSURL:     config.String("NATS_URL", "nats://localhost:4222"),
		RedisAddr:   config.String("REDIS_ADDR", "localhost:6379"),
		RedisPass:   config.String("REDIS_PASSWORD", ""),
	}, nil
}
