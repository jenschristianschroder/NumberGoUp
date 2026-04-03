# Investigate Bug

You are investigating a bug in the NumberGoUp backend.

## Context

Project: NumberGoUp – idle tycoon game backend  
Stack: TypeScript monorepo, Fastify API, PostgreSQL, Azure Service Bus

## Bug report

{{BUG_DESCRIPTION}}

## Investigation checklist

1. **Reproduce the issue:**
   - Can it be reproduced with a unit test?
   - What inputs trigger the bug?

2. **Check economy logic first:**
   - Is currency being computed correctly using `bigint`?
   - Are multipliers scaled correctly (×1000)?
   - Is `computeOfflineEarnings` using server time, not client time?

3. **Check idempotency:**
   - Could this be a duplicate command being processed twice?
   - Is the idempotency key being stored correctly?

4. **Check concurrency:**
   - Is the player version being checked on every write?
   - Could two concurrent requests have updated the same player?

5. **Check the error path:**
   - Is the `DomainError` being thrown with the correct code?
   - Is the error being translated correctly to an HTTP status?

6. **Check persistence:**
   - Are bigint values being serialised as strings in the DB?
   - Are timestamps stored as UTC?

## Output

- Write a failing test that reproduces the bug before fixing it.
- Fix the bug at the correct architectural layer.
- Confirm the test passes after the fix.
- Add a comment explaining what went wrong if non-obvious.
