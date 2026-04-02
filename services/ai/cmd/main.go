package main

import (
	"fmt"
	"log"
	"net/http"

	"adgenius-ai/internal/shared/config"
	"adgenius-ai/services/ai/pkg/ai"
)

func main() {
	_, err := ai.NewClient(ai.LoadConfig())
	if err != nil {
		log.Fatal(err)
	}
	port, err := config.Int("AI_SERVICE_PORT", 8090)
	if err != nil {
		log.Fatal(err)
	}
	http.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) { _, _ = w.Write([]byte("ok")) })
	log.Printf("ai service listening on :%d", port)
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", port), nil))
}
