# ADR-0003: Async Messaging – Azure Service Bus

## Status

Accepted

## Context

Some player actions (e.g. processing bulk reward grants, background upgrades) should be handled asynchronously to keep API response times low. We need:

- At-least-once delivery
- Dead-letter support for poison messages
- Retry backoff
- Message ordering is not strictly required

## Decision

Use **Azure Service Bus** with the Standard tier.

## Consequences

**Positive:**

- At-least-once delivery with configurable `maxDeliveryCount`.
- Built-in dead-letter queue – poison messages are isolated.
- `peekLock` mode allows re-delivery on worker crash.
- Topics/subscriptions support fan-out patterns (e.g. scheduled events to multiple subscribers).
- Managed identity authentication supported.

**Negative:**

- Standard tier does not support geo-redundancy (use Premium for production HA).
- Message ordering requires sessions (not used in scaffold – add if needed).
- Not zero-cost – minimum charge even at low message volumes.

## Message design

All messages carry:

- `type` – discriminated union for routing.
- `playerId` – identifies the target player.
- `idempotencyKey` – UUID for deduplication.
- `enqueuedAt` – ISO-8601 UTC for observability.

The worker dead-letters any message that causes a `DomainError` (permanent failure), and abandons on transient errors (for retry).
