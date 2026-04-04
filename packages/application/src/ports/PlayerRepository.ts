import type { PlayerAccount } from '@numbergoUp/domain';

/**
 * Repository interface for PlayerAccount persistence.
 * All implementations must respect optimistic concurrency via the version field.
 */
export interface PlayerRepository {
  /**
   * Load a player by ID. Returns null if not found.
   */
  findById(playerId: string): Promise<PlayerAccount | null>;

  /**
   * Create a brand-new player account (INSERT).
   * Use this for initial account creation; the account must not already exist.
   */
  create(account: PlayerAccount): Promise<void>;

  /**
   * Persist the account (UPDATE).
   * Throws ConcurrencyError if the stored version != account.version - 1.
   */
  save(account: PlayerAccount): Promise<void>;

  /**
   * Check whether an idempotency key has already been processed.
   */
  hasProcessedKey(playerId: string, idempotencyKey: string): Promise<boolean>;
}
