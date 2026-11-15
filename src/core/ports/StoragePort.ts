import type { GameState } from '../types';

export interface StoragePort {
  saveState(state: GameState): Promise<void>;
  loadState(): Promise<GameState | null>;
}
