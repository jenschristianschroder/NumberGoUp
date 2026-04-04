import type { GameTheme } from '../models/GameTheme.js';
import { genericTheme } from './generic.js';

/** All registered themes. */
const themes: GameTheme[] = [genericTheme];

/** Look up a theme by its unique identifier. */
export function findThemeById(themeId: string): GameTheme | undefined {
  return themes.find((t) => t.id === themeId);
}

/** Return all available themes. */
export function listThemes(): GameTheme[] {
  return [...themes];
}

export { genericTheme };
