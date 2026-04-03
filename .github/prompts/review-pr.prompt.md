# Review PR

You are reviewing a pull request in the NumberGoUp backend.

## Context

Project: NumberGoUp – idle tycoon game backend

## PR to review

{{PR_DESCRIPTION}}

## Review checklist

### Economy correctness
- [ ] No floating-point used for currency values (must be `bigint`)
- [ ] Multipliers are stored/compared as integers scaled ×1000
- [ ] Offline earnings computed server-side from `lastTickAt`, not client-supplied time

### Architecture
- [ ] No business logic in API route handlers
- [ ] No infrastructure imports in domain or application packages
- [ ] New domain concepts documented in `docs/architecture/domain-model.md`

### Idempotency & safety
- [ ] All write commands accept an `idempotencyKey`
- [ ] Duplicate keys return silently (no error, no duplicate mutation)
- [ ] Optimistic concurrency: version checked on all player state writes

### Testing
- [ ] New business logic has unit tests
- [ ] Tests use mocked repos (no real DB)
- [ ] `Clock` is injected for deterministic time in tests

### Security
- [ ] No secrets hardcoded
- [ ] Client-supplied balances or timestamps are never trusted
- [ ] Input validated with Zod schemas at the API boundary

### Documentation
- [ ] New endpoints documented
- [ ] New domain concepts described
- [ ] ADR added if a significant architectural decision was made

## Output

List any issues found, categorised as: **blocker**, **suggestion**, or **nit**.
