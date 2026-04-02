package ai

import (
	"context"
	"fmt"

	"adgenius-ai/internal/shared/config"
)

type Config struct {
	APIKey  string
	Model   string
	BaseURL string
}

type Client struct {
	cfg Config
}

func LoadConfig() Config {
	return Config{
		APIKey:  config.String("GEMINI_API_KEY", ""),
		Model:   config.String("GEMINI_MODEL", "gemini-2.5-flash"),
		BaseURL: config.String("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com"),
	}
}

func NewClient(cfg Config) (*Client, error) {
	if cfg.APIKey == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY is required")
	}
	return &Client{cfg: cfg}, nil
}

func (c *Client) ProcessBrief(_ context.Context, brief string) (string, error) {
	if brief == "" {
		return "", fmt.Errorf("brief is empty")
	}
	return "normalized brief: " + brief, nil
}

func (c *Client) BuildPrompt(normalized string) string {
	return "Generate ad variants with clear CTA from: " + normalized
}

func (c *Client) OrchestrateGeneration(ctx context.Context, brief string) (map[string]string, error) {
	normalized, err := c.ProcessBrief(ctx, brief)
	if err != nil {
		return nil, err
	}
	prompt := c.BuildPrompt(normalized)
	return map[string]string{"prompt": prompt, "status": "queued_for_gemini"}, nil
}
