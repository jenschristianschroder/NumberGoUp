/** Domain errors with stable codes for API consumers. */

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class InsufficientFundsError extends DomainError {
  constructor() {
    super('INSUFFICIENT_FUNDS', 'Not enough currency to complete the purchase.');
  }
}

export class UpgradeAlreadyPurchasedError extends DomainError {
  constructor(upgradeId: string) {
    super('UPGRADE_ALREADY_PURCHASED', `Upgrade ${upgradeId} has already been purchased.`);
  }
}

export class UpgradeNotFoundError extends DomainError {
  constructor(upgradeId: string) {
    super('UPGRADE_NOT_FOUND', `Upgrade ${upgradeId} not found.`);
  }
}

export class GeneratorNotFoundError extends DomainError {
  constructor(generatorId: string) {
    super('GENERATOR_NOT_FOUND', `Generator ${generatorId} not found.`);
  }
}

export class RewardAlreadyClaimedError extends DomainError {
  constructor(rewardId: string) {
    super('REWARD_ALREADY_CLAIMED', `Reward ${rewardId} has already been claimed.`);
  }
}

export class EventNotFoundError extends DomainError {
  constructor(eventId: string) {
    super('EVENT_NOT_FOUND', `Event ${eventId} not found.`);
  }
}

export class EventExpiredError extends DomainError {
  constructor(eventId: string) {
    super('EVENT_EXPIRED', `Event ${eventId} is not currently active.`);
  }
}

export class RewardNotFoundError extends DomainError {
  constructor(rewardId: string) {
    super('REWARD_NOT_FOUND', `Reward ${rewardId} not found in event.`);
  }
}

export class PlayerNotFoundError extends DomainError {
  constructor(playerId: string) {
    super('PLAYER_NOT_FOUND', `Player ${playerId} not found.`);
  }
}

export class DuplicateCommandError extends DomainError {
  constructor(idempotencyKey: string) {
    super('DUPLICATE_COMMAND', `Command with idempotency key ${idempotencyKey} already processed.`);
  }
}

export class ConcurrencyError extends DomainError {
  constructor() {
    super('CONCURRENCY_CONFLICT', 'Player state was modified concurrently. Please retry.');
  }
}

export class PrestigeThresholdNotMetError extends DomainError {
  constructor(required: string) {
    super(
      'PRESTIGE_THRESHOLD_NOT_MET',
      `You need at least ${required} lifetime earnings to prestige.`,
    );
  }
}

export class ThemeNotFoundError extends DomainError {
  constructor(themeId: string) {
    super('THEME_NOT_FOUND', `Theme ${themeId} not found.`);
  }
}

export class PlayerAlreadyExistsError extends DomainError {
  constructor(playerId: string) {
    super('PLAYER_ALREADY_EXISTS', `Player ${playerId} already exists.`);
  }
}

export class ResearchNodeNotFoundError extends DomainError {
  constructor(nodeId: string) {
    super('RESEARCH_NODE_NOT_FOUND', `Research node ${nodeId} not found.`);
  }
}

export class ResearchNodeAlreadyUnlockedError extends DomainError {
  constructor(nodeId: string) {
    super('RESEARCH_NODE_ALREADY_UNLOCKED', `Research node ${nodeId} is already unlocked.`);
  }
}

export class ResearchPrerequisitesNotMetError extends DomainError {
  constructor(nodeId: string) {
    super(
      'RESEARCH_PREREQUISITES_NOT_MET',
      `Prerequisites for research node ${nodeId} are not met.`,
    );
  }
}

export class InsufficientResearchPointsError extends DomainError {
  constructor() {
    super('INSUFFICIENT_RESEARCH_POINTS', 'Not enough research points to unlock this node.');
  }
}
