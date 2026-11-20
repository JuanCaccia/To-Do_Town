import { useEffect, useRef, useState } from 'react';
import { getBreakAfterWork, isPomodoroSetComplete } from '../../core/entities/pomodoroCycle';
import { getFocusTier } from '../../core/rules/focusLiquidation';
import type { FocusTier } from '../../core/rules/focusLiquidation';
import type { GameState, PomodoroPreset } from '../../core/types';
import { useGameStore } from '../../state/useGameStore';
import { PomodoroPresetForm } from './PomodoroPresetForm';
import { Combo } from './Combo';
import { BUTTON_OUTLINE, BUTTON_PRIMARY, CHIP_IDLE } from './primitives';

const MILLISECONDS_PER_MINUTE = 60_000;

/** US-08 CA-04: interrumpir por debajo de este umbral no registra nada. */
const MINIMUM_INTERRUPTED_MINUTES = 1;

type BlockKind = 'WORK' | 'SHORT_BREAK' | 'LONG_BREAK';

interface ActiveBlock {
  kind: BlockKind;
  minutes: number;
}

const BLOCK_LABEL: Record<BlockKind, string> = {
  WORK: 'Foco',
  SHORT_BREAK: 'Descanso',
  LONG_BREAK: 'Descanso largo',
};

/**
 * US-09 CA-03: la leyenda deriva el tramo de `F_día` en vez de guardarlo. El
 * umbral vive en `getFocusTier`; acá sólo hay etiquetas.
 */
const FOCUS_TIER_LABEL: Record<FocusTier, string> = {
  OPTIMAL: 'Óptimo',
  FATIGUE: 'Fatiga',
  EXHAUSTION: 'Agotamiento',
};

interface FocusTimerProps {
  state: GameState;
  /** US-12 CA-03: indicador compacto del reloj para el Modo Zen. */
  compact?: boolean;
}

/**
 * Reloj Pomodoro de la Barra Superior (US-08 CA-04).
 *
 * El cronómetro y el bloque en curso son estado efímero de la vista: el dominio
 * solo ve sesiones de **trabajo** terminadas, con `startedAt`/`endedAt` reales.
 * Los descansos no liquidan nada, así que no tocan `GameState`; recargar la
 * página pierde el bloque en curso, que es preferible a inventar minutos que no
 * transcurrieron.
 *
 * Qué descanso sigue lo decide `getBreakAfterWork` en `src/core`, no este
 * componente: el ciclo trabajo/descanso es una regla del preset, no un detalle
 * de render.
 *
 * La advertencia de interrupción es **inline y sobre negro**, no un modal: un
 * panel perla nuevo sería la cuarta superficie y `UI_DESIGN.md` §7 auditoría 8
 * fija exactamente tres.
 */
