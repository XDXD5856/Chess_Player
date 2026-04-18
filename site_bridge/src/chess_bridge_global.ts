import type { BoardState } from "./board_state.js";
import { applyUciMove } from "./move_apply.js";

export interface ChessBridgeAPI {
  getBoardState(): BoardState;
  applyMove(uciMove: string): void;
  renderBoard(): void;
}

declare global {
  interface Window {
    chessBridge?: ChessBridgeAPI;
  }
}

/**
 * Helper for local pages that don't yet expose chessBridge.
 * Call this once with your state container and render function.
 */
export function attachChessBridge(params: {
  getState: () => BoardState;
  setState: (next: BoardState) => void;
  render: () => void;
}): ChessBridgeAPI {
  const api: ChessBridgeAPI = {
    getBoardState: () => params.getState(),
    applyMove: (uciMove: string) => {
      const next = applyUciMove(params.getState(), uciMove);
      params.setState(next);
    },
    renderBoard: () => {
      params.render();
    },
  };

  window.chessBridge = api;
  return api;
}
