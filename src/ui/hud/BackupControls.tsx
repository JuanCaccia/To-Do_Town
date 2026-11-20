import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useGameStore } from '../../state/useGameStore';
import { BUTTON_DISMISS, BUTTON_OUTLINE, ErrorNote } from './primitives';

interface BackupControlsProps {
  /** La acción terminó bien: el menú colapsa y avisa. */
  onDone: (message: string) => void;
  onCancel: () => void;
}

/**
 * US-12 CA-04: exportación e importación del respaldo `.todotown`.
 *
 * El CA lo ubica en una "barra inferior" que no existe; el control vive en el
 * navbar, dentro del menú `+`. Sólo se muestran los dos verbos: no hay botón de
 * apertura ni de cierre propio, porque el menú ya decide cuándo montarlo.
 *
 * Un fallo se queda en el panel con su motivo; un éxito colapsa al `+`. La
 * descarga se arma en el borde: el store devuelve el archivo como dato y acá se
 * convierte en `Blob`.
 */
export function BackupControls({ onDone, onCancel }: BackupControlsProps) {
  const exportBackup = useGameStore((store) => store.exportBackup);
  const importBackup = useGameStore((store) => store.importBackup);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    try {
      const file = await exportBackup();
      const blob = new Blob([JSON.stringify(file)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `to-do-town-${new Date(file.exportedAt).toISOString().slice(0, 10)}.todotown`;
      anchor.click();

      URL.revokeObjectURL(url);
      onDone('Respaldo descargado');
    } catch (cause) {
      // Un estado que no se puede proyectar se avisa acá: descargar un archivo
      // que después no restaura sería peor que no descargar nada.
      setError(cause instanceof Error ? cause.message : 'No se pudo exportar la ciudad');
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.target;
    const file = input.files?.[0];

    // Limpiar el input permite volver a elegir el mismo archivo tras un rechazo.
    input.value = '';

    if (file === undefined) {
      return;
    }

    let raw: unknown;

    try {
      raw = JSON.parse(await file.text());
    } catch {
      setError('El archivo no es JSON válido');
      return;
    }

    const result = await importBackup(raw);

    if (result.status === 'REJECTED') {
      setError(result.reason);
      return;
    }

    onDone('Ciudad restaurada');
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" className={BUTTON_OUTLINE} onClick={() => void handleExport()}>
        Exportar
      </button>
      <button
        type="button"
        className={BUTTON_OUTLINE}
        onClick={() => fileInputRef.current?.click()}
      >
        Importar
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".todotown,.json,application/json"
        aria-label="Archivo de respaldo .todotown"
        className="hidden"
        onChange={(event) => void handleFile(event)}
      />
      <button
        type="button"
        className={BUTTON_DISMISS}
        onClick={onCancel}
        aria-label="Cancelar el respaldo"
      >
        ×
      </button>

      {error !== null && (
        <ErrorNote className="max-w-[22rem]">{error}</ErrorNote>
      )}
    </div>
  );
}
