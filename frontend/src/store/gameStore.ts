import { useState, useCallback } from 'react';
import type { IGameState } from '../types';

// Game state management — will be wired to WS game events in the Game module.
export function useGameStore() {
  const [gameState, setGameState] = useState<IGameState | null>(null);

  const resetGame = useCallback(() => setGameState(null), []);

  return { gameState, resetGame };
}
