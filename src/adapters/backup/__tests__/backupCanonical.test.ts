import { describe, expect, it } from 'vitest';
import { createDayZeroState } from '../../../core/entities/dayZero';
import type { GameState } from '../../../core/types';
import { buildBackupFile, parseBackupFile } from '../backupSchema';

const NOW = 1_700_000_000_000;
const TUTORIAL_ID = 'tutorial-neighborhood-id';

/**
 * Los dos fantasmas que ya aparecieron en snapshots reales: `creditedCoins`
 * (pre-US-07 CA-03) y `aqueduct.lastOperationalDay` (pre-US-05 CA-02).
 */
function withLegacyFields(state: GameState): GameState {
  const neighborhood = state.neighborhoods[TUTORIAL_ID];

  if (neighborhood === undefined) {
    throw new Error('fixture rota');
  }

  return {
    ...state,
    globals: {
      ...state.globals,
      aqueduct: { ...state.globals.aqueduct, lastOperationalDay: state.lastOperationalDay },
    },
    neighborhoods: {
      ...state.neighborhoods,
      [TUTORIAL_ID]: { ...neighborhood, creditedCoins: 12.5 },
    },
  } as GameState;
}

describe('US-12 CA-04: el export canonicaliza el estado antes de escribir', () => {
  it('exporta un archivo restaurable aunque el estado traiga campos legados', () => {
    const file = buildBackupFile(withLegacyFields(createDayZeroState(NOW)), [], NOW);

    expect(parseBackupFile(JSON.parse(JSON.stringify(file))).ok).toBe(true);
  });

  it('no copia los campos legados al archivo', () => {
    const file = buildBackupFile(withLegacyFields(createDayZeroState(NOW)), [], NOW);

    expect('creditedCoins' in (file.gameState.neighborhoods[TUTORIAL_ID] ?? {})).toBe(false);
    expect('lastOperationalDay' in file.gameState.globals.aqueduct).toBe(false);
  });

  it('conserva intacto el estado cuando ya es canónico', () => {
    const state = createDayZeroState(NOW);

    const file = buildBackupFile(state, [], NOW);

    expect(file.gameState).toEqual(state);
  });
});
