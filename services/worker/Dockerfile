FROM golang:1.23-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/worker ./services/worker/cmd

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /out/worker /app/worker
CMD ["/app/worker"]
