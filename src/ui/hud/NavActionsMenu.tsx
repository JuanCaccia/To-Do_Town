import { useEffect, useRef, useState } from 'react';
import type { GameState } from '../../core/types';
import { useGameStore } from '../../state/useGameStore';
import { BackupControls } from './BackupControls';
import { CityPauseControl } from './CityPauseControl';
import { DevToolsPanel } from './DevToolsPanel';
import {
  BUTTON_OUTLINE_ON_DARK,
  MENU_ITEM_ON_DARK,
  TOAST_ON_DARK,
} from './primitives';

/** US-09 CA-01: los avisos del chrome son efímeros, no líneas fijas. */
const NOTICE_VISIBLE_MS = 4_000;

/**
 * Rincón derecho de la navbar: un solo disparador `+` y un panel de acción.
 *
 * En reposo hay **un** botón. Al abrirlo aparece el menú con las acciones
 * (respaldo, siembra DEV, pausa/reanudar); elegir una deja únicamente esa
 * acción en el rincón, y al terminar —o al cancelar con la `×`— vuelve el `+`.
 * El menú no tiene item "Cerrar": se cierra con `Escape` o con un clic afuera,
 * porque las tres opciones del menú son acciones, no navegación.
 */
type Panel = 'closed' | 'menu' | 'backup' | 'seed' | 'pause';

interface NavActionsMenuProps {
  state: GameState;
}

export function NavActionsMenu({ state }: NavActionsMenuProps) {
  const resumeCity = useGameStore((store) => store.resumeCity);
  const [panel, setPanel] = useState<Panel>('closed');
  const [notice, setNotice] = useState<{ text: string; nonce: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const isActive = state.cityStatus === 'ACTIVE';
  const isMenuVisible = panel === 'closed' || panel === 'menu';

  useEffect(() => {
    if (panel === 'closed') {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setPanel('closed');
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [panel]);

  // El clic afuera sólo cierra el menú. Un panel de acción se abandona con su
  // `×` o con `Escape`, para no perder un formulario a medio llenar.
  useEffect(() => {
    if (panel !== 'menu') {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current?.contains(event.target as Node) === true) {
        return;
      }

      setPanel('closed');
    }

    document.addEventListener('mousedown', handlePointerDown);

    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [panel]);

  useEffect(() => {
    if (notice === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => setNotice(null), NOTICE_VISIBLE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  function handleDone(message: string) {
    setPanel('closed');
    // El `nonce` hace que dos acciones iguales seguidas reinicien el aviso.
    setNotice({ text: message, nonce: Date.now() });
  }

  return (
    <div ref={containerRef} className="relative flex items-center gap-1.5">
      {isMenuVisible && (
        <button
          type="button"
          className={BUTTON_OUTLINE_ON_DARK}
          aria-haspopup="menu"
          aria-expanded={panel === 'menu'}
          aria-label={panel === 'menu' ? 'Cerrar el menú de acciones' : 'Abrir el menú de acciones'}
          onClick={() => setPanel(panel === 'menu' ? 'closed' : 'menu')}
        >
          +
        </button>
      )}

      {panel === 'menu' && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 flex w-56 flex-col border border-neutral-700 bg-black"
        >
          <button
            type="button"
            role="menuitem"
            className={MENU_ITEM_ON_DARK}
            onClick={() => setPanel('backup')}
          >
            Respaldo
          </button>

          {/* US-12 CA-04: las herramientas DEV sólo existen en desarrollo. */}
          {import.meta.env.DEV && (
            <button
              type="button"
              role="menuitem"
              className={MENU_ITEM_ON_DARK}
              onClick={() => setPanel('seed')}
            >
              Sembrar CR
            </button>
          )}

          {isActive ? (
            <button
              type="button"
              role="menuitem"
              className={MENU_ITEM_ON_DARK}
              onClick={() => setPanel('pause')}
            >
              Pausar Ciudad
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              className={MENU_ITEM_ON_DARK}
              onClick={() => void resumeCity().then(() => handleDone('Ciudad reanudada'))}
            >
              Reanudar Ciudad
            </button>
          )}
        </div>
      )}

      {panel === 'backup' && <BackupControls onDone={handleDone} onCancel={() => setPanel('closed')} />}
      {panel === 'pause' && <CityPauseControl onDone={handleDone} onCancel={() => setPanel('closed')} />}
      {panel === 'seed' && import.meta.env.DEV && (
        <DevToolsPanel state={state} onDone={handleDone} onCancel={() => setPanel('closed')} />
      )}

      {notice !== null && (
        <div role="status" className={TOAST_ON_DARK}>
          {notice.text}
        </div>
      )}
    </div>
  );
}
