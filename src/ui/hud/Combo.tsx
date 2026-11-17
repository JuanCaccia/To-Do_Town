import { useEffect, useId, useRef, useState } from 'react';
import {
  COMBO_CARET,
  COMBO_LIST,
  COMBO_LIST_DARK,
  COMBO_LIST_LIGHT,
  COMBO_OPTION,
  COMBO_OPTION_DARK_ACTIVE,
  COMBO_OPTION_DARK_IDLE,
  COMBO_OPTION_LIGHT_ACTIVE,
  COMBO_OPTION_LIGHT_IDLE,
  COMBO_TRIGGER,
  SELECT_ON_DARK,
  SELECT_ON_LIGHT,
} from './primitives';

export interface ComboOption {
  value: string;
  label: string;
}

interface ComboProps {
  /** Etiqueta accesible: el control no muestra label propio, vive en una stat. */
  ariaLabel: string;
  value: string;
  options: ComboOption[];
  onChange(value: string): void;
  /** `up` para controles al pie de un panel; `down` para la cinta superior. */
  direction?: 'up' | 'down';
  tone: 'dark' | 'light';
  className?: string;
}

/**
 * Combo desplegable con la estética Odyssey OS.
 *
 * La lista es un listbox propio, no un `select` nativo: el menú del sistema
 * ignora la geometría (radio, colores, inversión de la opción activa) y además
 * siempre abre hacia abajo, lo que en el formulario de la Pizarra Diaria lo
 * haría salir del panel. `direction` decide el lado.
 */
export function Combo({
  ariaLabel,
  value,
  options,
  onChange,
  direction = 'down',
  tone,
  className = '',
}: ComboProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (isOpen === false) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (wrapperRef.current?.contains(event.target as Node) === true) {
        return;
      }

      setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const listTone = tone === 'dark' ? COMBO_LIST_DARK : COMBO_LIST_LIGHT;
  const position = direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1';

  return (
    <div ref={wrapperRef} className={`relative min-w-0 ${className}`}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        className={`${tone === 'dark' ? SELECT_ON_DARK : SELECT_ON_LIGHT} ${COMBO_TRIGGER}`}
        onClick={() => setIsOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        <span className="truncate">{selected?.label ?? ''}</span>
        <span aria-hidden className={COMBO_CARET}>
          {direction === 'up' ? '▴' : '▾'}
        </span>
      </button>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className={`${COMBO_LIST} ${listTone} ${position}`}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            const optionTone =
              tone === 'dark'
                ? isSelected
                  ? COMBO_OPTION_DARK_ACTIVE
                  : COMBO_OPTION_DARK_IDLE
                : isSelected
                  ? COMBO_OPTION_LIGHT_ACTIVE
                  : COMBO_OPTION_LIGHT_IDLE;

            return (
              <li key={option.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  className={`${COMBO_OPTION} ${optionTone}`}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
