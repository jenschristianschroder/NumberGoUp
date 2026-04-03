# Implement Feature

You are implementing a new feature in the NumberGoUp backend.

## Context

Project: NumberGoUp – idle tycoon game backend  
Stack: TypeScript monorepo, Fastify API, Azure Container Apps, PostgreSQL, Azure Service Bus  
Architecture: Clean architecture (domain → application → infrastructure → apps)

## Feature request

{{FEATURE_DESCRIPTION}}

## Instructions

1. **Identify the layer(s) affected:**
   - New domain concept → `packages/domain/src/models/`
   - New business rule → `packages/application/src/commands/`
   - New API endpoint → `apps/api/src/routes/`
   - New message type → `packages/contracts/src/index.ts` + `apps/worker/src/MessageProcessor.ts`
   - New infrastructure → `packages/infrastructure/src/`

2. **Follow the command handler pattern:**
   - Load player from repo
   - Check idempotency key
   - Validate domain rules
   - Compute new state (immutably)
   - Increment version
   - Save via repo
   - Return typed result

3. **Currency rules:**
   - Use `bigint` at runtime
   - Use integer-scaled multipliers (×1000)
   - Never use floating-point for economy values

4. **Write tests:**
   - Unit tests for any new domain logic
   - Unit tests for new command handlers with mocked repos
   - Use `vitest` and `vi.fn()` for mocks
   - Inject a `Clock` for deterministic time

5. **Update docs:**
   - Add or update the relevant doc in `docs/architecture/`
   - Update `docs/architecture/domain-model.md` if new domain concepts are added

6. **Do not:**
   - Put business logic in API route handlers
   - Use `new Date()` directly – use the `Clock` port
   - Trust client-supplied time or balances
