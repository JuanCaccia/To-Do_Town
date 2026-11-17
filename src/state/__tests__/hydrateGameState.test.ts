import { describe, expect, it } from 'vitest';
import { createDayZeroState } from '../../core/entities/dayZero';
import type { StoragePort } from '../../core/ports/StoragePort';
import { settlePassiveProduction } from '../../core/rules/passiveProduction';
import type { GameState, Neighborhood, TimestampMs } from '../../core/types';
import { hydrateGameState } from '../hydrateGameState';

const NOW: TimestampMs = 1_700_000_000_000;

function createInMemoryStorage(initial: GameState | null) {
  let snapshot = initial;
  const saved: GameState[] = [];

  const storage: StoragePort = {
    loadState: async () => snapshot,
    saveState: async (next) => {
      snapshot = next;
      saved.push(next);
    },
  };

  return { storage, saved };
}

describe('hydrateGameState — US-01 CA-03: hidratación en arranque', () => {
  it('devuelve el estado guardado intacto, sin recrearlo ni volver a persistirlo', async () => {
    const stored: GameState = {
      ...createDayZeroState(NOW),
      lastTickAt: NOW - 60_000,
      lastUserInteractionAt: NOW - 60_000,
    };
    const { storage, saved } = createInMemoryStorage(stored);

    const hydrated = await hydrateGameState(storage, NOW);

    expect(hydrated).toEqual(stored);
    expect(saved).toHaveLength(0);
  });

  it('si el almacén está vacío, crea el Día Cero y lo persiste antes de retornarlo', async () => {
    const { storage, saved } = createInMemoryStorage(null);

    const hydrated = await hydrateGameState(storage, NOW);

    expect(hydrated).toEqual(createDayZeroState(NOW));
    expect(saved).toEqual([hydrated]);
    expect(await storage.loadState()).toEqual(hydrated);
  });

  it('normaliza un snapshot anterior a focusSessions sin volver a persistirlo', async () => {
    const legacy = { ...createDayZeroState(NOW) };
    delete (legacy as Partial<GameState>).focusSessions;
    const { storage, saved } = createInMemoryStorage(legacy);

    const hydrated = await hydrateGameState(storage, NOW);

    expect(hydrated.focusSessions).toEqual({});
    expect(saved).toHaveLength(0);
  });

  it('reconstruye id, nombre y descanso largo de presets sembrados antes de US-08 CA-03', async () => {
    const base = createDayZeroState(NOW);
    const legacyPresets = [
      { workMinutes: 25, shortBreakMinutes: 5, cyclesBeforeLongBreak: 4 },
      { workMinutes: 50, shortBreakMinutes: 15, cyclesBeforeLongBreak: 4 },
    ];
    const legacy: GameState = {
      ...base,
      config: {
        ...base.config,
        pomodoroPresets: legacyPresets as unknown as GameState['config']['pomodoroPresets'],
      },
    };
    const { storage, saved } = createInMemoryStorage(legacy);

    const hydrated = await hydrateGameState(storage, NOW);

    expect(hydrated.config.pomodoroPresets).toEqual([
      {
        id: 'pomodoro-25-5',
        name: '25/5',
        workMinutes: 25,
        shortBreakMinutes: 5,
        cyclesBeforeLongBreak: 4,
        longBreakMinutes: null,
      },
      {
        id: 'pomodoro-50-15',
        name: '50/15',
        workMinutes: 50,
        shortBreakMinutes: 15,
        cyclesBeforeLongBreak: 4,
        longBreakMinutes: null,
      },
    ]);
    expect(saved).toHaveLength(0);
  });

  it('normaliza un barrio anterior a pendingCoinsRemainder y no envenena la tesorería', async () => {
    const base = createDayZeroState(NOW);
    const legacyNeighborhood = { ...base.neighborhoods['tutorial-neighborhood-id']! };
    delete (legacyNeighborhood as Partial<Neighborhood>).pendingCoinsRemainder;
    const legacy: GameState = {
      ...base,
      neighborhoods: { 'tutorial-neighborhood-id': legacyNeighborhood },
    };
    const { storage } = createInMemoryStorage(legacy);

    const hydrated = await hydrateGameState(storage, NOW);
    const settled = settlePassiveProduction(hydrated, NOW + 3_600_000);

    expect(hydrated.neighborhoods['tutorial-neighborhood-id']?.pendingCoinsRemainder).toBe(0);
    expect(
      Number.isFinite(settled.neighborhoods['tutorial-neighborhood-id']?.treasuryCoins),
    ).toBe(true);
  });

  it('repara una tesorería que ya quedó en NaN en el almacén', async () => {
    const base = createDayZeroState(NOW);
    const legacy: GameState = {
      ...base,
      neighborhoods: {
        'tutorial-neighborhood-id': {
          ...base.neighborhoods['tutorial-neighborhood-id']!,
          treasuryCoins: Number.NaN,
          pendingCoinsRemainder: Number.NaN,
        },
      },
    };
    const { storage } = createInMemoryStorage(legacy);

    const hydrated = await hydrateGameState(storage, NOW);

    expect(hydrated.neighborhoods['tutorial-neighborhood-id']?.treasuryCoins).toBe(0);
    expect(hydrated.neighborhoods['tutorial-neighborhood-id']?.pendingCoinsRemainder).toBe(0);
  });
});
