import { useState } from 'react';
import type { FormEvent } from 'react';
import { useGameStore } from '../../state/useGameStore';
import { BUTTON_DISMISS, BUTTON_OUTLINE, INPUT } from './primitives';

interface CityPauseControlProps {
  /** La pausa se registró: el menú vuelve al `+`. */
  onDone: (message: string) => void;
  onCancel: () => void;
}

/**
 * Pausa manual de la ciudad. Vivía inline en `TopBar`; se extrajo para que el
 * menú de acciones pueda montarla como único contenido del rincón derecho.
 */
export function CityPauseControl({ onDone, onCancel }: CityPauseControlProps) {
  const pauseCity = useGameStore((store) => store.pauseCity);
  const [reason, setReason] = useState('');

  const isReasonValid = reason.trim().length > 0;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (isReasonValid === false) {
      return;
    }

    const result = await pauseCity(reason);

    if (result.status === 'PAUSED') {
      onDone('Ciudad pausada');
    }
  }

  return (
    <form className="flex items-center gap-1.5" onSubmit={(event) => void handleSubmit(event)}>
      <input
        className={`${INPUT} w-44`}
        type="text"
        autoFocus
        maxLength={80}
        placeholder="MOTIVO"
        aria-label="Motivo de la pausa"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      <button type="submit" className={BUTTON_OUTLINE} disabled={isReasonValid === false}>
        Confirmar
      </button>
      <button
        type="button"
        className={BUTTON_DISMISS}
        onClick={onCancel}
        aria-label="Cancelar la pausa"
      >
        ×
      </button>
    </form>
  );
}
