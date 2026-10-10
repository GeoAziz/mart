# Reference Architecture Status

This repository is a local platform engineering reference environment built with Docker Compose. It is intended as a reusable sandbox for developers, SREs, and platform engineers who need a production-like simulation stack without relying on a real cloud account.

## Current state

The stack in this repo already covers the core building blocks for a local cloud-style environment:

- AWS emulation with LocalStack
- Data services with Redis
- Firebase emulation for Auth/Firestore
- Edge routing with Traefik (auth profile)
- Identity with Keycloak (auth profile)
- Secrets with Vault (security profile)
- Security baseline with Wazuh
- Observability baseline with the OpenTelemetry collector and Grafana

## Status by layer

| Layer | Status | Notes |
|---|---|---|
| Developer Portal | Planned | No portal or docs hub is wired in yet |
| CI/CD | Planned | No pipeline or deployment workflow is defined yet |
| Ingress | Planned | Traefik is present in auth profile |
| Identity | Planned | Keycloak is present in auth profile |
| Secrets | Planned | Vault is present in security profile |
| AWS Emulation | Implemented | LocalStack is present |
| Applications | Implemented | Next.js app, WebSocket server, and worker are defined |
| Data | Implemented | Redis and Firebase emulators are present; Postgres is available in full profile |
| Observability | Partial | OTel collector, Prometheus, Loki, Tempo, and Grafana are present in monitoring profile |
| Security | Partial | Wazuh is present; OPA is present in security profile |
| Chaos / Resilience | Planned | No fault-injection tooling is currently configured |

## Recommended target architecture

### Core platform
- LocalStack for AWS-like services
- Redis for caching and session state
- Firebase Emulators for Auth and Firestore
- Traefik for ingress and routing
- Keycloak for identity and SSO simulation
- Vault for secrets management

### Observability
- OpenTelemetry Collector for telemetry ingestion
- Prometheus for metrics storage and alerting
- Loki for log aggregation
- Tempo for distributed tracing
- Grafana for dashboards and visibility

### Security
- Wazuh for host and security monitoring
- OPA for policy-as-code

### Resilience and operations
- Optional Kafka for event streaming
- Optional MinIO for S3-compatible object storage

## Recommended rollout plan

### Phase 1 - Stabilize the foundation
Focus on making the current environment predictable and reusable for developers.

- Add environment defaults and examples
- Improve health checks and startup ordering
- Document service URLs and credentials
- Standardize volumes and bootstrap scripts

### Phase 2 - Strengthen observability
Add the missing telemetry layers so the platform behaves more like production.

- Prometheus
- Loki
- Tempo
- Basic dashboards and alert rules

### Phase 3 - Add security automation
Make the environment more realistic for platform and security engineering work.

- OPA policies
- Vault-backed secret injection patterns

### Phase 4 - Add resilience testing
Introduce failure injection and resilience patterns.

- Kafka for event streaming
- Clear simulation playbooks for developers

### Phase 5 - Add developer experience tooling
Improve this as a reference environment for teams.

- A simple developer portal or docs hub
- CI/CD examples and deployment scenarios
- Terraform or infrastructure-as-code examples
- Sample microservices that exercise the full stack

## Suggested next repo actions

1. Add a documented service map with URLs and access points.
2. Add a sample environment file such as .env.example.
3. Add a CI workflow example for linting, compose validation, or image builds.
4. Add demo microservices that use LocalStack, Redis, and Vault.

## Bottom line

This repo is already a strong local cloud lab and an excellent starting point for a production-like engineering reference environment. The next value will come from adding deeper observability, automated security checks, and resilience tooling.
