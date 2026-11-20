import { useState } from 'react';
import { POMODORO_SHORT_BREAK_DIVISOR } from '../../core/constants/economyConstants';
import { useGameStore } from '../../state/useGameStore';
import { BUTTON_OUTLINE, BUTTON_PRIMARY, INPUT } from './primitives';

interface PomodoroPresetFormProps {
  onCreated(presetId: string): void;
  onCancel(): void;
}

function parseWholeNumber(raw: string): number | null {
  const parsed = Number.parseInt(raw, 10);

  return Number.isInteger(parsed) && String(parsed) === raw.trim() ? parsed : null;
}

/**
 * Alta de preset Pomodoro (US-08 CA-03) sobre la cinta negra de la Barra
 * Superior.
 *
 * La validación vive en el borde (DEC-017): `core` sólo rechaza un
 * `workMinutes` que no sea entero positivo, así que acá se exige nombre no
 * vacío, enteros válidos y se envía el descanso largo vacío como `null`. El
 * descanso corto **sugiere** `floor(W / 5)` y sigue a W hasta que el usuario lo
 * edita; una vez tocado, manda su valor (el CA lo declara editable).
 */
export function PomodoroPresetForm({ onCreated, onCancel }: PomodoroPresetFormProps) {
  const createPreset = useGameStore((store) => store.createPreset);
  const [name, setName] = useState('');
  const [work, setWork] = useState('25');
  const [shortBreak, setShortBreak] = useState('');
  const [isShortBreakTouched, setIsShortBreakTouched] = useState(false);
  const [longBreak, setLongBreak] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const workMinutes = parseWholeNumber(work);
  const isWorkValid = workMinutes !== null && workMinutes > 0;
  const suggestedShortBreak = isWorkValid
    ? Math.floor(workMinutes / POMODORO_SHORT_BREAK_DIVISOR)
    : null;
  const effectiveShortBreak = isShortBreakTouched ? shortBreak : String(suggestedShortBreak ?? '');
  const shortBreakMinutes = parseWholeNumber(effectiveShortBreak);
  const longBreakMinutes = longBreak.trim() === '' ? null : parseWholeNumber(longBreak);
  const trimmedName = name.trim();
  const isLongBreakValid = longBreakMinutes !== null && longBreakMinutes >= 0;
  const isShortBreakValid = shortBreakMinutes !== null && shortBreakMinutes >= 0;
  const canSubmit =
    trimmedName !== '' && isWorkValid && isShortBreakValid && isLongBreakValid && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit || workMinutes === null || shortBreakMinutes === null) {
      return;
    }

    setIsSubmitting(true);

    const result = await createPreset({
      name: trimmedName,
      workMinutes,
      shortBreakMinutes,
      longBreakMinutes,
    });

    setIsSubmitting(false);

    if (result.status !== 'CREATED') {
      return;
    }

    const created = result.state.config.pomodoroPresets.at(-1);

    if (created !== undefined) {
      onCreated(created.id);
    }
  }

  return (
    <form
      className="flex flex-wrap items-center gap-1.5"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <input
        className={`${INPUT} w-28`}
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="NOMBRE"
        aria-label="Nombre del preset"
        autoFocus
      />
      <input
        className={`${INPUT} w-16`}
        type="number"
        min={1}
        step={1}
        inputMode="numeric"
        value={work}
        onChange={(event) => setWork(event.target.value)}
        placeholder="W"
        aria-label="Minutos de trabajo"
      />
      <input
        className={`${INPUT} w-16`}
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        value={effectiveShortBreak}
        onChange={(event) => {
          setIsShortBreakTouched(true);
          setShortBreak(event.target.value);
        }}
        placeholder="DESC"
        aria-label="Minutos de descanso corto"
      />
      <input
        className={`${INPUT} w-16`}
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        value={longBreak}
        onChange={(event) => setLongBreak(event.target.value)}
        placeholder="LARGO"
        aria-label="Minutos de descanso largo (opcional)"
      />
      <button type="submit" className={BUTTON_PRIMARY} disabled={canSubmit === false}>
        Crear
      </button>
      <button type="button" className={BUTTON_OUTLINE} onClick={onCancel}>
        Cancelar
      </button>
    </form>
  );
}
