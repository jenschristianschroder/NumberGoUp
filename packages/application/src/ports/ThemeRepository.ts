import type { GameTheme } from '@numbergoUp/domain';

/** Read-only repository for game themes. */
export interface ThemeRepository {
  findById(themeId: string): GameTheme | undefined;
  listAll(): GameTheme[];
}
