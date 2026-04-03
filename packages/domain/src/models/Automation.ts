import type { AutomationId, GeneratorId } from '../valueObjects/Identifiers.js';

/**
 * Automation – assigns a worker to automatically manage a generator.
 * When active, offline earnings are applied without a manual claim.
 */
export interface Automation {
  id: AutomationId;
  generatorId: GeneratorId;
  active: boolean;
}
