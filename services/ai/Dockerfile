FROM golang:1.23-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/ai ./services/ai/cmd

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /out/ai /app/ai
EXPOSE 8090
CMD ["/app/ai"]
