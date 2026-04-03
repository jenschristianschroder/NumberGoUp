# NumberGoUp

**Serverless-first backend for an idle/incremental tycoon game on Azure.**

## What is this?

NumberGoUp is the backend platform for an idle tycoon game. Players accumulate currency through generators, buy upgrades, participate in live events, and can prestige to earn permanent bonuses.

The backend is designed for:

- **Server-authoritative validation** – the server never trusts client-supplied balances or timestamps.
- **Offline earnings** – computed deterministically when the player reconnects, not simulated continuously.
- **Live ops** – seasonal events, timed boosts, and reward orchestration.
- **Scalability** – stateless API and workers on Azure Container Apps, async messaging via Service Bus.

## Quick start (local)

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Start PostgreSQL
docker-compose up -d postgres

# 3. Copy and configure environment
cp .env.example .env

# 4. Start the API
npm run dev --workspace=apps/api
```

## Running tests

```bash
npm test
```

## Linting and formatting

```bash
npm run lint
npm run format
```

## Project structure

```
apps/
  api/          HTTP API (Fastify)
  worker/       Service Bus message consumer
  orchestrator/ Durable Functions for timers and orchestrations
packages/
  domain/       Core domain models, value objects, economy logic
  application/  Command handlers and port interfaces
  infrastructure/ PostgreSQL repos and infrastructure adapters
  contracts/    Shared DTO types for API clients
infra/
  bicep/        Azure IaC (Bicep modules)
docs/
  architecture/ Architectural decisions and domain model
  operations/   Environments, runbooks
.github/
  copilot-instructions.md  Copilot guidance
  instructions/            Layer-specific instructions
  prompts/                 Reusable agent prompts
  skills/                  Domain-specific knowledge bases
  workflows/               GitHub Actions CI
```

## Key design decisions

| Decision        | Choice               | ADR                                                                         |
| --------------- | -------------------- | --------------------------------------------------------------------------- |
| Runtime         | Azure Container Apps | [ADR-0001](docs/architecture/decisions/0001-runtime-container-apps.md)      |
| State storage   | PostgreSQL           | [ADR-0002](docs/architecture/decisions/0002-state-postgres.md)              |
| Async messaging | Azure Service Bus    | [ADR-0003](docs/architecture/decisions/0003-async-service-bus.md)           |
| Workflows       | Durable Functions    | [ADR-0004](docs/architecture/decisions/0004-workflows-durable-functions.md) |

## Documentation

- [Architecture overview](docs/architecture/overview.md)
- [Domain model](docs/architecture/domain-model.md)
- [Economy rules](docs/architecture/economy-rules.md)
- [API boundaries](docs/architecture/api-boundaries.md)
- [Environments](docs/operations/environments.md)
- [Runbooks](docs/operations/runbooks.md)
