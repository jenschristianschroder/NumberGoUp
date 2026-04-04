import { Pool } from 'pg';
import { PostgresPlayerRepository, InMemoryThemeRepository } from '@numbergoUp/infrastructure';
import type {
  PlayerRepository,
  LiveEventRepository,
  ThemeRepository,
} from '@numbergoUp/application';
import type { LiveEvent } from '@numbergoUp/domain';
import { isEventActive } from '@numbergoUp/domain';

function createPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    max: 10,
  });
}

/**
 * In-memory stub live event repository for local dev.
 * Replace with a Blob Storage or database implementation for production.
 */
class StubLiveEventRepository implements LiveEventRepository {
  private events: LiveEvent[] = [];

  async findById(eventId: string): Promise<LiveEvent | null> {
    return this.events.find((e) => e.id === eventId) ?? null;
  }

  async listActive(now: Date): Promise<LiveEvent[]> {
    return this.events.filter((e) => isEventActive(e, now));
  }
}

export function createRepositories(): {
  playerRepo: PlayerRepository;
  eventRepo: LiveEventRepository;
  themeRepo: ThemeRepository;
} {
  const pool = createPool();
  return {
    playerRepo: new PostgresPlayerRepository(pool),
    eventRepo: new StubLiveEventRepository(),
    themeRepo: new InMemoryThemeRepository(),
  };
}
