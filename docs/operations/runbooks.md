# Runbooks

## Runbook: Investigate dead-lettered messages

**When:** The Service Bus `player-commands` dead-letter queue has messages.

**Steps:**

1. Check Azure Portal → Service Bus → `player-commands` → Dead-letter queue.
2. Note the `deadLetterReason` and `deadLetterErrorDescription` properties on each message.
3. Common reasons:
   - `PLAYER_NOT_FOUND` – player was deleted, safe to discard.
   - `UPGRADE_ALREADY_PURCHASED` – duplicate message, safe to discard.
   - `PARSE_ERROR` – malformed message, investigate publisher.
   - `MaxDeliveryCountExceeded` – transient failure that persisted; check worker logs.
4. To reprocess a message: fix the root cause, then move the message back to the main queue using Service Bus Explorer or `az servicebus message` CLI.

---

## Runbook: Player state inconsistency

**When:** A player reports incorrect currency or missing upgrades.

**Steps:**

1. Fetch the player state from the API: `GET /players/:playerId`.
2. Check `version` – high version numbers indicate many writes.
3. Review the player's idempotency keys in the DB: `SELECT * FROM player_idempotency_keys WHERE player_id = '...' ORDER BY created_at DESC LIMIT 20;`
4. Check for concurrent writes (concurrency conflicts in logs).
5. **Do not manually edit the database** unless the issue is confirmed as a data bug. Use a command handler.

---

## Runbook: Database migration

**When:** A new migration needs to be applied.

**Steps:**

1. Add the migration file: `packages/infrastructure/src/postgres/migrations/NNN_description.sql`.
2. Test locally: `psql $DATABASE_URL -f packages/infrastructure/src/postgres/migrations/NNN_description.sql`
3. In production: apply via Azure Cloud Shell or a migration job in CI.
4. Migrations are applied in filename order. Never edit an existing migration file.

---

## Runbook: Scale up API

**When:** API response times degrade under load.

**Steps:**

1. Check Container App metrics in Azure Portal.
2. Increase `maxReplicas` in `infra/bicep/modules/api-app.bicep`.
3. Redeploy with Bicep: `az deployment group create ...`
4. If DB is the bottleneck: add PgBouncer or enable connection pooling on Flexible Server.

---

## Runbook: Deploy new container image

```bash
# Build and push
docker build -t ghcr.io/jenschristianschroder/numbergoUp/api:latest -f apps/api/Dockerfile .
docker push ghcr.io/jenschristianschroder/numbergoUp/api:latest

# Update Container App (triggers a new revision)
az containerapp update \
  --name ngu-prod-api \
  --resource-group rg-numbergoUp-prod \
  --image ghcr.io/jenschristianschroder/numbergoUp/api:latest
```
