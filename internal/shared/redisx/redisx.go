package redisx

import (
	"context"
	"fmt"
	"net"
	"time"
)

type Client struct {
	Addr string
}

func NewClient(_ context.Context, addr, _ string, _ int) (*Client, error) {
	conn, err := net.DialTimeout("tcp", addr, 2*time.Second)
	if err != nil {
		return nil, fmt.Errorf("redis dial failed: %w", err)
	}
	_ = conn.Close()
	return &Client{Addr: addr}, nil
}

func (c *Client) Incr(_ context.Context, _ string) error                    { return nil }
func (c *Client) Expire(_ context.Context, _ string, _ time.Duration) error { return nil }
