import type { LiveEvent } from '@numbergoUp/domain';

/** Read-only repository for live events loaded from config/blob storage. */
export interface LiveEventRepository {
  findById(eventId: string): Promise<LiveEvent | null>;
  listActive(now: Date): Promise<LiveEvent[]>;
}
