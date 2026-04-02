package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"adgenius-ai/internal/shared/httpx"
	"adgenius-ai/internal/shared/natsx"
	"adgenius-ai/internal/shared/types"
)

type Handler struct{ natsClient *natsx.Client }

func New(natsClient *natsx.Client) *Handler { return &Handler{natsClient: natsClient} }

func (h *Handler) Health(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]any{"status": "ok", "service": "api-gateway"})
}
func (h *Handler) V1Health(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]any{"status": "ok", "version": "v1"})
}
func (h *Handler) ListCampaigns(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusOK, []types.Campaign{{ID: "cmp_demo", Name: "Starter Campaign", Status: "draft"}})
}
func (h *Handler) CreateCampaign(w http.ResponseWriter, r *http.Request) {
	var payload struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || payload.Name == "" {
		httpx.Error(w, http.StatusBadRequest, "name is required")
		return
	}
	httpx.JSON(w, http.StatusCreated, types.Campaign{ID: "cmp_" + time.Now().Format("20060102150405"), Name: payload.Name, Status: "draft"})
}
func (h *Handler) GetPublisherMe(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]any{"publisher_id": "pub_demo", "status": "active"})
}
func (h *Handler) CreatePublisherSite(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusCreated, map[string]string{"status": "accepted"})
}
func (h *Handler) CreatePlacement(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusCreated, map[string]string{"status": "accepted"})
}
func (h *Handler) CreateSlot(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusCreated, map[string]string{"status": "accepted"})
}
func (h *Handler) GetWallet(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusOK, map[string]any{"currency": "USD", "balance": 0})
}
func (h *Handler) DepositWallet(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusAccepted, map[string]string{"status": "queued"})
}
func (h *Handler) ListLiveCampaigns(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusOK, []map[string]any{{"id": "live_1", "status": "active"}})
}
func (h *Handler) CreateGenerationJob(w http.ResponseWriter, r *http.Request) {
	var req types.GenerationJob
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Brief == "" {
		httpx.Error(w, http.StatusBadRequest, "brief is required")
		return
	}
	job := types.GenerationJob{ID: "gen_" + time.Now().Format("20060102150405"), Brief: req.Brief, Status: "queued", CampaignID: req.CampaignID}
	if h.natsClient != nil {
		_ = h.natsClient.Publish("generation.job.created", job)
	}
	httpx.JSON(w, http.StatusAccepted, job)
}
