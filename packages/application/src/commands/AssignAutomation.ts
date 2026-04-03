import type { PlayerAccount } from '@numbergoUp/domain';
import {
  PlayerNotFoundError,
  GeneratorNotFoundError,
} from '@numbergoUp/domain';
import type { PlayerRepository } from '../ports/PlayerRepository.js';
import type { Clock } from '../ports/Clock.js';

export interface AssignAutomationCommand {
  playerId: string;
  generatorId: string;
  idempotencyKey: string;
}

export interface AssignAutomationResult {
  playerId: string;
  generatorId: string;
  automationId: string;
  version: number;
}

/**
 * Assign an automation to a generator for the player.
 * If the player already has an active automation on that generator, this is a no-op.
 */
export async function assignAutomationHandler(
  command: AssignAutomationCommand,
  repo: PlayerRepository,
  clock: Clock,
): Promise<AssignAutomationResult> {
  const now = clock.now();
  const account = await repo.findById(command.playerId);
  if (!account) throw new PlayerNotFoundError(command.playerId);

  if (account.processedIdempotencyKeys.includes(command.idempotencyKey)) {
    const existing = account.run.automations.find(
      (a) => a.generatorId === command.generatorId && a.active,
    );
    return {
      playerId: account.playerId,
      generatorId: command.generatorId,
      automationId: existing?.id ?? '',
      version: account.version,
    };
  }

  const generator = account.run.generators.find((g) => g.id === command.generatorId);
  if (!generator) throw new GeneratorNotFoundError(command.generatorId);

  // Check for existing automation on this generator
  const existingAutomation = account.run.automations.find(
    (a) => a.generatorId === command.generatorId,
  );

  let automationId: string;
  let updatedAutomations;

  if (existingAutomation) {
    // Reactivate existing
    automationId = existingAutomation.id;
    updatedAutomations = account.run.automations.map((a) =>
      a.id === existingAutomation.id ? { ...a, active: true } : a,
    );
  } else {
    automationId = `auto-${command.generatorId}-${Date.now()}`;
    updatedAutomations = [
      ...account.run.automations,
      {
        id: automationId as import('@numbergoUp/domain').AutomationId,
        generatorId: command.generatorId as import('@numbergoUp/domain').GeneratorId,
        active: true,
      },
    ];
  }

  const updated: PlayerAccount = {
    ...account,
    run: {
      ...account.run,
      automations: updatedAutomations,
    },
    processedIdempotencyKeys: [
      ...account.processedIdempotencyKeys.slice(-99),
      command.idempotencyKey,
    ],
    version: account.version + 1,
    updatedAt: now,
  };

  await repo.save(updated);

  return {
    playerId: account.playerId,
    generatorId: command.generatorId,
    automationId,
    version: updated.version,
  };
}
