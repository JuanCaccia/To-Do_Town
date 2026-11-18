import { describe, expect, it } from 'vitest';
import { parseCommand } from '../commandParser';

describe('US-12 CA-01: parser de comandos rápidos', () => {
  it('interpreta agua 0.5 y agua 1 como hidratación', () => {
    expect(parseCommand('agua 0.5')).toEqual({ kind: 'WATER', liters: 0.5 });
    expect(parseCommand('agua 1')).toEqual({ kind: 'WATER', liters: 1 });
  });

  it('rechaza una cantidad de agua fuera del dominio', () => {
    expect(parseCommand('agua 2')).toEqual({ kind: 'INVALID', reason: 'INVALID_WATER_AMOUNT' });
    expect(parseCommand('agua')).toEqual({ kind: 'INVALID', reason: 'INVALID_WATER_AMOUNT' });
  });

  it('interpreta leer <N> como páginas', () => {
    expect(parseCommand('leer 25')).toEqual({ kind: 'READING', pages: 25 });
  });

  it('rechaza un conteo de páginas no positivo', () => {
    expect(parseCommand('leer 0')).toEqual({ kind: 'INVALID', reason: 'INVALID_PAGE_COUNT' });
    expect(parseCommand('leer veinticinco')).toEqual({
      kind: 'INVALID',
      reason: 'INVALID_PAGE_COUNT',
    });
  });

  it('interpreta el alta de tarea con su peso en gramos', () => {
    expect(parseCommand('t gym comprar suplemento !25')).toEqual({
      kind: 'TASK',
      neighborhoodName: 'gym',
      title: 'comprar suplemento',
      weight: 'STANDARD',
    });
    expect(parseCommand('t gym trotar !10')).toEqual({
      kind: 'TASK',
      neighborhoodName: 'gym',
      title: 'trotar',
      weight: 'SIMPLE',
    });
    expect(parseCommand('t gym rutina completa !50')).toEqual({
      kind: 'TASK',
      neighborhoodName: 'gym',
      title: 'rutina completa',
      weight: 'COMPLEX',
    });
  });

  it('rechaza un alta de tarea sin peso o sin título', () => {
    expect(parseCommand('t gym sin peso')).toEqual({
      kind: 'INVALID',
      reason: 'INVALID_TASK_SYNTAX',
    });
    expect(parseCommand('t gym !25')).toEqual({ kind: 'INVALID', reason: 'INVALID_TASK_SYNTAX' });
  });

  it('rechaza un peso que no está soportado', () => {
    expect(parseCommand('t gym algo !30')).toEqual({
      kind: 'INVALID',
      reason: 'INVALID_TASK_WEIGHT',
    });
  });

  it('interpreta el inicio de foco con minutos', () => {
    expect(parseCommand('pomo estudio 50')).toEqual({
      kind: 'FOCUS',
      neighborhoodName: 'estudio',
      minutes: 50,
    });
  });

  it('rechaza un inicio de foco incompleto o sin minutos válidos', () => {
    expect(parseCommand('pomo estudio')).toEqual({
      kind: 'INVALID',
      reason: 'INVALID_FOCUS_SYNTAX',
    });
    expect(parseCommand('pomo estudio 0')).toEqual({
      kind: 'INVALID',
      reason: 'INVALID_FOCUS_MINUTES',
    });
  });

  it('tolera espacios sobrantes y mayúsculas sin alterar el título', () => {
    expect(parseCommand('  T  Gym   Comprar Suplemento  !25  ')).toEqual({
      kind: 'TASK',
      neighborhoodName: 'Gym',
      title: 'Comprar Suplemento',
      weight: 'STANDARD',
    });
  });

  it('distingue una cadena vacía de un comando desconocido', () => {
    expect(parseCommand('   ')).toEqual({ kind: 'INVALID', reason: 'EMPTY' });
    expect(parseCommand('hacer magia')).toEqual({ kind: 'INVALID', reason: 'UNKNOWN_COMMAND' });
  });
});
