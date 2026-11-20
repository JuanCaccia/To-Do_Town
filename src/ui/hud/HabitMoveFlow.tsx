import { useState } from 'react';
import type { HabitRelocationRejection } from '../../core/rules/habitRelocation';
import type { EntityId, GameState, HabitBuilding } from '../../core/types';
import { useGameStore } from '../../state/useGameStore';
import { Combo } from './Combo';
import { BUTTON_OUTLINE, BUTTON_PRIMARY, ErrorNote } from './primitives';

const RELOCATION_REJECTION_TEXT = {
  HABIT_NOT_FOUND: 'El hábito ya no existe.',
  HABIT_NOT_ACTIVE: 'Sólo se pueden mudar hábitos activos.',
  NEIGHBORHOOD_NOT_FOUND: 'El barrio destino ya no existe.',
  SAME_NEIGHBORHOOD: 'El hábito ya pertenece a ese barrio.',
  PRODUCTIVE_LOTS_FULL: 'El barrio destino no tiene lotes productivos libres.',
} as const satisfies Record<HabitRelocationRejection, string>;

interface HabitMoveFlowProps {
  state: GameState;
  habitId: EntityId;
  habit: HabitBuilding;
  /** Closes the flow, either after a successful move or on cancel. */
  onDone(): void;
}

/**
 * Two-step relocation: pick a target barrio, then confirm it explicitly.
 *
 * The confirmation stays inline inside the inspector instead of opening a
 * floating dialog: `UI_DESIGN.md` keeps pearl zones to the permanent three, so
 * a fourth pearl surface is not available for a modal window.
 */
export function HabitMoveFlow({ state, habitId, habit, onDone }: HabitMoveFlowProps) {
  const moveHabit = useGameStore((store) => store.moveHabit);

  const [targetId, setTargetId] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const targets = Object.entries(state.neighborhoods).filter(
    ([id]) => id !== habit.neighborhoodId,
  );
  const originName = state.neighborhoods[habit.neighborhoodId]?.name ?? 'el barrio de origen';
  const targetName = state.neighborhoods[targetId]?.name ?? '';

  async function handleConfirm() {
    setPending(true);
    const result = await moveHabit(habitId, targetId);
    setPending(false);

    if (result.status === 'REJECTED') {
      // The store refused: back to the picker so the target can change.
      setMessage(RELOCATION_REJECTION_TEXT[result.reason]);
      setConfirming(false);
      return;
    }

    onDone();
  }

  return (
    <div className="mt-3 rounded-none border border-line p-4">
      <p className="text-base text-ink">Mudar «{habit.title}»</p>

      {confirming ? (
        <>
          <p className="mt-3 text-sm text-ink-muted">
            «{habit.title}» pasa de {originName} a {targetName} y conserva su racha y su nivel.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => void handleConfirm()}
              className={BUTTON_PRIMARY}
            >
              Confirmar Mudanza
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className={BUTTON_OUTLINE}
            >
              Volver
            </button>
          </div>
        </>
      ) : (
        <>
          <label
            htmlFor={`habit-move-target-${habitId}`}
            className="mt-3 block text-label uppercase tracking-widest text-ink-muted"
          >
            Barrio destino
          </label>

          <Combo
            id={`habit-move-target-${habitId}`}
            ariaLabel="Barrio destino"
            value={targetId}
            options={[
              { value: '', label: 'Elegí un barrio' },
              ...targets.map(([id, neighborhood]) => ({ value: id, label: neighborhood.name })),
            ]}
            onChange={setTargetId}
            direction="up"
            tone="light"
            className="mt-2"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={targetId === ''}
              onClick={() => setConfirming(true)}
              className={BUTTON_OUTLINE}
            >
              Continuar
            </button>
            <button type="button" onClick={onDone} className={BUTTON_OUTLINE}>
              Cancelar
            </button>
          </div>

          {targets.length === 0 && (
            <p className="mt-3 text-sm text-ink-muted">No hay otro barrio disponible.</p>
          )}
        </>
      )}

      {message !== null && <ErrorNote className="mt-3">{message}</ErrorNote>}
    </div>
  );
}
