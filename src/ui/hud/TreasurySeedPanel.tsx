import { useState } from 'react';
import type { GameState } from '../../core/types';
import { useGameStore } from '../../state/useGameStore';
import { Combo } from './Combo';
import { BUTTON_DISMISS_ON_DARK, BUTTON_OUTLINE_ON_DARK, INPUT_ON_DARK } from './primitives';

interface TreasurySeedPanelProps {
  state: GameState;
  /** El menú vuelve al `+`. */
  onDone: (message: string) => void;
  onCancel(): void;
}

/**
 * DEV-01 (US-12 CA-04): siembra el saldo de un barrio para las pruebas manuales
 * que exigen monedas iniciales (US-02 Prueba 3).
 *
 * El montaje lo decide `import.meta.env.DEV` en `NavActionsMenu`: en producción
 * el componente ni siquiera se importa. La siembra no emite evento de dominio,
 * así que no ensucia el Outbox de la ciudad real.
 */
export function TreasurySeedPanel({ state, onDone, onCancel }: TreasurySeedPanelProps) {
  const setNeighborhoodTreasury = useGameStore((store) => store.setNeighborhoodTreasury);
  const neighborhoodIds = Object.keys(state.neighborhoods);

  const [neighborhoodId, setNeighborhoodId] = useState(neighborhoodIds[0] ?? '');
  const [coins, setCoins] = useState('');

  const parsedCoins = Number.parseInt(coins, 10);
  const isCoinsValid = Number.isInteger(parsedCoins) && parsedCoins >= 0;

  return (
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
      <button type="submit" className={BUTTON_OUTLINE_ON_DARK} disabled={isCoinsValid === false}>
        Sembrar
      </button>
      <button
        type="button"
        className={BUTTON_DISMISS_ON_DARK}
        onClick={onCancel}
        aria-label="Cancelar la siembra de saldo"
      >
        ×
      </button>
    </form>
  );
}
