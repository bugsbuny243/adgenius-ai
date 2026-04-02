# Local Development

## Requirements

- Docker + Docker Compose
- Go 1.23+
- Node.js 20+

## Run full stack

```bash
make up
```

Services:

- Web: `http://localhost:3000`
- API gateway: `http://localhost:8080`
- Serving service: `http://localhost:8081`
- AI service: `http://localhost:8090`
- NATS monitor: `http://localhost:8222`
- ClickHouse HTTP: `http://localhost:8123`

## Run Go services directly

```bash
go run ./services/api-gateway/cmd
go run ./services/serving/cmd
go run ./services/worker/cmd
go run ./services/ai/cmd
```

## Web app

```bash
cd apps/web
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL` to gateway URL (`http://localhost:8080` by default).
