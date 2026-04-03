# ADR-0001: Runtime – Azure Container Apps

## Status

Accepted

## Context

We need a runtime environment for stateless HTTP API and worker services that:
- Scales to zero when idle (cost efficiency for a game backend)
- Supports Docker-based deployment
- Integrates with Azure-native services (Service Bus, PostgreSQL, Key Vault)
- Supports managed identity out of the box

Options considered: Azure Functions (consumption), Azure Kubernetes Service, Azure Container Apps.

## Decision

Use **Azure Container Apps** for the API and worker services.

## Consequences

**Positive:**
- Scale-to-zero reduces costs during off-peak hours.
- Built-in HTTPS ingress, auto-scaling, and revision management.
- Managed identity support via user-assigned identities.
- Simpler than AKS for this workload size.
- Docker-compatible – local dev matches production.

**Negative:**
- Less control over networking than AKS.
- Cold start latency on scale-to-zero (mitigated with `minReplicas: 1` in production).
- Limited to HTTP/gRPC ingress patterns (no raw TCP).

## Notes

Durable Functions (for orchestrations) deploy separately as Azure Functions because they require the Durable Functions extension, which has specific hosting requirements.
