import { useState } from 'react';
import type { GameState } from '../../core/types';
import { useGameStore } from '../../state/useGameStore';
import { Combo } from './Combo';
import { BUTTON_DISMISS_ON_DARK, BUTTON_OUTLINE_ON_DARK, INPUT_ON_DARK } from './primitives';

interface DevToolsPanelProps {
  state: GameState;
  /** DEV-01 terminó: el menú vuelve al `+`. */
  onDone: (message: string) => void;
  onCancel: () => void;
}

/**
 * DEV-01 (US-12 CA-04): siembra de estado para las pruebas manuales que no se
 * pueden ejecutar a mano.
 *
 * Dos operaciones, dos motivos distintos:
 * - **Saldo** (US-02 Prueba 3): las monedas iniciales del escenario.
 * - **Nivel de hábito** (US-06 Prueba 3): la regla de retiro exige
 *   `checkpointLevel === 5`, y eso son 100 jornadas de check-in.
 *
 * El montaje lo decide `import.meta.env.DEV` en `NavActionsMenu`: en producción
 * el componente ni siquiera se importa. Ninguna siembra emite evento de dominio,
 * así que no ensucia el Outbox de la ciudad real.
 */
export function DevToolsPanel({ state, onDone, onCancel }: DevToolsPanelProps) {
  const setNeighborhoodTreasury = useGameStore((store) => store.setNeighborhoodTreasury);
  const setHabitCheckpointLevel = useGameStore((store) => store.setHabitCheckpointLevel);

  const neighborhoodIds = Object.keys(state.neighborhoods);
  const habitIds = Object.keys(state.habits);

  const [neighborhoodId, setNeighborhoodId] = useState(neighborhoodIds[0] ?? '');
  const [coins, setCoins] = useState('');
  const [habitId, setHabitId] = useState(habitIds[0] ?? '');
  const [level, setLevel] = useState('');

  const parsedCoins = Number.parseInt(coins, 10);
  const isCoinsValid = Number.isInteger(parsedCoins) && parsedCoins >= 0;

  // `Number`, no `parseInt`: "2.5" tiene que fallar, no truncarse a 2.
  const parsedLevel = Number(level);
  const isLevelValid =
    habitId !== '' && Number.isInteger(parsedLevel) && parsedLevel >= 1 && parsedLevel <= 5;

  return (
    <div className="flex items-start gap-1.5">
      <div className="flex flex-col gap-1.5">
        <form
          className="flex items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();

            if (isCoinsValid === false) {
              return;
            }

            void setNeighborhoodTreasury(neighborhoodId, parsedCoins).then(() =>
              onDone('Saldo sembrado'),
            );
          }}
        >
          <Combo
            ariaLabel="Barrio para sembrar el saldo"
            value={neighborhoodId}
            options={neighborhoodIds.map((id) => ({
              value: id,
              label: state.neighborhoods[id]?.name ?? id,
            }))}
            onChange={setNeighborhoodId}
            tone="dark"
            className="max-w-[9rem]"
          />
          <input
            className={`${INPUT_ON_DARK} w-24`}
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            autoFocus
            placeholder="CR"
            aria-label="Saldo a sembrar"
            value={coins}
            onChange={(event) => setCoins(event.target.value)}
          />
          <button
            type="submit"
            className={BUTTON_OUTLINE_ON_DARK}
            disabled={isCoinsValid === false}
          >
            Sembrar
          </button>
        </form>

        <form
          className="flex items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();

            if (isLevelValid === false) {
              return;
            }

            void setHabitCheckpointLevel(habitId, parsedLevel).then(() =>
              onDone('Nivel sembrado'),
            );
          }}
        >
          <Combo
            ariaLabel="Hábito para sembrar el nivel"
            value={habitId}
            options={habitIds.map((id) => ({
              value: id,
              label: state.habits[id]?.title ?? id,
            }))}
            onChange={setHabitId}
            tone="dark"
            className="max-w-[9rem]"
          />
          <input
            className={`${INPUT_ON_DARK} w-24`}
            type="number"
            min={1}
            max={5}
            step={1}
            inputMode="numeric"
            placeholder="Nivel"
            aria-label="Nivel del hábito a sembrar"
            value={level}
            onChange={(event) => setLevel(event.target.value)}
          />
          <button
            type="submit"
            className={BUTTON_OUTLINE_ON_DARK}
            disabled={isLevelValid === false}
          >
            Nivelar
          </button>
        </form>
      </div>

      <button
        type="button"
        className={BUTTON_DISMISS_ON_DARK}
        onClick={onCancel}
        aria-label="Cerrar las herramientas DEV"
      >
        ×
      </button>
    </div>
  );
}
