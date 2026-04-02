package natsx

import (
	"encoding/json"
	"fmt"
	"net"
	"time"
)

type Client struct {
	url string
}

func Connect(url string) (*Client, error) {
	conn, err := net.DialTimeout("tcp", trimScheme(url, "nats://"), 2*time.Second)
	if err != nil {
		return nil, fmt.Errorf("connect nats: %w", err)
	}
	_ = conn.Close()
	return &Client{url: url}, nil
}

func (c *Client) Publish(subject string, payload any) error {
	_, err := json.Marshal(map[string]any{"subject": subject, "payload": payload, "broker": c.url})
	return err
}

func (c *Client) Close() {}

func trimScheme(value, scheme string) string {
	if len(value) >= len(scheme) && value[:len(scheme)] == scheme {
		return value[len(scheme):]
	}
	return value
}
