package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"adgenius-ai/internal/shared/httpx"
	"adgenius-ai/internal/shared/natsx"
	"adgenius-ai/internal/shared/redisx"
)

type Handler struct {
	redis *redisx.Client
	nats  *natsx.Client
}

func New(redis *redisx.Client, nats *natsx.Client) *Handler {
	return &Handler{redis: redis, nats: nats}
}
func (h *Handler) Health(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "serving"})
}

func (h *Handler) ServeAd(w http.ResponseWriter, r *http.Request) {
	slotKey := r.URL.Query().Get("slot_key")
	if slotKey == "" {
		httpx.Error(w, http.StatusBadRequest, "slot_key is required")
		return
	}
	if h.redis != nil {
		ctx := context.Background()
		_ = h.redis.Incr(ctx, "slot:req:"+slotKey)
		_ = h.redis.Expire(ctx, "slot:req:"+slotKey, 5*time.Minute)
	}
	payload := map[string]any{"slot_key": slotKey, "creative_html": "<div>AdGenius ad placeholder</div>", "click_token": "clk_demo_token"}
	if h.nats != nil {
		_ = h.nats.Publish("tracking.ad_request.created", payload)
	}
	httpx.JSON(w, http.StatusOK, payload)
}

func (h *Handler) TrackImpression(w http.ResponseWriter, r *http.Request) {
	var body map[string]any
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "invalid payload")
		return
	}
	if h.nats != nil {
		_ = h.nats.Publish("tracking.impression.recorded", body)
	}
	httpx.JSON(w, http.StatusAccepted, map[string]string{"status": "recorded"})
}

func (h *Handler) TrackClick(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimPrefix(r.URL.Path, "/api/v1/track/click/")
	if token == "" || token == r.URL.Path {
		httpx.Error(w, http.StatusBadRequest, "token is required")
		return
	}
	if h.nats != nil {
		_ = h.nats.Publish("tracking.click.recorded", map[string]string{"token": token})
	}
	http.Redirect(w, r, "https://adgenius.local/click-landed", http.StatusFound)
}
