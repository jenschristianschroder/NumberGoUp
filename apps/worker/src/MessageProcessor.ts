import type { ServiceBusReceivedMessage, ServiceBusReceiver } from '@azure/service-bus';
import type { ServiceBusMessage, MessageType } from '@numbergoUp/contracts';
import type { PlayerRepository, LiveEventRepository } from '@numbergoUp/application';
import {
  buyUpgradeHandler,
  claimOfflineEarningsHandler,
  prestigeResetHandler,
  assignAutomationHandler,
  claimEventRewardHandler,
  SystemClock,
} from '@numbergoUp/application';
import { DomainError } from '@numbergoUp/domain';

/**
 * MessageProcessor – processes a single Service Bus message.
 *
 * Design principles:
 *  - All command handlers are idempotent via idempotencyKey.
 *  - DomainErrors are logged and the message is completed (not retried).
 *  - Unknown errors cause abandon() so the message is retried or dead-lettered.
 */
export class MessageProcessor {
  constructor(
    private readonly playerRepo: PlayerRepository,
    private readonly eventRepo: LiveEventRepository,
  ) {}

  async process(
    raw: ServiceBusReceivedMessage,
    receiver: ServiceBusReceiver,
  ): Promise<void> {
    let message: ServiceBusMessage;
    try {
      message = raw.body as ServiceBusMessage;
    } catch {
      // Malformed message – dead-letter immediately
      await receiver.deadLetterMessage(raw, {
        deadLetterReason: 'PARSE_ERROR',
        deadLetterErrorDescription: 'Message body is not valid JSON',
      });
      return;
    }

    try {
      await this.dispatch(message);
      await receiver.completeMessage(raw);
    } catch (err) {
      if (err instanceof DomainError) {
        // Domain errors are permanent (bad data, insufficient funds, etc.)
        // Dead-letter so they don't loop forever.
        await receiver.deadLetterMessage(raw, {
          deadLetterReason: err.code,
          deadLetterErrorDescription: err.message,
        });
        console.warn(
          `[worker] Dead-lettered message ${raw.messageId} due to domain error: ${err.code}`,
        );
      } else {
        // Transient error – abandon for retry
        await receiver.abandonMessage(raw);
        console.error(`[worker] Abandoned message ${raw.messageId} for retry:`, err);
      }
    }
  }

  private async dispatch(message: ServiceBusMessage): Promise<void> {
    const type: MessageType = message.type;

    switch (type) {
      case 'buy-upgrade':
        await buyUpgradeHandler(
          {
            playerId: message.playerId,
            upgradeId: (message.payload as { upgradeId: string }).upgradeId,
            idempotencyKey: message.idempotencyKey,
          },
          this.playerRepo,
          SystemClock,
        );
        break;

      case 'claim-offline-earnings':
        await claimOfflineEarningsHandler(
          { playerId: message.playerId, idempotencyKey: message.idempotencyKey },
          this.playerRepo,
          SystemClock,
        );
        break;

      case 'prestige-reset':
        await prestigeResetHandler(
          { playerId: message.playerId, idempotencyKey: message.idempotencyKey },
          this.playerRepo,
          SystemClock,
        );
        break;

      case 'assign-automation':
        await assignAutomationHandler(
          {
            playerId: message.playerId,
            generatorId: (message.payload as { generatorId: string }).generatorId,
            idempotencyKey: message.idempotencyKey,
          },
          this.playerRepo,
          SystemClock,
        );
        break;

      case 'claim-event-reward':
        await claimEventRewardHandler(
          {
            playerId: message.playerId,
            eventId: (message.payload as { eventId: string }).eventId,
            rewardId: (message.payload as { rewardId: string }).rewardId,
            idempotencyKey: message.idempotencyKey,
          },
          this.playerRepo,
          this.eventRepo,
          SystemClock,
        );
        break;

      default:
        throw new Error(`Unknown message type: ${String(type)}`);
    }
  }
}
