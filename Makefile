.PHONY: up down build-go build-web

up:
	docker compose -f infra/docker-compose.yml up --build

down:
	docker compose -f infra/docker-compose.yml down -v

build-go:
	go build ./services/api-gateway/cmd
	go build ./services/serving/cmd
	go build ./services/worker/cmd
	go build ./services/ai/cmd

build-web:
	cd apps/web && npm run build
