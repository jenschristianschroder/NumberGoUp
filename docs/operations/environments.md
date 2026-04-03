# Environments

## Overview

NumberGoUp runs in two environments:

| Environment | Purpose                 | Branch                  |
| ----------- | ----------------------- | ----------------------- |
| `dev`       | Development and testing | feature branches / main |
| `prod`      | Production              | main (manual deploy)    |

## Azure resource groups

| Environment | Resource Group       |
| ----------- | -------------------- |
| dev         | `rg-numbergoUp-dev`  |
| prod        | `rg-numbergoUp-prod` |

## Continuous Delivery

Automated deployment is handled by the `cd.yml` GitHub Actions workflow:

```
Push to main → CI (lint/test) → Build & push images → Deploy dev → Smoke test → Deploy prod
```

### Pipeline stages

1. **CI gate**: lint, type-check, unit tests (same as `ci.yml`).
2. **Build images**: Docker build + push to GHCR with SHA and `latest` tags.
3. **Deploy infra (dev)**: Provisions Azure resources via Bicep into `rg-numbergoUp-dev`.
4. **Run migrations (dev)**: Applies SQL migrations against the dev PostgreSQL instance.
5. **Deploy apps (dev)**: Updates Container Apps with the new SHA-tagged image.
6. **Smoke test (dev)**: Verifies the API health endpoint returns 200.
7. **Deploy infra (prod)**: Provisions Azure resources via Bicep into `rg-numbergoUp-prod` (requires environment approval).
8. **Run migrations (prod)**: Applies SQL migrations against the prod PostgreSQL instance.
9. **Deploy apps (prod)**: Updates Container Apps with the same SHA-tagged image.
10. **Smoke test (prod)**: Verifies the API health endpoint returns 200.

### Required GitHub repository secrets

| Secret                    | Description                                     | Environment |
| ------------------------- | ----------------------------------------------- | ----------- |
| `AZURE_CLIENT_ID`         | Azure AD app registration client ID (OIDC)      | Both        |
| `AZURE_TENANT_ID`         | Azure AD tenant ID                              | Both        |
| `AZURE_SUBSCRIPTION_ID`   | Azure subscription ID                           | Both        |
| `POSTGRES_ADMIN_PASSWORD` | PostgreSQL administrator password                | Both        |

### Required GitHub environments

Configure these in **Settings → Environments**:

- **dev**: auto-deploy on push to `main`.
- **prod**: requires reviewer approval before deployment.

### Rollback

Use the `rollback.yml` workflow (Actions → Rollback → Run workflow) to roll back to a specific image tag.

## Deploying manually

```bash
# Deploy dev
az deployment group create \
  --resource-group rg-numbergoUp-dev \
  --template-file infra/bicep/main.bicep \
  --parameters environmentName=dev postgresAdminPassword=<from-keyvault>
```

## Local development

Use Docker Compose:

```bash
# Start PostgreSQL only
docker-compose up -d postgres

# Apply schema
psql $DATABASE_URL -f packages/infrastructure/src/postgres/migrations/001_initial_schema.sql

# Start API
npm run dev --workspace=apps/api
```

## Environment variables

| Variable                        | Description                             | Required    |
| ------------------------------- | --------------------------------------- | ----------- |
| `DATABASE_URL`                  | PostgreSQL connection string            | Yes         |
| `DATABASE_SSL`                  | Set to `true` in Azure                  | No          |
| `SERVICE_BUS_CONNECTION_STRING` | Service Bus connection                  | Worker only |
| `SERVICE_BUS_QUEUE`             | Queue name (default: `player-commands`) | Worker only |
| `PORT`                          | API listen port (default: 3000)         | No          |
| `LOG_LEVEL`                     | Fastify log level (default: info)       | No          |
| `KEY_VAULT_URI`                 | Azure Key Vault URI                     | Production  |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Application Insights connection string | Production |

## Notes

- All secrets in production come from Key Vault, not environment variables.
- The managed identity must have `Key Vault Secrets User` role assigned.
- PostgreSQL requires `sslmode=require` in production.
- Container images are pushed to GHCR (`ghcr.io/jenschristianschroder/numbergoUp/`).
- Images are tagged with `sha-<short-sha>`, `latest`, and semver tags on releases.
