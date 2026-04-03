---
applyTo: "docs/**,README.md"
---

# Documentation instructions

## Docs structure

```
docs/architecture/    ← Architectural decisions and domain model descriptions
docs/operations/      ← Environment setup, runbooks, deployment guides
```

## Architecture Decision Records (ADRs)

- Use the format: `docs/architecture/decisions/NNNN-short-title.md`
- Include: Status, Context, Decision, Consequences.
- Once merged, status is `Accepted` and should not be changed – add a new ADR to supersede.

## Writing style

- Be concise and direct.
- Use present tense ("The API validates..." not "The API will validate...").
- Include code examples where helpful.
- Document trade-offs and known limitations openly.

## What must be documented

- Every domain concept introduced in `packages/domain`.
- Every new API endpoint (method, path, request/response shape, error codes).
- Every new Service Bus message type.
- All economy formula changes.
- Any change to the prestige or offline-earnings calculation.

## Economy documentation

- All formulas must be expressed in integer/fixed-precision terms.
- Include an example showing input → computation → output.
- Note the scaling factor explicitly (e.g. "multiplier scaled ×1000").

## README

- Keep the root README focused on: what the project is, how to run it locally, how to run tests, and where to find more docs.
