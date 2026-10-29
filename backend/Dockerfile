FROM golang:1.27-alpine AS build

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/vigil ./cmd/vigil \
    && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/vigil-worker ./cmd/vigil-worker \
    && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/vigil-notifier ./cmd/vigil-notifier

FROM alpine:latest

RUN apk add --no-cache ca-certificates tzdata

COPY --from=build /out/vigil /usr/local/bin/vigil
COPY --from=build /out/vigil-worker /usr/local/bin/vigil-worker
COPY --from=build /out/vigil-notifier /usr/local/bin/vigil-notifier

USER 65532:65532
EXPOSE 8080 8081 8082

CMD ["/usr/local/bin/vigil"]