export function FocusTimer({ state, compact = false }: FocusTimerProps) {
  const recordFocus = useGameStore((store) => store.recordFocus);
  const focusRequest = useGameStore((store) => store.focusRequest);
  const consumeFocusRequest = useGameStore((store) => store.consumeFocusRequest);
  const neighborhoods = Object.keys(state.neighborhoods);
  const presets = state.config.pomodoroPresets;

  const [neighborhoodId, setNeighborhoodId] = useState(neighborhoods[0] ?? '');
  const [presetId, setPresetId] = useState(presets[0]?.id ?? '');
  const [block, setBlock] = useState<ActiveBlock | null>(null);
  const [workBlocksCompleted, setWorkBlocksCompleted] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const isCompletingRef = useRef(false);

  const preset = presets.find((candidate) => candidate.id === presetId);
  const targetMs = (block?.minutes ?? 0) * MILLISECONDS_PER_MINUTE;
  const elapsedMinutes = Math.floor(elapsedMs / MILLISECONDS_PER_MINUTE);
  const elapsedSeconds = Math.floor(elapsedMs / 1_000);
  const clockMinutes = Math.floor(elapsedSeconds / 60);
  const clockSeconds = elapsedSeconds % 60;
  const clock = `${String(clockMinutes).padStart(2, '0')}:${String(clockSeconds).padStart(2, '0')}`;
  const isWorkBlock = block?.kind === 'WORK';
  const canInterrupt = isWorkBlock === false || elapsedMinutes >= MINIMUM_INTERRUPTED_MINUTES;

  useEffect(() => {
    if (startedAt === null) {
      return;
    }

    const intervalId = setInterval(() => setElapsedMs(Date.now() - startedAt), 1_000);

    return () => clearInterval(intervalId);
  }, [startedAt]);

  // US-12 CA-01: el comando `pomo` deja una solicitud de un solo uso. Si ya hay
  // un bloque en curso la solicitud se descarta: un comando abre un set nuevo,
  // nunca destruye minutos que ya transcurrieron.
  useEffect(() => {
    if (focusRequest === null) {
      return;
    }

    const requested = consumeFocusRequest();

    if (requested === null || block !== null) {
      return;
    }

    const requestedPreset = presets.find((candidate) => candidate.id === requested.presetId);

    if (requestedPreset === undefined) {
      return;
    }

    setNeighborhoodId(requested.neighborhoodId);
    setPresetId(requested.presetId);
    setWorkBlocksCompleted(0);
    startBlock({ kind: 'WORK', minutes: requestedPreset.workMinutes });
    // La solicitud se consume una sola vez; `block` y `presets` salen del render que la recibió.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusRequest]);

  useEffect(() => {
    if (startedAt === null || targetMs === 0 || elapsedMs < targetMs) {
      return;
    }

    // El reloj sigue latiendo mientras `recordFocus` persiste: sin esta guarda,
    // el mismo bloque se liquidaría una vez por segundo hasta que cambie el
    // estado, duplicando la sesión y adelantando el ciclo de más.
    if (isCompletingRef.current) {
      return;
    }

    isCompletingRef.current = true;
    void completeBlock().finally(() => {
      isCompletingRef.current = false;
    });
    // `completeBlock` closes over the current block; the guard above keeps this
    // effect from firing outside a running block.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedMs, startedAt, targetMs]);

  async function completeBlock() {
    if (startedAt === null || block === null) {
      return;
    }

    if (block.kind !== 'WORK') {
      startNextWorkBlock();
      return;
    }

    if (preset === undefined) {
      return;
    }

    const nextWorkBlocks = workBlocksCompleted + 1;

    await recordFocus({
      neighborhoodId,
      presetId,
      startedAt,
      endedAt: startedAt + targetMs,
      outcome: 'COMPLETED',
    });

    setWorkBlocksCompleted(nextWorkBlocks);
    startBlock(breakBlockFor(preset, nextWorkBlocks));
  }

  function breakBlockFor(current: PomodoroPreset, completedWorkBlocks: number): ActiveBlock {
    const nextBreak = getBreakAfterWork(current, completedWorkBlocks);

    return { kind: nextBreak.kind, minutes: nextBreak.minutes };
  }

  /**
   * El ciclo encadena solo mientras el set siga abierto: trabajo → descanso →
   * trabajo. Saltear el descanso no termina el Pomodoro, sólo adelanta el
   * siguiente bloque; al cerrar los `cyclesBeforeLongBreak` bloques el set
   * termina y hay que iniciar uno nuevo.
   */
  function startNextWorkBlock() {
    if (preset === undefined || isPomodoroSetComplete(preset, workBlocksCompleted)) {
      endCycle();
      return;
    }

    startBlock({ kind: 'WORK', minutes: preset.workMinutes });
  }

  function startBlock(next: ActiveBlock) {
    setBlock(next);
    setStartedAt(Date.now());
    setElapsedMs(0);
    setIsConfirming(false);
  }

  function endCycle() {
    setBlock(null);
    setStartedAt(null);
    setElapsedMs(0);
  }

  async function interrupt() {
    if (startedAt === null || block === null) {
      return;
    }

    setIsConfirming(false);

    if (block.kind !== 'WORK') {
      startNextWorkBlock();
      return;
    }

    await recordFocus({ neighborhoodId, presetId, startedAt, endedAt: Date.now(), outcome: 'INTERRUPTED' });
    endCycle();
  }

  function start() {
    if (preset === undefined) {
      return;
    }

    // Iniciar abre un set nuevo: el contador de bloques anteriores pertenecía al
    // set que ya cerró (o al que se interrumpió).
    setWorkBlocksCompleted(0);
    startBlock({ kind: 'WORK', minutes: preset.workMinutes });
  }

  if (block === null) {
    // En Zen no hay sesión que mostrar: la franja queda vacía a la izquierda.
    if (compact) {
      return null;
    }

    if (isComposing) {
      return (
        <PomodoroPresetForm
          onCreated={(createdPresetId) => {
            setPresetId(createdPresetId);
            setWorkBlocksCompleted(0);
            setIsComposing(false);
          }}
          onCancel={() => setIsComposing(false)}
        />
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <Combo
          ariaLabel="Barrio destino del foco"
          value={neighborhoodId}
          options={neighborhoods.map((id) => ({
            value: id,
            label: state.neighborhoods[id]?.name ?? id,
          }))}
          onChange={setNeighborhoodId}
          tone="dark"
          className="max-w-[9rem]"
        />
        <Combo
          ariaLabel="Preset Pomodoro"
          value={presetId}
          options={presets.map((candidate) => ({ value: candidate.id, label: candidate.name }))}
          onChange={(nextPresetId) => {
            setPresetId(nextPresetId);
            setWorkBlocksCompleted(0);
          }}
          tone="dark"
          className="max-w-[9rem]"
        />
        <button
          type="button"
          className={BUTTON_OUTLINE}
          onClick={start}
          disabled={preset === undefined || neighborhoodId === ''}
        >
          Iniciar
        </button>
        <button
          type="button"
          className={CHIP_IDLE}
          onClick={() => setIsComposing(true)}
          aria-label="Crear preset Pomodoro"
        >
          +Preset
        </button>
      </div>
    );
  }

  if (isConfirming) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-label uppercase tracking-widest text-ink-muted">
          ¿Cortar? {elapsedMinutes} min · 80% al liquidar
        </span>
        <button
          type="button"
          className={BUTTON_OUTLINE}
          onClick={() => setIsConfirming(false)}
        >
          Seguir
        </button>
        <button type="button" className={BUTTON_PRIMARY} onClick={() => void interrupt()}>
          Cortar
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-label uppercase tracking-widest text-ink-muted">
        {BLOCK_LABEL[block.kind]}
        {compact === false && preset !== undefined && (
          <span className="ml-1 text-ink-muted">
            {preset.name}
            {isWorkBlock
              ? ` · B${workBlocksCompleted + 1}/${preset.cyclesBeforeLongBreak} · F ${state.dailyFocusMinutes} ${FOCUS_TIER_LABEL[getFocusTier(state.dailyFocusMinutes)]}`
              : ''}
          </span>
        )}
      </span>
      <span className="text-base leading-none text-ink tabular-nums">
        {clock}
        <span className="ml-0.5 text-label uppercase tracking-widest text-ink-muted">
          /{block.minutes}
        </span>
      </span>
      <button
        type="button"
        className={isWorkBlock ? BUTTON_OUTLINE : BUTTON_PRIMARY}
        onClick={() => (isWorkBlock ? setIsConfirming(true) : void interrupt())}
        disabled={isWorkBlock && canInterrupt === false}
      >
        {isWorkBlock ? 'Cancelar' : 'Saltar'}
      </button>
    </div>
  );
}
