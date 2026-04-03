---
applyTo: "infra/**"
---

# Infrastructure instructions

## Bicep conventions

- All modules take `prefix`, `location`, and `tags` as standard parameters.
- `prefix` is `ngu-${environmentName}`.
- Use `targetScope = 'resourceGroup'` for all modules.
- Use `@secure()` for passwords and connection strings.
- Output the resource ID and any connection strings/URIs needed by other modules.

## Security

- Always enable RBAC (`enableRbacAuthorization: true`) on Key Vault.
- Use managed identities for all service-to-service auth.
- Never hardcode connection strings in Bicep templates – use Key Vault references or module outputs wired at deployment time.
- Minimum TLS 1.2 on all storage accounts.
- `allowBlobPublicAccess: false` on all storage accounts.

## Naming

Resources follow the pattern `${prefix}-<resource-type>`:
- `ngu-dev-api` – API Container App
- `ngu-dev-worker` – Worker Container App
- `ngu-dev-pg` – PostgreSQL server
- `ngu-dev-sb` – Service Bus namespace
- `ngu-dev-kv` – Key Vault
- `ngu-dev-env` – Container Apps environment

## PostgreSQL

- Use Flexible Server, version 16.
- Always set `sslmode=require` in connection strings.
- Burstable `Standard_B1ms` is fine for dev; upgrade to `Standard_D2s_v3` for prod.

## Container Apps

- API app: external ingress on port 3000, HTTP/1.1, HTTPS only.
- Worker app: no ingress.
- Scale rules on API: `concurrentRequests: '50'`.
- Pass secrets as Container App secrets (not environment variables directly).

## Service Bus

- Standard tier is sufficient for most workloads.
- `maxDeliveryCount: 5` on queues to limit retries before dead-letter.
- `lockDuration: 'PT2M'` to allow enough processing time.

## Monitoring

- Always wire Application Insights via environment variable `APPLICATIONINSIGHTS_CONNECTION_STRING`.
- Log Analytics workspace retention: 30 days for dev, 90 days for prod.
