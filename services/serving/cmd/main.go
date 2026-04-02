package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"adgenius-ai/internal/shared/logging"
	"adgenius-ai/internal/shared/natsx"
	"adgenius-ai/internal/shared/redisx"
	serving "adgenius-ai/services/serving/internal"
	"adgenius-ai/services/serving/internal/handlers"
)

func main() {
	cfg, err := serving.LoadConfig()
	if err != nil {
		panic(err)
	}
	logger := logging.New(cfg.ServiceName, cfg.LogLevel)

	ctx := context.Background()
	rc, err := redisx.NewClient(ctx, cfg.RedisAddr, cfg.RedisPass, 0)
	if err != nil {
		logger.Error("redis unavailable", "error", err)
		rc = nil
	}

	nc, err := natsx.Connect(cfg.NATSURL)
	if err != nil {
		logger.Error("nats unavailable", "error", err)
		nc = nil
	}

	h := handlers.New(rc, nc)
	mux := http.NewServeMux()
	mux.HandleFunc("/health", h.Health)
	mux.HandleFunc("/api/v1/serve/ad", method(http.MethodGet, h.ServeAd))
	mux.HandleFunc("/api/v1/track/impression", method(http.MethodPost, h.TrackImpression))
	mux.HandleFunc("/api/v1/track/click/", method(http.MethodGet, h.TrackClick))

	addr := fmt.Sprintf(":%d", cfg.HTTPPort)
	srv := &http.Server{Addr: addr, Handler: mux, ReadTimeout: 10 * time.Second, WriteTimeout: 10 * time.Second}
	go func() { logger.Info("serving started", "addr", addr); _ = srv.ListenAndServe() }()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	shutdownCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(shutdownCtx)
}

func method(expected string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != expected {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		next(w, r)
	}
}
