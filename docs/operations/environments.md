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

## Deploying

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

## Notes

- All secrets in production come from Key Vault, not environment variables.
- The managed identity must have `Key Vault Secrets User` role assigned.
- PostgreSQL requires `sslmode=require` in production.
