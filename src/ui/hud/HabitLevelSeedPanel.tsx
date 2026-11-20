import { useState } from 'react';
import type { GameState } from '../../core/types';
import { useGameStore } from '../../state/useGameStore';
import { Combo } from './Combo';
import { BUTTON_DISMISS, BUTTON_OUTLINE, INPUT } from './primitives';

interface HabitLevelSeedPanelProps {
  state: GameState;
  /** El menú vuelve al `+`. */
  onDone: (message: string) => void;
  onCancel(): void;
}

/**
 * DEV-01 (extensión): siembra el nivel de un hábito para la US-06 Prueba 3, que
 * exige `checkpointLevel === 5` y son 100 jornadas de check-in.
 *
 * El montaje lo decide `import.meta.env.DEV` en `NavActionsMenu`. Igual que la
 * siembra de saldo, no emite evento de dominio.
 */
export function HabitLevelSeedPanel({ state, onDone, onCancel }: HabitLevelSeedPanelProps) {
  const setHabitCheckpointLevel = useGameStore((store) => store.setHabitCheckpointLevel);
  const habitIds = Object.keys(state.habits);

  const [habitId, setHabitId] = useState(habitIds[0] ?? '');
  const [level, setLevel] = useState('');

  // `Number`, no `parseInt`: "2.5" tiene que fallar, no truncarse a 2.
  const parsedLevel = Number(level);
  const isLevelValid =
    habitId !== '' && Number.isInteger(parsedLevel) && parsedLevel >= 1 && parsedLevel <= 5;

  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();

        if (isLevelValid === false) {
          return;
        }

        void setHabitCheckpointLevel(habitId, parsedLevel).then(() => onDone('Nivel sembrado'));
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
        className={`${INPUT} w-24`}
        type="number"
        min={1}
        max={5}
        step={1}
        inputMode="numeric"
        autoFocus
        placeholder="Nivel"
        aria-label="Nivel del hábito a sembrar"
        value={level}
        onChange={(event) => setLevel(event.target.value)}
      />
      <button type="submit" className={BUTTON_OUTLINE} disabled={isLevelValid === false}>
        Sembrar
      </button>
      <button
        type="button"
        className={BUTTON_DISMISS}
        onClick={onCancel}
        aria-label="Cancelar la siembra de nivel"
      >
        ×
      </button>
    </form>
  );
}
