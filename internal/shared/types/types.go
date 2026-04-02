package types

type Campaign struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Status string `json:"status"`
}

type GenerationJob struct {
	ID         string `json:"id"`
	Brief      string `json:"brief"`
	Status     string `json:"status"`
	CampaignID string `json:"campaign_id,omitempty"`
}
