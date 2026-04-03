import type { GameTheme } from '@numbergoUp/domain';
import { findThemeById, listThemes } from '@numbergoUp/domain';
import type { ThemeRepository } from '@numbergoUp/application';

/**
 * In-memory theme repository that delegates to the domain theme registry.
 * Suitable for local development and testing.
 */
export class InMemoryThemeRepository implements ThemeRepository {
  findById(themeId: string): GameTheme | undefined {
    return findThemeById(themeId);
  }

  listAll(): GameTheme[] {
    return listThemes();
  }
}
