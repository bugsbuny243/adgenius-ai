package worker

import (
	"context"
	"log/slog"
	"time"

	"adgenius-ai/internal/shared/natsx"
	"adgenius-ai/services/ai/pkg/ai"
)

type Consumers struct {
	Logger   *slog.Logger
	AIClient *ai.Client
	NATS     *natsx.Client
}

func (c *Consumers) Run(ctx context.Context) {
	ticker := time.NewTicker(15 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			c.consumeTracking()
			c.consumeGeneration(ctx)
			c.consumePayout()
			c.consumeAnalyticsSink()
		}
	}
}

func (c *Consumers) consumeTracking()      { c.Logger.Info("tracking consumer heartbeat") }
func (c *Consumers) consumePayout()        { c.Logger.Info("payout settlement consumer heartbeat") }
func (c *Consumers) consumeAnalyticsSink() { c.Logger.Info("analytics sink consumer heartbeat") }

func (c *Consumers) consumeGeneration(ctx context.Context) {
	if c.AIClient == nil {
		c.Logger.Info("generation consumer heartbeat (ai unavailable)")
		return
	}
	_, _ = c.AIClient.OrchestrateGeneration(ctx, "sample brief from queue")
	c.Logger.Info("generation job consumer heartbeat")
}
