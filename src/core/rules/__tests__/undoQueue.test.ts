import { describe, expect, it } from 'vitest';
import type { UndoSnapshot } from '../../types';
import { createDayZeroState } from '../../entities/dayZero';
import { createUndoSnapshot, UNDO_WINDOW_MS } from '../undoSnapshot';
import { pruneExpiredSnapshots } from '../undoQueue';

const NOW = 1_700_000_000_000;

function snapshotCreatedAt(actionId: string, createdAt: number): UndoSnapshot {
  return createUndoSnapshot(createDayZeroState(createdAt), actionId, 'Acción', createdAt);
}

describe('pruneExpiredSnapshots — US-13 CA-03: GC de instantáneas vencidas', () => {
  it('descarta las instantáneas vencidas y conserva el orden de las vigentes', () => {
    const alive = snapshotCreatedAt('alive', NOW);
    const expired = snapshotCreatedAt('expired', NOW - UNDO_WINDOW_MS - 100_000);

    expect(pruneExpiredSnapshots([expired, alive], NOW)).toEqual([alive]);
  });

  it('conserva la instantánea que expira exactamente en now', () => {
    const edge = snapshotCreatedAt('edge', NOW - UNDO_WINDOW_MS);

    expect(pruneExpiredSnapshots([edge], NOW)).toEqual([edge]);
  });

  it('no muta la cola original', () => {
    const expired = snapshotCreatedAt('expired', NOW - UNDO_WINDOW_MS - 100_000);
    const queue = [expired];

    pruneExpiredSnapshots(queue, NOW);

    expect(queue).toHaveLength(1);
  });
});
