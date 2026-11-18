import { describe, expect, it } from 'vitest';
import { createDayZeroState } from '../../../core/entities/dayZero';
import type { DomainEventRecord, GameState } from '../../../core/types';
import { buildBackupFile, parseBackupFile } from '../backupSchema';

const NOW = 1_700_000_000_000;

const EVENT: DomainEventRecord = {
  eventId: 'evt-0001',
  userId: 'local-owner',
  deviceId: 'desktop',
  timestamp: NOW,
  type: 'TASK_COMPLETED',
  payload: { taskId: 'tutorial-complex-task-id' },
  syncedAt: null,
};

describe('US-12 CA-04: validación estricta del respaldo .todotown', () => {
  it('acepta un empaquetado generado desde un estado real', () => {
    const state = createDayZeroState(NOW);
    const file = buildBackupFile(state, [EVENT], NOW);

    const result = parseBackupFile(JSON.parse(JSON.stringify(file)));

    expect(result.ok).toBe(true);

    if (result.ok === false) {
      return;
    }

    expect(result.backup.gameState).toEqual(state);
    expect(result.backup.domainEvents).toEqual([EVENT]);
  });

  it('rechaza un tipo inválido sin devolver un estado a medio construir', () => {
    const state = createDayZeroState(NOW);
    const tampered = {
      ...buildBackupFile(state, [], NOW),
      gameState: {
        ...state,
        globals: { ...state.globals, townHall: { level: 1, qualityOfLifeXP: 'mucho' } },
      },
    };

    const result = parseBackupFile(tampered);

    expect(result.ok).toBe(false);
  });

  it('rechaza una entidad huérfana que apunta a un barrio inexistente', () => {
    const state = createDayZeroState(NOW);
    const orphaned: GameState = {
      ...state,
      habits: {
        ...state.habits,
        'habit-ghost': {
          neighborhoodId: 'barrio-que-no-existe',
          title: 'Fantasma',
          frequency: { type: 'DAILY' },
          currentStreakDays: 0,
          checkpointLevel: 1,
          lastCompletedAt: null,
          createdAt: NOW,
          lastFrequencyChangeAt: null,
          retiredAt: null,
          status: 'ACTIVE',
        },
      },
    };

    const result = parseBackupFile(buildBackupFile(orphaned, [], NOW));

    expect(result.ok).toBe(false);
  });

  it('rechaza un archivo sin los edificios globales', () => {
    const state = createDayZeroState(NOW);
    const { globals: _globals, ...withoutGlobals } = state;

    const result = parseBackupFile({
      ...buildBackupFile(state, [], NOW),
      gameState: withoutGlobals,
    });

    expect(result.ok).toBe(false);
  });

  it('rechaza un archivo con claves desconocidas', () => {
    const state = createDayZeroState(NOW);

    const result = parseBackupFile({
      ...buildBackupFile(state, [], NOW),
      gameState: { ...state, cheatCoins: 999_999 },
    });

    expect(result.ok).toBe(false);
  });
});
