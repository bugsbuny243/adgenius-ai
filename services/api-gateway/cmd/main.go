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
	gateway "adgenius-ai/services/api-gateway/internal"
	"adgenius-ai/services/api-gateway/internal/handlers"
)

func main() {
	cfg, err := gateway.LoadConfig()
	if err != nil {
		panic(err)
	}
	logger := logging.New(cfg.ServiceName, cfg.LogLevel)

	var nc *natsx.Client
	nc, err = natsx.Connect(cfg.NATSURL)
	if err != nil {
		logger.Error("nats unavailable, continuing", "error", err)
	}

	h := handlers.New(nc)
	mux := http.NewServeMux()
	mux.HandleFunc("/health", h.Health)
	mux.HandleFunc("/api/v1/health", h.V1Health)
	mux.HandleFunc("/api/v1/campaigns", method(h.ListCampaigns, h.CreateCampaign))
	mux.HandleFunc("/api/v1/publishers/me", h.GetPublisherMe)
	mux.HandleFunc("/api/v1/publishers/sites", method(nil, h.CreatePublisherSite))
	mux.HandleFunc("/api/v1/publishers/placements", method(nil, h.CreatePlacement))
	mux.HandleFunc("/api/v1/publishers/slots", method(nil, h.CreateSlot))
	mux.HandleFunc("/api/v1/wallet", method(h.GetWallet, nil))
	mux.HandleFunc("/api/v1/wallet/deposit", method(nil, h.DepositWallet))
	mux.HandleFunc("/api/v1/live-campaigns", method(h.ListLiveCampaigns, nil))
	mux.HandleFunc("/api/v1/generation-jobs", method(nil, h.CreateGenerationJob))

	addr := fmt.Sprintf(":%d", cfg.HTTPPort)
	srv := &http.Server{Addr: addr, Handler: mux, ReadTimeout: 10 * time.Second, WriteTimeout: 15 * time.Second}
	go func() { logger.Info("api-gateway started", "addr", addr); _ = srv.ListenAndServe() }()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = srv.Shutdown(ctx)
}

func method(get, post http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			if get != nil {
				get(w, r)
				return
			}
		case http.MethodPost:
			if post != nil {
				post(w, r)
				return
			}
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}
