import type { PlayerAccount } from '@numbergoUp/domain';
import {
  PlayerAlreadyExistsError,
  ThemeNotFoundError,
  createRunStateFromTheme,
  asPlayerId,
} from '@numbergoUp/domain';
import type { PlayerRepository } from '../ports/PlayerRepository.js';
import type { ThemeRepository } from '../ports/ThemeRepository.js';
import type { Clock } from '../ports/Clock.js';

export interface CreateAccountCommand {
  playerId: string;
  themeId: string;
  idempotencyKey: string;
}

export interface CreateAccountResult {
  playerId: string;
  themeId: string;
  version: number;
}

/**
 * Create a new player account initialised from a game theme.
 *
 * Idempotency: if the player already exists and the idempotency key matches,
 * the existing state is returned silently. If the player exists but the key
 * does not match, a PlayerAlreadyExistsError is thrown.
 */
export async function createAccountHandler(
  command: CreateAccountCommand,
  playerRepo: PlayerRepository,
  themeRepo: ThemeRepository,
  clock: Clock,
): Promise<CreateAccountResult> {
  const now = clock.now();

  // Check if player already exists
  const existing = await playerRepo.findById(command.playerId);
  if (existing) {
    // Idempotency: same key → return current state
    if (existing.processedIdempotencyKeys.includes(command.idempotencyKey)) {
      return {
        playerId: existing.playerId,
        themeId: command.themeId,
        version: existing.version,
      };
    }
    throw new PlayerAlreadyExistsError(command.playerId);
  }

  // Resolve theme
  const theme = themeRepo.findById(command.themeId);
  if (!theme) throw new ThemeNotFoundError(command.themeId);

  // Build initial state
  const run = createRunStateFromTheme(theme, now);

  const account: PlayerAccount = {
    playerId: asPlayerId(command.playerId),
    run,
    meta: {
      playerId: asPlayerId(command.playerId),
      prestigeCount: 0,
      permanentMultiplierScaled: 0n,
      totalLifetimeEarnings: 0n,
    },
    claimedRewards: [],
    processedIdempotencyKeys: [command.idempotencyKey],
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  await playerRepo.save(account);

  return {
    playerId: account.playerId,
    themeId: command.themeId,
    version: account.version,
  };
}
