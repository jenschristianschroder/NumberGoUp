import { ServiceBusClient } from '@azure/service-bus';
import { Pool } from 'pg';
import { PostgresPlayerRepository } from '@numbergoUp/infrastructure';
import type { LiveEventRepository } from '@numbergoUp/application';
import type { LiveEvent } from '@numbergoUp/domain';
import { MessageProcessor } from './MessageProcessor.js';

const SERVICE_BUS_CONN = process.env.SERVICE_BUS_CONNECTION_STRING ?? '';
const QUEUE_NAME = process.env.SERVICE_BUS_QUEUE ?? 'player-commands';
const DATABASE_URL = process.env.DATABASE_URL ?? '';

class StubLiveEventRepository implements LiveEventRepository {
  async findById(_eventId: string): Promise<LiveEvent | null> {
    return null;
  }
  async listActive(_now: Date): Promise<LiveEvent[]> {
    return [];
  }
}

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const playerRepo = new PostgresPlayerRepository(pool);
  const eventRepo = new StubLiveEventRepository();
  const processor = new MessageProcessor(playerRepo, eventRepo);

  const client = new ServiceBusClient(SERVICE_BUS_CONN);
  const receiver = client.createReceiver(QUEUE_NAME, { receiveMode: 'peekLock' });

  console.info(`[worker] Listening on queue: ${QUEUE_NAME}`);

  receiver.subscribe({
    processMessage: async (msg) => {
      await processor.process(msg, receiver);
    },
    processError: async (err) => {
      console.error('[worker] Service Bus error:', err.error);
    },
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.info('[worker] Shutting down...');
    await receiver.close();
    await client.close();
    await pool.end();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[worker] Fatal startup error:', err);
  process.exit(1);
});
