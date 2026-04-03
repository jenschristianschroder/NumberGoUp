# Skill: Azure Deployment

## Overview

NumberGoUp deploys to Azure using Bicep IaC. All resources are scoped to a single resource group.

## Deployment

```bash
# Deploy dev environment
az deployment group create \
  --resource-group rg-numbergoUp-dev \
  --template-file infra/bicep/main.bicep \
  --parameters environmentName=dev postgresAdminPassword=<secret>
```

## Resource naming convention

`ngu-{env}-{type}`, e.g. `ngu-dev-api`, `ngu-dev-pg`.

## Required Azure resources

| Resource                       | Module                        |
| ------------------------------ | ----------------------------- |
| User-assigned managed identity | `modules/identity.bicep`      |
| Key Vault                      | `modules/keyvault.bicep`      |
| Storage Account                | `modules/storage.bicep`       |
| Service Bus namespace + queue  | `modules/servicebus.bicep`    |
| PostgreSQL Flexible Server     | `modules/postgres.bicep`      |
| Container Apps environment     | `modules/container-env.bicep` |
| API Container App              | `modules/api-app.bicep`       |
| Worker Container App           | `modules/worker-app.bicep`    |
| Application Insights           | `modules/monitoring.bicep`    |

## Container images

Images are published to GitHub Container Registry:

- `ghcr.io/jenschristianschroder/numbergoUp/api:latest`
- `ghcr.io/jenschristianschroder/numbergoUp/worker:latest`

## Secrets management

- Passwords → Key Vault secrets
- Connection strings → Container App secrets (referenced from Key Vault in prod)
- Never store secrets in Bicep template files or CI logs

## CI/CD

GitHub Actions workflow: `.github/workflows/ci.yml`

- Runs on push to `main` and pull requests
- Steps: install → lint → build → test → (on main) deploy
