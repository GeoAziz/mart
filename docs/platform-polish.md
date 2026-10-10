# Platform Polish Summary

This repository now includes a more complete enterprise-platform-style reference environment.

## Added capabilities

- Policy-as-code with OPA
- Event streaming with Kafka
- Expanded observability with Prometheus, Loki, Tempo, and Grafana
- A startup path for a fuller internal platform experience

## How to use it

```bash
# Core stack
docker compose up -d

# Auth tier
docker compose --profile auth up -d

# Security tier
docker compose --profile security up -d

# Observability tier
docker compose --profile monitoring up -d

# Full stack
docker compose --profile full up -d
```

## Key entry points

- App: http://localhost:3000
- Firebase Emulator: http://localhost:4000
- Grafana: http://localhost:3001
- Prometheus: http://localhost:9090
- Loki: http://localhost:3100
- Tempo: http://localhost:3200
- OPA: http://localhost:8181
- Kafka: localhost:9092
- Keycloak: http://localhost:8082
- Vault: http://localhost:8200
- Traefik dashboard: http://localhost:8081
- Mailpit UI: http://localhost:8025
- Adminer: http://localhost:8080
