import { describe, expect, it } from 'vitest';
import type { GameState } from '../../types';
import { createDayZeroState } from '../../entities/dayZero';
import { activateManualPause } from '../manualPause';

const START = 1_700_000_000_000;
const ONE_HOUR = 3_600_000;
const TUTORIAL_NEIGHBORHOOD = 'tutorial-neighborhood-id';

function dayZeroState(): GameState {
  return createDayZeroState(START);
}

describe('activateManualPause — US-10 CA-01: pausa manual con motivo obligatorio', () => {
  it('pausa la ciudad activa y guarda el motivo', () => {
    const result = activateManualPause(dayZeroState(), 'Semana de finales', START + ONE_HOUR);

    if (result.status !== 'PAUSED') throw new Error('esperaba pausa');

    expect(result.state.cityStatus).toBe('MANUAL_PAUSE');
    expect(result.state.manualPauseReason).toBe('Semana de finales');
  });

  it('adelanta lastTickAt y lastUserInteractionAt al instante de pausa', () => {
    const now = START + ONE_HOUR;
    const result = activateManualPause(dayZeroState(), 'Viaje', now);

    if (result.status !== 'PAUSED') throw new Error('esperaba pausa');

    expect(result.state.lastTickAt).toBe(now);
    expect(result.state.lastUserInteractionAt).toBe(now);
  });

  it('liquida la producción pasiva pendiente antes de congelar', () => {
    const result = activateManualPause(
      dayZeroState(),
      'Semana de finales',
      START + 2 * ONE_HOUR,
    );

    if (result.status !== 'PAUSED') throw new Error('esperaba pausa');

    // 2 h a 5 🪙/h con eficiencia plena, sobre las 500 iniciales del tutorial.
    expect(result.state.neighborhoods[TUTORIAL_NEIGHBORHOOD]?.treasuryCoins).toBe(510);
  });

  it('rechaza un motivo vacío', () => {
    const result = activateManualPause(dayZeroState(), '', START + ONE_HOUR);

    expect(result).toEqual({ status: 'REJECTED', reason: 'EMPTY_REASON' });
  });

  it('rechaza un motivo de solo espacios en blanco', () => {
    const result = activateManualPause(dayZeroState(), '   ', START + ONE_HOUR);

    expect(result).toEqual({ status: 'REJECTED', reason: 'EMPTY_REASON' });
  });
});
