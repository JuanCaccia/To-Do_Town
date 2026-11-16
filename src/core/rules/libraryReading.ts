import { LIBRARY_LEVEL_THRESHOLDS } from '../constants/economyConstants';
import type { GameState } from '../types';
import { resolveLevel } from './levelThreshold';

export type LibraryReadingRejection = 'INVALID_PAGE_COUNT';

export type LibraryReadingResult =
  | { status: 'READING_REGISTERED'; state: GameState }
  | { status: 'REJECTED'; reason: LibraryReadingRejection };

/**
 * Acredita páginas leídas en la Gran Biblioteca (US-08 CA-02).
 *
 * Rechaza en vez de recortar: un aporte negativo restaría histórico y uno
 * fraccionario no es un conteo. El tope diario de 150 págs es de US-09 CA-01 y
 * se aplica desde afuera (GOVERNANCE DEC-020).
 */
export function registerPageReading(state: GameState, pages: number): LibraryReadingResult {
  if (!Number.isInteger(pages) || pages <= 0) {
    return { status: 'REJECTED', reason: 'INVALID_PAGE_COUNT' };
  }

  const totalPagesRead = state.globals.library.totalPagesRead + pages;

  return {
    status: 'READING_REGISTERED',
    state: {
      ...state,
      globals: {
        ...state.globals,
        library: {
          ...state.globals.library,
          level: resolveLevel(LIBRARY_LEVEL_THRESHOLDS, totalPagesRead),
          totalPagesRead,
        },
      },
    },
  };
}
