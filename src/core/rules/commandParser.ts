import type { TaskWeight } from '../types';
import type { WaterIntakeAmount } from './waterIntake';

/** US-12 CA-01: gramos aceptados por el alta rápida de tarea. */
const TASK_WEIGHT_BY_GRAMS: Record<string, TaskWeight> = {
  '10': 'SIMPLE',
  '25': 'STANDARD',
  '50': 'COMPLEX',
};

/** US-12 CA-01: los únicos aportes que el comando `agua` puede declarar. */
const COMMAND_WATER_AMOUNTS: readonly WaterIntakeAmount[] = [0.5, 1];

export type CommandRejectionReason =
  | 'EMPTY'
  | 'UNKNOWN_COMMAND'
  | 'INVALID_WATER_AMOUNT'
  | 'INVALID_PAGE_COUNT'
  | 'INVALID_TASK_SYNTAX'
  | 'INVALID_TASK_WEIGHT'
  | 'INVALID_FOCUS_SYNTAX'
  | 'INVALID_FOCUS_MINUTES';

export type ParsedCommand =
  | { kind: 'WATER'; liters: WaterIntakeAmount }
  | { kind: 'READING'; pages: number }
  | { kind: 'TASK'; neighborhoodName: string; title: string; weight: TaskWeight }
  | { kind: 'FOCUS'; neighborhoodName: string; minutes: number }
  | { kind: 'INVALID'; reason: CommandRejectionReason };

const reject = (reason: CommandRejectionReason): ParsedCommand => ({ kind: 'INVALID', reason });

/** Todo conteo de comando es un entero positivo, igual que en `libraryReading`. */
function toPositiveInteger(raw: string | undefined): number | null {
  if (raw === undefined) return null;

  const value = Number(raw);

  return Number.isInteger(value) && value > 0 ? value : null;
}

function parseWater(amount: string | undefined): ParsedCommand {
  const liters = Number(amount);
  const accepted = COMMAND_WATER_AMOUNTS.find((candidate) => candidate === liters);

  return accepted === undefined
    ? reject('INVALID_WATER_AMOUNT')
    : { kind: 'WATER', liters: accepted };
}

function parseReading(pages: string | undefined): ParsedCommand {
  const count = toPositiveInteger(pages);

  return count === null ? reject('INVALID_PAGE_COUNT') : { kind: 'READING', pages: count };
}

/**
 * `t <barrio> <título...> !<gramos>`: el peso es el último token y el título es
 * todo lo que queda en el medio. Barrio y título se conservan tal como los
 * escribió el usuario; sólo se colapsan los espacios sobrantes.
 */
function parseTask(args: string[]): ParsedCommand {
  const [neighborhoodName = '', ...body] = args;
  const grams = body.pop();

  if (grams === undefined || !grams.startsWith('!')) return reject('INVALID_TASK_SYNTAX');

  const title = body.join(' ');

  if (title === '') return reject('INVALID_TASK_SYNTAX');

  const weight = TASK_WEIGHT_BY_GRAMS[grams.slice(1)];

  return weight === undefined
    ? reject('INVALID_TASK_WEIGHT')
    : { kind: 'TASK', neighborhoodName, title, weight };
}

function parseFocus(args: string[]): ParsedCommand {
  const [neighborhoodName = '', rawMinutes] = args;

  if (args.length !== 2) return reject('INVALID_FOCUS_SYNTAX');

  const minutes = toPositiveInteger(rawMinutes);

  return minutes === null
    ? reject('INVALID_FOCUS_MINUTES')
    : { kind: 'FOCUS', neighborhoodName, minutes };
}

/**
 * Interpreta una cadena del Command Palette (US-12 CA-01).
 *
 * Es un parser puro: no toca `GameState`, no recibe `now` y no despacha nada.
 * Su único trabajo es convertir texto en una instrucción tipada o en un motivo
 * de rechazo legible; la ejecución contra el motor es de quien lo invoca.
 */
export function parseCommand(input: string): ParsedCommand {
  const trimmed = input.trim();

  if (trimmed === '') return reject('EMPTY');

  // `trim` + split por `\s+` no puede producir tokens vacíos: no hace falta filtrarlos.
  const [keyword = '', ...args] = trimmed.split(/\s+/);

  switch (keyword.toLowerCase()) {
    case 'agua':
      return parseWater(args[0]);
    case 'leer':
      return parseReading(args[0]);
    case 't':
      return parseTask(args);
    case 'pomo':
      return parseFocus(args);
    default:
      return reject('UNKNOWN_COMMAND');
  }
}
