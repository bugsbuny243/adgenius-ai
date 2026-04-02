package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"adgenius-ai/internal/shared/clickhousex"
	"adgenius-ai/internal/shared/logging"
	"adgenius-ai/internal/shared/natsx"
	"adgenius-ai/services/ai/pkg/ai"
	workerapp "adgenius-ai/services/worker/internal"
	"adgenius-ai/services/worker/internal/worker"
)

func main() {
	cfg := workerapp.LoadConfig()
	logger := logging.New(cfg.ServiceName, cfg.LogLevel)

	if err := clickhousex.ValidateDSN(cfg.ClickHouseDSN); err != nil {
		logger.Warn("clickhouse dsn invalid", "error", err)
	}
	natsClient, err := natsx.Connect(cfg.NATSURL)
	if err != nil {
		logger.Warn("nats unavailable", "error", err)
	}

	aiClient, err := ai.NewClient(ai.LoadConfig())
	if err != nil {
		logger.Warn("ai client unavailable", "error", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	consumers := &worker.Consumers{Logger: logger, AIClient: aiClient, NATS: natsClient}
	go consumers.Run(ctx)

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig
	cancel()
}
