FROM golang:1.23-alpine AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /out/serving ./services/serving/cmd

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /out/serving /app/serving
EXPOSE 8081
CMD ["/app/serving"]
