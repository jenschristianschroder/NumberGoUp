# ADR-0004: Workflows – Azure Durable Functions

## Status

Accepted

## Context

Some game operations are long-running orchestrations:
- Wait until a live event ends, then fan out reward claims to thousands of players.
- Schedule prestige-season resets at a fixed UTC time.
- Retry failed operations with backoff.

These are poor fits for a stateless API or a simple queue consumer.

## Decision

Use **Azure Durable Functions** for stateful orchestrations, retries, and timed workflows.

## Consequences

**Positive:**
- Durable timers survive function restarts – no external scheduler needed.
- Fan-out/fan-in pattern is first-class (`Task.all`).
- Orchestration history is stored automatically.
- Replay-safe by design – orchestrators must not have side effects outside activities.
- HTTP management endpoints (status check, cancel) built in.

**Negative:**
- Durable Functions require the `durable-functions` npm package and specific hosting (Azure Functions, not Container Apps).
- Orchestrators are replay-based – determinism is required (no random values, no direct I/O).
- Learning curve for developers unfamiliar with the durable pattern.
- Limited language support outside JavaScript/TypeScript, C#, Python.

## Scope

Durable Functions are used **only** for:
- Scheduled / timer-based orchestrations
- Long-running fan-out workflows
- Retry orchestrations with complex backoff logic

Regular command handling (buy upgrade, claim earnings) stays in the API and worker, not in Durable Functions.
